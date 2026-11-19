import test from "node:test";
import assert from "node:assert/strict";
import { activeControls, derivedControlStatus, effectiveEngagement, openFindings, requestAssessment, requestProgress, respondAsSupplier, transitionRequest } from "../src/request-workflow.mjs";
import { calculateRisk, deriveControls } from "../src/controls.mjs";
import { runAi } from "../src/ai.mjs";
import { addDocuments, concludeAll, docId } from "./request-fixture.mjs";

const engagement = {
  id: "request-zapier", receipt: "REQ-ZAPIER", supplier: "Zapier", service: "Customer record sync",
  workspaceId: "northstar", client: "Northstar Payments", decisionOwnerId: "customer-owner",
  answers: { 0: "Yes", 1: "Unknown" }, businessImpact: { questions: [{ id: "c1", label: "Customer data exposure", answer: "High" }] },
};
const second = { ...engagement, id: "request-second", receipt: "REQ-SECOND", service: "Marketing records", workspaceId: "ridgeway", decisionOwnerId: "second-owner" };
const users = {
  analyst: { id: "analyst", actorId: "author", role: "analyst", name: "Analyst One", active: true, workspaceIds: ["northstar", "ridgeway"] },
  qa: { id: "qa", actorId: "reviewer", role: "analyst", name: "QA Reviewer", active: true, canQA: true, workspaceIds: ["northstar"] },
  selfqa: { id: "analyst", actorId: "author", role: "analyst", name: "Analyst One", active: true, canQA: true, workspaceIds: ["northstar"] },
  customer: { id: "customer", actorId: "customer-owner", role: "customer", name: "Customer Owner", active: true, workspaceIds: ["northstar"] },
};
const scope = { service: engagement.service, risk: "High", plan: "Enhanced v3", rationale: "Manual CTP classification based on the confirmed production scope and customer answers." };
const condition = { owner: "Service owner", due: "2026-12-01", evidence: "Dated service recovery exercise" };
const context = (identity = "analyst", row = engagement) => ({
  access: users[identity], activeEngagementId: row.id, engagements: [engagement, second],
  workspace: { name: row.client, policy: "CTP Core v1", overlay: "Enhanced v3" },
});
const initial = () => ({ selected: engagement.id, requestAssessments: {}, events: [], conclusion: "Cedar unchanged", qa: "Passed" });
function act(state, action, values = {}, identity = "analyst", row = engagement) {
  const patch = transitionRequest(state, context(identity, row), row.id, action, values);
  return { ...state, ...patch, events: [...state.events, ...patch.events] };
}
const record = state => requestAssessment(state, engagement);
const reviewed = () => concludeAll(act, addDocuments(act, act(initial(), "scope", scope)), engagement);
function recommended() { return act(reviewed(), "recommend", { outcome: "Approve with conditions", rationale: "Proceed only with an accountable recovery exercise condition." }); }
function ready() { return act(recommended(), "qa", { outcome: "Passed", rationale: "Independently checked the cited pages and findings." }, "qa"); }
const accept = "Accept the open recovery and deletion findings until their due dates.";

test("R1/R2: risk is calculated with drivers and applies controls with reasons; unknowns stay provisional", () => {
  const risk = calculateRisk(engagement);
  assert.equal(risk.tier, "High");
  assert.equal(risk.provisional, true);
  assert.ok(risk.drivers.some(d => /payment data: Yes/.test(d.input)));
  const controls = deriveControls(engagement, risk.tier).map(row => row.controlId);
  assert.deepEqual(controls.sort(), ["CTL-ACC", "CTL-BCP", "CTL-DATA", "CTL-IR", "CTL-SEC", "CTL-SUB", "CTL-VUL"]);
  const lowContext = { ...engagement, answers: { 0: "No", 1: "No", 2: "No", 3: "Yes" }, businessImpact: { questions: [{ id: "c1", label: "x", answer: "Low" }] } };
  assert.equal(calculateRisk(lowContext).tier, "Low");
  assert.deepEqual(deriveControls(lowContext, "Low").map(row => row.controlId), ["CTL-SEC", "CTL-IR"], "one context change alters scope");
  assert.throws(() => act(initial(), "scope", { ...scope, risk: "Low" }), /calculate High.*overriding/);
  const overridden = act(initial(), "scope", { ...scope, risk: "Critical", overrideReason: "Payment journey has no fallback." });
  assert.equal(record(overridden).scope.calculated.tier, "High");
  assert.equal(activeControls(record(overridden)).length, 7);
});

