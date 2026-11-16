import test from "node:test";
import assert from "node:assert/strict";
import { requestAssessment, requestProgress, transitionRequest } from "../src/request-workflow.mjs";

const engagement = {
  id: "request-zapier", receipt: "REQ-ZAPIER", supplier: "Zapier", service: "Customer record sync",
  workspaceId: "northstar", client: "Northstar Payments", decisionOwnerId: "customer-owner",
  answers: { 0: "Yes", 1: "Unknown" }, businessImpact: { questions: [{ id: "c1", answer: "High" }] },
};
const second = { ...engagement, id: "request-second", receipt: "REQ-SECOND", service: "Marketing records", workspaceId: "ridgeway", decisionOwnerId: "second-owner" };
const users = {
  analyst: { id: "analyst", actorId: "author", role: "analyst", name: "Analyst One", active: true, workspaceIds: ["northstar", "ridgeway"] },
  qa: { id: "qa", actorId: "reviewer", role: "analyst", name: "QA Reviewer", active: true, canQA: true, workspaceIds: ["northstar"] },
  customer: { id: "customer", actorId: "customer-owner", role: "customer", name: "Customer Owner", active: true, workspaceIds: ["northstar"] },
};
const scope = { service: engagement.service, risk: "High", plan: "Enhanced review", rationale: "Manual CTP classification based on the confirmed production scope and customer answers." };
const evidence = { name: "Service assurance report", source: "Supplier-provided report", version: "2026-v1", notes: "Covers the contracted sync service; no recovery results supplied." };
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
function reviewed() {
  let state = act(initial(), "scope", scope);
  state = act(state, "evidence", evidence);
  const id = requestAssessment(state, engagement).evidence[0].id;
  return act(state, "review", { evidenceId: id, conclusion: "Partially supported", rationale: "Coverage confirmed; recovery testing remains a gap." });
}
function ready() {
  let state = act(reviewed(), "recommend", { outcome: "Approve with conditions", rationale: "Proceed only with an accountable recovery exercise condition." });
  return act(state, "qa", { outcome: "Passed", rationale: "Independently checked the source coverage and proposed condition." }, "qa");
}

test("new request advances independently from triage through a frozen customer decision", () => {
  const original = initial();
  const record = requestAssessment(original, engagement);
  assert.equal(requestProgress(record).action, "triage");
  let state = ready();
  assert.equal(requestProgress(requestAssessment(state, engagement)).action, "decision");
  state = act(state, "decision", { outcome: "Approve with conditions", rationale: "Accept the residual gap with a named obligation.", condition }, "customer");
  const signed = requestAssessment(state, engagement);
  assert.equal(requestProgress(signed).stage, "Active");
  assert.equal(signed.decision.actorId, "customer-owner");
  assert.equal(signed.signedPack.qa.actorId, "reviewer");
  assert.equal(signed.signedPack.evidence.length, 1);
  assert.deepEqual(signed.signedPack.workspace, context().workspace);
  assert.equal(signed.signedPack.policy, "CTP Core v1");
  assert.equal(signed.signedPack.overlay, "Enhanced v3");
  assert.deepEqual(signed.signedPack.submittedReceipt.answers, engagement.answers);
  assert.deepEqual(requestAssessment(state, second), record);
  assert.equal(state.conclusion, "Cedar unchanged");
  assert.equal(state.qa, "Passed");
  assert.deepEqual(original, initial());
  for (const event of signed.events) {
    assert.equal(event.engagementId, engagement.id);
    assert.equal(event.workspaceId, "northstar");
    assert.ok(event.actorId && event.userId && event.assessmentVersion);
  }
});

test("two submitted services retain distinct evidence, review and progression records", () => {
  let state = act(reviewed(), "scope", { ...scope, service: second.service }, "analyst", second);
  state = act(state, "evidence", { ...evidence, name: "Second service report" }, "analyst", second);
  assert.equal(requestProgress(requestAssessment(state, engagement)).stage, "Recommendation");
  assert.equal(requestProgress(requestAssessment(state, second)).stage, "Evidence");
  assert.equal(requestAssessment(state, engagement).evidence[0].name, evidence.name);
  const foreignId = requestAssessment(state, engagement).evidence[0].id;
  assert.throws(() => act(state, "review", { evidenceId: foreignId, conclusion: "Supported", rationale: "Wrong case" }, "analyst", second), /from this assessment/);
});

