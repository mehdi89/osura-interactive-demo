import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { IMPACT_SCORES, IMPACT_CHOICES, summarizeImpact, firstMissingImpact, snapshotImpact } from "../src/ctp.mjs";

const model = JSON.parse(await readFile(new URL("../public/data/workspace.json", import.meta.url)));
const questions = model.biaQuestions;
const answersAt = value => Object.fromEntries(questions.map(question => [question.id, value]));

test("a reduced or regrouped questionnaire cannot produce a completed guide result", () => {
  const answers = answersAt("Low");
  const reduced = questions.slice(1);
  assert.equal(summarizeImpact(reduced, answers).complete, false);
  assert.equal(summarizeImpact(reduced, answers).score, null);
  assert.throws(() => snapshotImpact(reduced, answers), /17 questions/);
  const regrouped = questions.map((question, index) => index === 0 ? { ...question, dimension: "Integrity" } : question);
  assert.equal(summarizeImpact(regrouped, answers).complete, false);
  assert.throws(() => snapshotImpact(regrouped, answers), /5\/5\/7/);
});

test("the supplied 17 CTP questions retain their verbatim wording and 5/5/7 groups", () => {
  assert.deepEqual(questions.map(question => question.label), [
    "Unauthorised disclosure of Confidential or Intellectual data (Accidental)",
    "Unauthorised disclosure of Confidential or Intellectual data (Deliberate)",
    "Unauthorised disclosure of Confidential or Intellectual data to the public (Deliberate)",
    "Unauthorised disclosure of Confidential or Intellectual data to the public (Accidental)",
    "Legal or Compliance Implications due to disclosure e.g. TISAX",
    "Unauthorised modification by 3rd Parties staff (Accidental)",
    "Unauthorised modification by staff (Deliberate)",
    "Unauthorised modification by member of the public e.g. ransomware or Malware",
    "Corruption of communications (email or calls)",
    "Legal Implications due to modification",
    "Impact on business if service unavailable for 1 Hr",
    "Impact on business if service unavailable for 4 Hrs",
    "Impact on business if service unavailable for 1 Day",
    "Impact on business if service unavailable for 2-3 Days",
    "Impact on business if service unavailable for 1 Week",
    "Impact on business if service unavailable for 1 Month",
    "Impact on business if service is a Complete Loss",
  ]);
  assert.deepEqual(questions.map(question => question.dimension), [
    ...Array(5).fill("Confidentiality"),
    ...Array(5).fill("Integrity"),
    ...Array(7).fill("Availability"),
  ]);
  assert.ok(questions.every(question => question.canonicalCode === null));
  assert.deepEqual(model.biaAnswers, [], "answers to the old fixture questions must not be relabelled as real answers");
});

test("base impact uses category maxima and the supplied High/Medium/Low example", () => {
  assert.deepEqual(IMPACT_SCORES, { "N/A": 0, Low: 1, Medium: 3, High: 5 });
  const answers = Object.fromEntries(questions.map(question => [question.id,
    { Confidentiality: "High", Integrity: "Medium", Availability: "Low" }[question.dimension]]));
  const summary = summarizeImpact(questions, answers);
  assert.equal(summary.complete, true);
  assert.equal(summary.score, 5);
  assert.equal(summary.label, "High / Significant");
  assert.deepEqual(summary.categories.map(category => category.score), [5, 3, 1]);

  const singleHigh = { ...answersAt("Low"), [questions[0].id]: "High" };
  assert.equal(summarizeImpact(questions, singleHigh).score, 5, "a High answer must not be averaged down");
});

test("N/A is a valid zero impact, including all seventeen answers", () => {
  const answers = answersAt("N/A");
  assert.equal(firstMissingImpact(questions, answers), undefined);
  const summary = summarizeImpact(questions, answers);
  assert.equal(summary.complete, true);
  assert.equal(summary.score, 0);
  assert.equal(summary.label, "N/A");
  assert.deepEqual(summary.categories.map(category => category.score), [0, 0, 0]);
});

test("blank, Unknown and invalid answers never become zero or a completed impact", () => {
  assert.ok(IMPACT_CHOICES.includes("Unknown"));
  for (const value of [undefined, "", "Unknown", "invalid", "0", 0]) {
    const answers = { ...answersAt("Low"), [questions[0].id]: value };
    const summary = summarizeImpact(questions, answers);
    assert.equal(summary.complete, false, String(value));
    assert.equal(summary.score, null, String(value));
    assert.equal(summary.label, "Incomplete");
    assert.equal(summary.categories[0].complete, false);
    assert.equal(summary.categories[0].score, null);
  }
  assert.equal(summarizeImpact([], {}).complete, false);
  assert.equal(summarizeImpact([], {}).score, null);
});

test("first-missing validation checks every answer and retains Unknown for analyst triage", () => {
  const answers = answersAt("Medium");
  assert.equal(firstMissingImpact(questions, answers), undefined);
  delete answers[questions.at(-1).id];
  assert.equal(firstMissingImpact(questions, answers)?.id, questions.at(-1).id);
  answers[questions.at(-1).id] = "invalid";
  assert.equal(firstMissingImpact(questions, answers)?.id, questions.at(-1).id);
  answers[questions.at(-1).id] = "Unknown";
  assert.equal(firstMissingImpact(questions, answers), undefined);
  delete answers[questions[0].id];
  assert.equal(firstMissingImpact(questions, answers)?.id, questions[0].id);
});

test("submitted impact snapshots reject missing answers and preserve unresolved wording independently", () => {
  const sourceQuestions = structuredClone(questions);
  const answers = answersAt("Low");
  delete answers[sourceQuestions[0].id];
  assert.throws(() => snapshotImpact(sourceQuestions, answers), /Answer the business-impact question/);
  answers[sourceQuestions[0].id] = "invalid";
  assert.throws(() => snapshotImpact(sourceQuestions, answers), /Answer the business-impact question/);
  answers[sourceQuestions[0].id] = "Unknown";
  const snapshot = snapshotImpact(sourceQuestions, answers);
  assert.equal(snapshot.questions.length, 17);
  assert.equal(snapshot.questions[0].answer, "Unknown");
  assert.equal(snapshot.summary.complete, false);
  assert.equal(snapshot.summary.score, null);
  assert.match(snapshot.source, /CTP_17_Questions_Simple_Guide/);
  sourceQuestions[0].label = "A later edited question";
  sourceQuestions[0].dimension = "Availability";
  answers[questions[0].id] = "High";
  assert.equal(snapshot.questions[0].label, questions[0].label);
  assert.equal(snapshot.questions[0].dimension, "Confidentiality");
  assert.equal(snapshot.questions[0].answer, "Unknown");
});