test("customer clarifies an Unknown fact and the risk recomputes from the clarified answer", () => {
  let state = act(initial(), "clarify", { question: "Does the service connect to production?" });
  state = act(state, "respond", { answer: "No, it reads a nightly export.", facts: { 1: "No" } }, "customer");
  assert.equal(effectiveEngagement(engagement, record(state)).answers[1], "No");
  state = act(state, "scope", scope);
  assert.equal(record(state).scope.calculated.drivers.some(d => /production/.test(d.input)), false);
});

test("R2: analysts add a library control with a reason and mark an applied control not applicable", () => {
  let state = act(initial(), "scope", scope);
  assert.throws(() => act(state, "removeControl", { controlId: "CTL-SUB", rationale: " " }), /Justify/);
  state = act(state, "removeControl", { controlId: "CTL-SUB", rationale: "No subprocessors are used for this service." });
  assert.equal(activeControls(record(state)).some(row => row.controlId === "CTL-SUB"), false);
  state = act(state, "addControl", { controlId: "CTL-SUB", rationale: "Customer contract requires a subprocessor list." });
  assert.equal(activeControls(record(state)).find(row => row.controlId === "CTL-SUB").source, "manual");
});

test("E1/E2/E3: documents carry metadata and replacement links; citations verify against the page; status is derived", () => {
  let state = addDocuments(act, act(initial(), "scope", scope), ["doc-bcp-2024", "doc-bcp-2026"]);
  const [old, next] = record(state).evidence;
  assert.equal(old.status, "Draft");
  assert.equal(next.replacesId, old.id, "v2 replaces v1");
  state = act(state, "cite", { controlId: "CTL-BCP", documentId: old.id, page: 2, excerpt: "No technical failover test has been performed.", shows: "Only a tabletop" });
  assert.equal(record(state).citations[0].verified, true);
  assert.equal(derivedControlStatus(record(state), "CTL-BCP").status, "Insufficient");
  state = act(state, "cite", { controlId: "CTL-BCP", documentId: next.id, page: 2, excerpt: "Restored in 3 hours.", shows: "Invented" });
  assert.equal(record(state).citations[1].verified, false, "a fabricated excerpt is flagged, not verified");
  assert.equal(derivedControlStatus(record(state), "CTL-BCP").status, "Insufficient");
  state = act(state, "cite", { controlId: "CTL-BCP", documentId: next.id, page: 2, excerpt: "Service was restored in 2 hours, within the 4 hour RTO.", shows: "Failover met RTO" });
  assert.equal(derivedControlStatus(record(state), "CTL-BCP").status, "Supported");
  assert.equal(derivedControlStatus(record(state), "CTL-ACC").status, "Missing");
});

test("E4: supplier claims keep the original beside dated corrections", () => {
  let state = act(initial(), "scope", scope);
  state = act(state, "claim", { controlId: "CTL-BCP", text: "Recovery is tested annually with RTO 1 hour." });
  state = act(state, "claim", { controlId: "CTL-BCP", text: "Recovery was tested in December with RTO 4 hours.", rationale: "Supplier correction" });
  const [original, correction] = record(state).claims;
  assert.equal(original.text, "Recovery is tested annually with RTO 1 hour.");
  assert.equal(correction.supersedesId, original.id);
  assert.equal(correction.version, 2);
});