test("signed submission receipt keeps original intake fields independently of live engagement projections", () => {
  const raw = { ...engagement, risk: "Pending triage", stage: "Intake", plan: "To be confirmed", owner: "Original request owner" };
  const projected = { ...engagement, risk: "High", stage: "Decision", plan: "Enhanced review", owner: "Current review owner" };
  const state = { ...ready(), extraEngagements: [raw] };
  const data = { ...context("customer"), engagements: [projected, second] };
  const patch = transitionRequest(state, data, engagement.id, "decision", { outcome: "Approve", rationale: "Accept the reviewed service." });
  const pack = patch.requestAssessments[engagement.id].signedPack;
  assert.deepEqual(pack.submittedReceipt, raw);
  assert.deepEqual(pack.engagement, projected);
  raw.risk = "Changed after signing";
  projected.plan = "Changed after signing";
  assert.equal(pack.submittedReceipt.risk, "Pending triage");
  assert.equal(pack.engagement.plan, "Enhanced review");
});

test("action boundaries reject inactive, foreign-workspace, wrong-role and unselected contexts", () => {
  const state = initial();
  const call = data => transitionRequest(state, data, engagement.id, "scope", scope);
  assert.throws(() => call({ ...context(), access: { ...users.analyst, active: false } }), /access/);
  assert.throws(() => call({ ...context(), access: { ...users.analyst, workspaceIds: ["ridgeway"] } }), /access/);
  assert.throws(() => call(context("customer")), /assigned analyst/);
  assert.throws(() => call({ ...context(), activeEngagementId: second.id }), /Choose the submitted/);
  assert.throws(() => transitionRequest(state, { ...context(), engagements: [{ ...engagement, receipt: null }] }, engagement.id, "scope", scope), /submitted customer assessment/);
  assert.throws(() => act(ready(), "decision", { outcome: "Approve", rationale: "Attempt" }, "analyst"), /Decision Owner/);
  assert.throws(() => transitionRequest(ready(), { ...context("customer"), access: { ...users.customer, actorId: "other-owner" } }, engagement.id, "decision", { outcome: "Approve", rationale: "Attempt" }), /Decision Owner/);
});

test("clarification preserves intake and waits for the designated customer's response", () => {
  let state = act(initial(), "clarify", { question: "Confirm the production data scope." });
  assert.equal(requestProgress(requestAssessment(state, engagement)).action, "clarification");
  assert.throws(() => act(state, "scope", scope), /Wait for the customer/);
  assert.throws(() => act(state, "respond", { answer: "Production customer records" }), /Decision Owner/);
  state = act(state, "respond", { answer: "Production customer records" }, "customer");
  state = act(state, "scope", scope);
  const record = requestAssessment(state, engagement);
  assert.equal(record.clarification.response.actorId, "customer-owner");
  assert.equal(record.events[0].clarification.answer, null);
  assert.equal(engagement.answers[1], "Unknown");
  assert.equal(requestProgress(record).stage, "Evidence");
});

test("evidence and rationale gates prevent invented approval and enforce independent QA", () => {
  assert.throws(() => act(initial(), "scope", { ...scope, risk: "Calculated from impact" }), /CTP inherent-risk tier/);
  assert.throws(() => act(initial(), "scope", { ...scope, service: "Different production use" }), /new request and fresh business-impact answers/);
  assert.throws(() => act(initial(), "evidence", evidence), /Confirm the service scope/);
  const scoped = act(initial(), "scope", scope);
  assert.throws(() => act(scoped, "recommend", { outcome: "Approve", rationale: "None inspected" }), /review every evidence/);
  const pending = act(scoped, "evidence", evidence);
  assert.throws(() => act(pending, "recommend", { outcome: "Approve", rationale: "Not reviewed" }), /review every evidence/);
  let state = act(reviewed(), "recommend", { outcome: "Approve", rationale: "Independently weighed the documented gap." });
  assert.throws(() => act(state, "qa", { outcome: "Passed", rationale: " " }, "qa"), /what you checked/);
  // Same analyst may QA their own recommendation (independent QA paused by client decision).
  assert.equal(requestProgress(requestAssessment(act(state, "qa", { outcome: "Passed", rationale: "Self review" }), engagement)).stage, "Decision");
});

test("new evidence invalidates previous QA and duplicate evidence never overwrites history", () => {
  const before = ready();
  const snapshot = structuredClone(before);
  assert.throws(() => act(before, "evidence", { ...evidence, source: "Changed origin" }), /already recorded/);
  const next = act(before, "evidence", { ...evidence, version: "2026-v2", notes: "New exercise result" });
  const record = requestAssessment(next, engagement);
  assert.equal(record.evidence.length, 2);
  assert.equal(record.evidence[0].version, "2026-v1");
  assert.equal(record.qa, null);
  assert.equal(record.recommendation, null);
  assert.throws(() => act(next, "decision", { outcome: "Approve", rationale: "Stale QA" }, "customer"), /review every evidence/);
  assert.deepEqual(before, snapshot);
});

test("QA rework requires a revised recommendation and another independent pass", () => {
  const values = { outcome: "Approve with conditions", rationale: "Recovery condition required." };
  let state = act(reviewed(), "recommend", values);
  state = act(state, "qa", { outcome: "Rework requested", rationale: "Explain why the condition is sufficient." }, "qa");
  assert.equal(requestProgress(requestAssessment(state, engagement)).stage, "Recommendation");
  assert.throws(() => act(state, "qa", { outcome: "Passed", rationale: "Unchanged" }, "qa"), /revise the recommendation/);
  assert.throws(() => act(state, "recommend", values), /Revise the recommendation/);
  assert.throws(() => act(state, "decision", { outcome: "Approve", rationale: "Premature" }, "customer"), /QA must pass/);
  state = act(state, "recommend", { ...values, rationale: "A dated, scoped recovery test is required before the agreed deadline." });
  state = act(state, "qa", { outcome: "Passed", rationale: "Challenge resolved by explicit closure evidence." }, "qa");
  assert.equal(requestProgress(requestAssessment(state, engagement)).stage, "Decision");
});

test("an analyst who revises the recommendation can run QA on the revision", () => {
  const state = act(ready(), "recommend", { outcome: "Reject", rationale: "My revised judgement changes the proposed outcome." }, "qa");
  assert.equal(requestProgress(requestAssessment(act(state, "qa", { outcome: "Passed", rationale: "Reviewing my revision" }, "qa"), engagement)).stage, "Decision");
});

test("customer return for clarification loops back without signing an approval", () => {
  const prepared = ready();
  const returnedRecommendation = requestAssessment(prepared, engagement).recommendation;
  let state = act(prepared, "decision", { outcome: "Return for clarification", rationale: "Who owns the failed recovery test?" }, "customer");
  const record = requestAssessment(state, engagement);
  assert.equal(record.decision, null);
  assert.equal(record.signedPack, null);
  assert.equal(record.qa, null);
  assert.equal(record.clarification, null);
  assert.equal(record.customerReturn.actorId, "customer-owner");
  assert.equal(record.customerReturn.rationale, "Who owns the failed recovery test?");
  assert.deepEqual(record.customerReturn.recommendation, returnedRecommendation);
  assert.equal(requestProgress(requestAssessment(state, engagement)).action, "recommendation");
  assert.equal(requestProgress(record).nextOwner, "Assigned analyst");
  assert.throws(() => act(state, "respond", { answer: "Customer must not answer their own return" }, "customer"), /no unanswered clarification/);
  assert.throws(() => act(state, "recommend", returnedRecommendation), /Revise the recommendation/);
  state = act(state, "recommend", { outcome: "Approve with conditions", rationale: "Service operations lead owns the required recovery exercise." });
  assert.equal(requestProgress(requestAssessment(state, engagement)).action, "qa");
  assert.throws(() => act(state, "decision", { outcome: "Approve", rationale: "Premature" }, "customer"), /QA must pass/);
  state = act(state, "qa", { outcome: "Passed", rationale: "Named recovery ownership resolves the customer challenge." }, "qa");
  state = act(state, "decision", { outcome: "Approve", rationale: "Ownership and evidence are now clear." }, "customer");
  assert.equal(requestAssessment(state, engagement).signedPack.customerReturn.rationale, record.customerReturn.rationale);
});