test("AI1/AI4/N1: simulated runs propose verifiable citations, compare claims, and overriding needs a reason", async () => {
  let state = addDocuments(act, act(initial(), "scope", scope), ["doc-bcp-2026"]);
  const docs = record(state).evidence;
  const notes = await runAi("evidence-notes", { controlId: "CTL-BCP", documents: docs }, { delay: 0 });
  assert.equal(notes.status, "ok");
  assert.equal(notes.live, false);
  assert.ok(notes.output.notes.every(note => note.excerpt.length > 10));
  state = act(state, "aiRun", { run: notes, controlId: "CTL-BCP" });
  const note = notes.output.notes.find(n => /restored in 2 hours/.test(n.excerpt));
  state = act(state, "cite", { controlId: "CTL-BCP", documentId: note.documentId, page: note.page, excerpt: note.excerpt, shows: note.shows, origin: "ai", runId: notes.id, proposal: note });
  state = act(state, "aiDecision", { runId: notes.id, index: 0, decision: "accepted", original: note, final: note });
  assert.throws(() => act(state, "cite", { controlId: "CTL-BCP", documentId: note.documentId, page: 1, excerpt: "Made up passage.", shows: "x", origin: "ai", runId: notes.id }), /does not match/);
  assert.throws(() => act(state, "aiDecision", { runId: notes.id, index: 1, decision: "rejected" }), /why/);
  assert.throws(() => act(state, "conclude", { controlId: "CTL-BCP", conclusion: "Insufficient", rationale: "Not convinced." }), /override reason/);
  state = act(state, "conclude", { controlId: "CTL-BCP", conclusion: "Insufficient", rationale: "Not convinced.", overrideReason: "Exercise excluded the payments database." });
  assert.equal(record(state).controlReviews["CTL-BCP"].aiHint, "Supported");
  const citations = record(state).citations.map(c => ({ excerpt: c.excerpt }));
  const contradicts = await runAi("compare-claim", { claim: "Recovery completes in 1 hour.", citations }, { delay: 0 });
  assert.equal(contradicts.output.verdict, "Contradicts");
  const supports = await runAi("compare-claim", { claim: "Service was restored in 2 hours during the failover test.", citations }, { delay: 0 });
  assert.equal(supports.output.verdict, "Supports", "changing the claim changes the comparison");
  const failed = await runAi("evidence-notes", { controlId: "CTL-BCP", documents: [] }, { delay: 0 });
  assert.equal(failed.status, "failed");
  const drafts = await runAi("draft-findings", { gaps: [{ controlId: "CTL-BCP", conclusion: "Insufficient" }] }, { delay: 0 });
  assert.match(drafts.output.findings[0].action, /recovery test/);
  assert.match(drafts.output.followUps[0].question, /recovery test/);
});

test("F1/F2: every gap control needs a finding with severity rationale and action before recommending", () => {
  const noFindings = concludeAll(act, addDocuments(act, act(initial(), "scope", scope)), engagement, { findings: false });
  assert.equal(requestProgress(record(noFindings)).label, "Finding required for each gap");
  assert.throws(() => act(noFindings, "recommend", { outcome: "Approve", rationale: "Looks fine." }), /Raise a finding for every/);
  assert.throws(() => act(noFindings, "finding", { controlIds: ["CTL-BCP"], issue: "x", severity: "High", owner: "o", due: "2027-01-01", missingRequirement: "y" }), /severity and its rationale, recommended action/);
  const state = reviewed();
  assert.equal(openFindings(record(state)).length, 3);
  assert.doesNotThrow(() => act(state, "recommend", { outcome: "Approve with conditions", rationale: "Proceed with conditions." }));
});

test("Q1/A2: QA needs permission and a reviewer who did not author the analysis", () => {
  const state = recommended();
  assert.equal(requestProgress(record(state)).nextOwner, "Different authorised QA reviewer");
  assert.throws(() => act(state, "qa", { outcome: "Passed", rationale: "Checked" }), /Independent QA permission/);
  assert.throws(() => act(state, "qa", { outcome: "Passed", rationale: "Checked" }, "selfqa"), /own analysis/);
  assert.doesNotThrow(() => act(state, "qa", { outcome: "Passed", rationale: "Checked" }, "qa"));
});

test("Q2/Q3: four QA outcomes; challenges must be answered before resubmitting, then resolved by the pass", () => {
  let state = recommended();
  assert.throws(() => act(state, "qa", { outcome: "Rework requested", rationale: "Weak" }, "qa"), /challenge the analyst must answer/);
  assert.throws(() => act(state, "qa", { outcome: "Passed with condition", rationale: "OK" }, "qa"), /condition attached/);
  state = act(state, "qa", { outcome: "Rework requested", rationale: "Recovery evidence is draft.", challenge: "Why is the draft BCP acceptable?", challengeControlId: "CTL-BCP" }, "qa");
  assert.equal(requestProgress(record(state)).label, "QA challenges awaiting analyst answer");
  assert.throws(() => act(state, "recommend", { outcome: "Approve with conditions", rationale: "Revised." }), /Answer every QA challenge/);
  const challenge = record(state).challenges[0];
  state = act(state, "respondChallenge", { challengeId: challenge.id, rationale: "It is not; a finding and condition now cover the gap." });
  state = act(state, "recommend", { outcome: "Approve with conditions", rationale: "Revised with the recovery condition." });
  state = act(state, "qa", { outcome: "Passed with condition", rationale: "Answer accepted.", condition: "Customer must track the recovery finding." }, "qa");
  assert.ok(record(state).challenges[0].resolved);
  assert.equal(requestProgress(record(state)).action, "decision");
});