test("condition closure needs supported postdecision proof and never mutates the signed pack", () => {
  let state = act(ready(), "decision", { outcome: "Approve with conditions", rationale: "Accept with recovery proof.", condition }, "customer");
  const frozen = structuredClone(requestAssessment(state, engagement).signedPack);
  assert.throws(() => act(state, "close", { rationale: "No new proof" }), /after the signed decision/);
  assert.throws(() => act(state, "scope", scope), /signed decision/);
  assert.throws(() => act(state, "recommend", { outcome: "Approve", rationale: "Attempt rewrite" }), /signed decision/);
  assert.throws(() => act(state, "qa", { outcome: "Passed", rationale: "Attempt rewrite" }, "qa"), /signed decision/);
  assert.throws(() => act(state, "decision", { outcome: "Reject", rationale: "Attempt rewrite" }, "customer"), /signed decision/);
  state = act(state, "evidence", { ...evidence, name: "Recovery exercise", version: "v1", notes: "Dated contracted-service recovery results." });
  const id = requestAssessment(state, engagement).evidence.at(-1).id;
  assert.throws(() => act(state, "close", { rationale: "Not reviewed yet" }), /supported evidence/);
  state = act(state, "review", { evidenceId: id, conclusion: "Supported", rationale: "The dated test proves the agreed condition." });
  state = act(state, "close", { rationale: "New scoped exercise satisfies the named obligation." });
  assert.equal(requestAssessment(state, engagement).conditionClosed, true);
  assert.deepEqual(requestAssessment(state, engagement).signedPack, frozen);
  assert.throws(() => act(state, "close", { rationale: "Duplicate" }), /already closed/);
});

test("invalid condition dates and missing required rationale cannot produce a signed decision", () => {
  const state = ready();
  assert.throws(() => act(state, "decision", { outcome: "Approve with conditions", rationale: "Accept", condition: { ...condition, due: "2026-02-31" } }, "customer"), /valid due date/);
  assert.throws(() => act(state, "decision", { outcome: "Approve", rationale: " " }, "customer"), /decision rationale/);
  const rejected = act(state, "decision", { outcome: "Reject", rationale: "Risk exceeds appetite." }, "customer");
  assert.equal(requestProgress(requestAssessment(rejected, engagement)).stage, "Rejected");
  assert.throws(() => act(rejected, "evidence", evidence), /no open approval condition/);
});


test("superseded supported evidence cannot close a condition after a newer contradictory version", () => {
  let state = act(ready(), "decision", { outcome: "Approve with conditions", rationale: "Accept with recovery proof.", condition }, "customer");
  state = act(state, "evidence", { ...evidence, name: "Recovery exercise", version: "v1", notes: "Initial test" });
  let id = requestAssessment(state, engagement).evidence.at(-1).id;
  state = act(state, "review", { evidenceId: id, conclusion: "Supported", rationale: "Initial proof appears sufficient." });
  state = act(state, "evidence", { ...evidence, name: "Recovery exercise", version: "v2", notes: "Corrected test result" });
  id = requestAssessment(state, engagement).evidence.at(-1).id;
  state = act(state, "review", { evidenceId: id, conclusion: "Contradictory", rationale: "Corrected evidence shows the test failed." });
  assert.throws(() => act(state, "close", { rationale: "Use the obsolete successful result" }), /supported evidence/);
});

test("supplier evidence requests round-trip from analyst ask and approval condition to reviewable evidence", async () => {
  const { respondAsSupplier } = await import("../src/request-workflow.mjs");
  let state = act(reviewed(), "askSupplier", { ask: "BCP/DR test report", due: "2027-01-15" });
  let record = requestAssessment(state, engagement);
  assert.equal(requestProgress(record).nextOwner, "Supplier contact");
  assert.throws(() => respondAsSupplier(state, engagement.id, record.supplierAsks[0].id, { name: "DR report" }), /version/);
  state = { ...state, ...respondAsSupplier(state, engagement.id, record.supplierAsks[0].id, { name: "DR report", version: "2026-10", notes: "TrackPro failover test" }) };
  record = requestAssessment(state, engagement);
  assert.equal(record.supplierAsks[0].status, "Responded");
  assert.equal(record.evidence.at(-1).supplierAskId, record.supplierAsks[0].id);
  assert.equal(requestProgress(record).label, "Evidence review required");
});

test("an analyst can withdraw an unanswered supplier request so the case does not dead-end", async () => {
  let state = act(reviewed(), "askSupplier", { ask: "Pen test summary", due: "2027-01-15" });
  const ask = requestAssessment(state, engagement).supplierAsks[0];
  assert.equal(requestProgress(requestAssessment(state, engagement)).nextOwner, "Supplier contact");
  assert.throws(() => act(state, "withdrawAsk", { askId: ask.id, rationale: " " }), /why/);
  state = act(state, "withdrawAsk", { askId: ask.id, rationale: "Customer already holds this report." });
  assert.equal(requestProgress(requestAssessment(state, engagement)).nextOwner, "Assigned analyst");
});