test("D3/D4: approving with open findings needs a risk acceptance; the pack freezes citations, findings, AI and rules", () => {
  const state = ready();
  assert.throws(() => act(state, "decision", { outcome: "Approve with conditions", rationale: "Proceed", condition }, "customer"), /risk acceptance/);
  const signed = act(state, "decision", { outcome: "Approve with conditions", rationale: "Proceed", condition, riskAcceptance: accept }, "customer");
  const pack = record(signed).signedPack;
  assert.equal(pack.version, 2);
  assert.equal(pack.decision.riskAcceptance.findingIds.length, 3);
  assert.equal(pack.citations.length, 7);
  assert.equal(pack.findings.length, 3);
  assert.match(pack.rulesVersion, /demo rules/);
  assert.ok(pack.scope.calculated.drivers.length);
  const rejected = act(state, "decision", { outcome: "Reject", rationale: "Too many gaps." }, "customer");
  assert.equal(openFindings(record(rejected)).length, 3, "M2: a decision never resolves findings");
  assert.equal(requestProgress(record(rejected)).nextOwner, "Assigned analyst");
});

test("F3: a finding closes only on a later verified citation for its control; the signed pack is unchanged", () => {
  let state = act(ready(), "decision", { outcome: "Approve with conditions", rationale: "Proceed", condition, riskAcceptance: accept }, "customer");
  const finding = record(state).findings.find(row => row.controlIds.includes("CTL-BCP"));
  const oldCitation = record(state).citations.find(row => row.controlId === "CTL-BCP");
  assert.throws(() => act(state, "closeFinding", { findingId: finding.id, citationId: oldCitation.id, rationale: "x" }), /received after the finding/);
  state = addDocuments(act, state, ["doc-bcp-2026"]);
  state = act(state, "cite", { controlId: "CTL-BCP", documentId: docId(state, engagement, "doc-bcp-2026"), page: 2, excerpt: "Service was restored in 2 hours, within the 4 hour RTO.", shows: "Failover met RTO" });
  const proof = record(state).citations.at(-1);
  assert.throws(() => act(state, "closeFinding", { findingId: finding.id, citationId: proof.id, rationale: " " }), /why the new evidence/);
  state = act(state, "closeFinding", { findingId: finding.id, citationId: proof.id, rationale: "The failover test met RTO and RPO." });
  assert.equal(record(state).findings.find(row => row.id === finding.id).state, "Closed");
  assert.equal(record(state).signedPack.findings.find(row => row.id === finding.id).state, "Open");
  state = act(state, "close", { rationale: "Reviewed recovery exercise satisfies the condition." });
  assert.equal(record(state).conditionClosed, true);
  assert.throws(() => act(state, "recommend", { outcome: "Approve", rationale: "x" }), /frozen/);
});

test("customer return for clarification loops back without signing", () => {
  const state = act(ready(), "decision", { outcome: "Return for clarification", rationale: "Who owns recovery?" }, "customer");
  assert.equal(record(state).decision, null);
  assert.equal(record(state).recommendation, null);
  assert.equal(requestProgress(record(state)).label, "Analyst revision required");
});

test("action boundaries reject inactive, wrong-role and unselected contexts; services stay separate", () => {
  assert.throws(() => transitionRequest(initial(), { ...context(), activeEngagementId: "other" }, engagement.id, "scope", scope), /Choose the submitted/);
  assert.throws(() => act(initial(), "scope", scope, "customer"), /analyst/);
  assert.throws(() => act(initial(), "evidence", { libraryId: "doc-soc2-2026", notes: "x" }), /Confirm the service scope/);
  const state = act(act(initial(), "scope", scope), "scope", { ...scope, service: second.service }, "analyst", second);
  assert.equal(record(state).scope.service, engagement.service);
  assert.equal(requestAssessment(state, second).scope.service, second.service);
});

test("S1/S2 and supplier inbox: consolidated ask linked to gap controls; response adds an unreviewed document and claim", () => {
  let state = act(initial(), "scope", scope);
  state = act(state, "askSupplier", { ask: "Please send: recovery test; deletion test.", due: "2027-01-15", controlIds: ["CTL-BCP", "CTL-DATA", "NOPE"], consolidated: true });
  const ask = record(state).supplierAsks[0];
  assert.deepEqual(ask.controlIds, ["CTL-BCP", "CTL-DATA"]);
  assert.equal(requestProgress(record(state)).nextOwner, "Supplier contact");
  state = act(state, "askSupplier", { ask: "Free-text follow-up not tied to a control.", due: "2027-01-15" });
  assert.deepEqual(record(state).supplierAsks[1].controlIds, []);
  state = { ...state, ...respondAsSupplier(state, engagement.id, ask.id, { libraryId: "doc-bcp-2026", notes: "Our latest exercise.", claim: "RTO of 2 hours was met." }) };
  const doc = record(state).evidence.at(-1);
  assert.equal(doc.review, null);
  assert.equal(doc.libraryId, "doc-bcp-2026");
  assert.equal(record(state).claims[0].source, "supplier");
  state = act(state, "withdrawAsk", { askId: record(state).supplierAsks[1].id, rationale: "Covered by the response." });
  assert.equal(requestProgress(record(state)).label, "Document review required");
});

test("closure ignores a fresh citation from an old or draft document; only newer current evidence closes", () => {
  let state = act(ready(), "decision", { outcome: "Approve with conditions", rationale: "Proceed", condition, riskAcceptance: accept }, "customer");
  const finding = record(state).findings.find(row => row.controlIds.includes("CTL-BCP"));
  state = act(state, "cite", { controlId: "CTL-BCP", documentId: docId(state, engagement, "doc-bcp-2024"), page: 1, excerpt: "The recovery time objective (RTO) is 4 hours and the recovery point objective (RPO) is 1 hour for the contracted service.", shows: "Old draft target" });
  const stale = record(state).citations.at(-1);
  assert.throws(() => act(state, "closeFinding", { findingId: finding.id, citationId: stale.id, rationale: "x" }), /received after the finding/);
  assert.throws(() => act(state, "close", { rationale: "Old draft cited again." }), /received after the signed decision/);
});

test("invalid condition dates and missing rationale cannot produce a signed decision", () => {
  const state = ready();
  for (const due of ["2026-02-30", "12/01/2026", ""]) assert.throws(() => act(state, "decision", { outcome: "Approve with conditions", rationale: "Proceed", condition: { ...condition, due }, riskAcceptance: accept }, "customer"), /valid due date/);
  assert.throws(() => act(state, "decision", { outcome: "Approve", rationale: " ", riskAcceptance: accept }, "customer"), /decision rationale/);
  assert.throws(() => act(state, "decision", { outcome: "Approve", rationale: "OK", riskAcceptance: accept }, "analyst"), /Decision Owner/);
});

test("new evidence invalidates recommendation and QA; duplicate document versions never overwrite history", () => {
  let state = ready();
  assert.throws(() => act(state, "evidence", { libraryId: "doc-soc2-2026", notes: "Again." }), /already recorded/);
  state = addDocuments(act, state, ["doc-bcp-2026"]);
  assert.equal(record(state).recommendation, null);
  assert.equal(record(state).qa, null);
  assert.equal(record(state).evidence.filter(row => row.libraryId === "doc-soc2-2026").length, 1);
  assert.equal(requestProgress(record(state)).label, "Recommendation required");
});

test("the signed pack keeps the submitted receipt and is unchanged by follow-up actions", () => {
  let state = act(ready(), "decision", { outcome: "Approve with conditions", rationale: "Proceed", condition, riskAcceptance: accept }, "customer");
  const frozen = structuredClone(record(state).signedPack);
  assert.deepEqual(frozen.submittedReceipt, engagement);
  state = addDocuments(act, state, ["doc-bcp-2026"]);
  state = act(state, "claim", { controlId: "CTL-BCP", text: "Failover tested December 2026." });
  assert.deepEqual(record(state).signedPack, frozen);
});
