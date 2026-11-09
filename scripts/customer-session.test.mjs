import test from "node:test";
import assert from "node:assert/strict";
import { customerView, patchCustomerView } from "../src/customer-session.mjs";

const northstar = { role: "customer", workspaceId: "northstar" };
const ridgeway = { role: "customer", workspaceId: "ridgeway" };
const freshIntake = { supplier: "", domain: "", use: "", product: "", purpose: "", answers: {}, businessImpactAnswers: {}, attachments: [] };
const data = workspaceId => ({ schemaVersion: 2, intake: freshIntake,
  initialState: { selected: workspaceId === "northstar" ? "cedar" : "clearbridge", qa: "", qaNote: "", judgement: "", conclusion: "", decision: null, signedPack: null, supplierReceipts: {}, events: [] },
  engagements: [{ id: workspaceId === "northstar" ? "cedar" : "clearbridge", workspaceId }],
});

test("customer intake drafts, receipts, errors and register filters survive switching independently", () => {
  const northstarDraft = { ...freshIntake, supplier: "Northstar supplier", purpose: "Northstar use", businessImpactAnswers: { "confidentiality-1": "High" } };
  const ridgewayDraft = { ...freshIntake, supplier: "Ridgeway supplier", purpose: "Ridgeway use", businessImpactAnswers: { "confidentiality-1": "N/A" } };
  let state = { schemaVersion: 2, intake: { ...freshIntake, supplier: "Unscoped legacy draft" } };
  assert.deepEqual(customerView(state, data("northstar"), northstar).intake, freshIntake);
  state = { ...state, ...patchCustomerView(state, { intake: northstarDraft, intakeSubmitted: true, intakeReceipt: "NS-01", intakeIssue: null, registerViews: { C14: { search: "Northstar" } } }, northstar) };
  assert.equal(state.intake, northstarDraft);
  assert.deepEqual(customerView(state, data("ridgeway"), ridgeway).intake, freshIntake);
  assert.equal(customerView(state, data("ridgeway"), ridgeway).intakeReceipt, null);
  state = { ...state, ...patchCustomerView(state, { intake: ridgewayDraft, intakeSubmitted: false, intakeReceipt: "RF-01", intakeIssue: { screen: "C04", field: "purpose" }, registerViews: { C14: { search: "Ridgeway" } } }, ridgeway) };
  const north = customerView(state, data("northstar"), northstar);
  const ridge = customerView(state, data("ridgeway"), ridgeway);
  assert.equal(north.intake, northstarDraft);
  assert.equal(north.intakeReceipt, "NS-01");
  assert.equal(north.intake.businessImpactAnswers["confidentiality-1"], "High");
  assert.equal(ridge.intake.businessImpactAnswers["confidentiality-1"], "N/A");
  assert.equal(north.intakeSubmitted, true);
  assert.equal(north.intakeIssue, null);
  assert.equal(north.registerViews.C14.search, "Northstar");
  assert.equal(ridge.intake, ridgewayDraft);
  assert.equal(ridge.intakeReceipt, "RF-01");
  assert.equal(ridge.intakeIssue.field, "purpose");
  assert.equal(ridge.registerViews.C14.search, "Ridgeway");
});

test("a Ridgeway view excludes signed Northstar workflow without deleting shared records", () => {
  const state = { schemaVersion: 2, selected: "cedar", signedPack: { engagement: { id: "cedar" }, decision: { actor: "A. Morgan" } }, decision: { outcome: "Approve" }, reviews: { "R-07": { actor: "Northstar analyst" } }, qa: "Passed", qaReview: { actor: "Northstar QA" }, uploads: [{ name: "Cedar source" }], supplierReceiptHistory: { recovery: [{ reference: "Cedar-R01" }] }, supplierReceipts: { recovery: { reference: "Cedar-R01" } },
    extraEngagements: [{ id: "n-extra", workspaceId: "northstar" }, { id: "r-extra", workspaceId: "ridgeway" }],
    events: [{ id: "n-event", workspaceId: "northstar", engagementId: "cedar" }, { id: "r-event", workspaceId: "ridgeway", engagementId: "r-extra" }],
    extraFindings: [{ id: "n-finding", workspaceId: "northstar", engagementId: "cedar" }, { id: "r-finding", workspaceId: "ridgeway", engagementId: "clearbridge" }],
    scheduledReviews: [{ id: "n-review", workspaceId: "northstar", engagementId: "cedar" }, { id: "r-review", workspaceId: "ridgeway", engagementId: "clearbridge" }],
    owners: { cedar: "Northstar owner", clearbridge: "Ridgeway owner", "r-extra": "Ridgeway new owner" },
  };
  const before = structuredClone(state);
  const ridge = customerView(state, data("ridgeway"), ridgeway);
  assert.equal(ridge.selected, "clearbridge");
  assert.equal(ridge.schemaVersion, 2);
  assert.equal(ridge.signedPack, null);
  assert.equal(ridge.decision, null);
  assert.equal(ridge.reviews, undefined);
  assert.equal(ridge.qa, "");
  assert.equal(ridge.qaReview, undefined);
  assert.equal(ridge.uploads, undefined);
  assert.equal(ridge.supplierReceiptHistory, undefined);
  assert.deepEqual(ridge.supplierReceipts, {});
  assert.deepEqual(ridge.extraEngagements.map(row => row.id), ["r-extra"]);
  assert.deepEqual(ridge.events.map(row => row.id), ["r-event"]);
  assert.deepEqual(ridge.extraFindings.map(row => row.id), ["r-finding"]);
  assert.deepEqual(ridge.scheduledReviews.map(row => row.id), ["r-review"]);
  assert.deepEqual(ridge.owners, { clearbridge: "Ridgeway owner", "r-extra": "Ridgeway new owner" });
  assert.doesNotMatch(JSON.stringify(ridge), /Cedar|Northstar|A\. Morgan/);
  const north = customerView(state, data("northstar"), northstar);
  assert.equal(north.signedPack, state.signedPack);
  assert.deepEqual(north.extraEngagements.map(row => row.id), ["n-extra"]);
  assert.deepEqual(state, before);
  const analyst = { role: "analyst" };
  assert.equal(customerView(state, data("ridgeway"), analyst), state);
});

test("ordinary actions retain their top-level patch and do not copy workflow into customer UI storage", () => {
  const state = { customerViews: { northstar: { intakeReceipt: "NS-01" } } };
  const patch = { events: [{ id: "r-action" }], selected: "clearbridge" };
  assert.equal(patchCustomerView(state, patch, ridgeway), patch);
  const withDraft = patchCustomerView(state, { ...patch, intakeIssue: null }, ridgeway);
  assert.equal(withDraft.selected, "clearbridge");
  assert.deepEqual(withDraft.events, patch.events);
  assert.deepEqual(withDraft.customerViews, { northstar: { intakeReceipt: "NS-01" }, ridgeway: { intakeIssue: null } });
  assert.equal(patchCustomerView(state, patch, { role: "analyst" }), patch);
});

test("scoped owner edits and full decision patches retain the other customer's owner overrides", () => {
  const state = { owners: { cedar: "Northstar owner", clearbridge: "Ridgeway owner" } };
  const edited = patchCustomerView(state, { owners: { clearbridge: "Updated Ridgeway owner" } }, ridgeway);
  assert.deepEqual(edited.owners, { cedar: "Northstar owner", clearbridge: "Updated Ridgeway owner" });
  const next = { ...state, ...edited };
  const decision = { outcome: "Approve" };
  const signed = patchCustomerView(next, { decision, owners: { cedar: "Updated Northstar owner" }, intakeSubmitted: true }, northstar);
  assert.deepEqual(signed.owners, { cedar: "Updated Northstar owner", clearbridge: "Updated Ridgeway owner" });
  assert.equal(signed.decision, decision);
  assert.equal(signed.customerViews.northstar.intakeSubmitted, true);
  assert.deepEqual(state.owners, { cedar: "Northstar owner", clearbridge: "Ridgeway owner" });
});

test("request journeys and drafts survive a non-Cedar customer view and stay customer-scoped", () => {
  const state = { selected: "r-extra", extraEngagements: [{ id: "n-extra", workspaceId: "northstar" }, { id: "r-extra", workspaceId: "ridgeway" }],
    requestAssessments: { "n-extra": { scope: { service: "Northstar source" } }, "r-extra": { scope: { service: "Ridgeway source" }, qa: { outcome: "Passed" } } },
    requestDrafts: { "n-extra": { rationale: "Northstar draft" }, "r-extra": { rationale: "Ridgeway draft" } },
  };
  const before = structuredClone(state);
  const ridge = customerView(state, data("ridgeway"), ridgeway);
  assert.equal(ridge.selected, "r-extra");
  assert.deepEqual(ridge.requestAssessments, { "r-extra": state.requestAssessments["r-extra"] });
  assert.deepEqual(ridge.requestDrafts, { "r-extra": state.requestDrafts["r-extra"] });
  assert.doesNotMatch(JSON.stringify(ridge), /Northstar/);
  const north = customerView(state, data("northstar"), northstar);
  assert.deepEqual(Object.keys(north.requestAssessments), ["n-extra"]);
  assert.deepEqual(Object.keys(north.requestDrafts), ["n-extra"]);
  assert.deepEqual(state, before);
});

test("partial request map patches preserve other customers for analyst and customer actions", () => {
  const state = { requestAssessments: { "n-extra": { revision: 1 }, "r-extra": { revision: 2 } }, requestDrafts: { "n-extra": { note: "Northstar" }, "r-extra": { note: "Ridgeway" } } };
  for (const user of [ridgeway, { role: "analyst" }]) {
    const patch = patchCustomerView(state, { requestAssessments: { "r-extra": { revision: 3 } }, requestDrafts: { "r-extra": null } }, user);
    assert.deepEqual(patch.requestAssessments, { "n-extra": { revision: 1 }, "r-extra": { revision: 3 } });
    assert.deepEqual(patch.requestDrafts, { "n-extra": { note: "Northstar" }, "r-extra": null });
  }
  assert.equal(state.requestAssessments["r-extra"].revision, 2);
});

test("analyst request maps honor assignments and the current customer filter", () => {
  const state = { extraEngagements: [{ id: "n-extra", workspaceId: "northstar" }, { id: "r-extra", workspaceId: "ridgeway" }],
    requestAssessments: { "n-extra": { revision: 1 }, "r-extra": { revision: 2 } }, requestDrafts: { "n-extra": { note: "Northstar" }, "r-extra": { note: "Ridgeway" } },
  };
  const analyst = { role: "analyst", workspaceIds: ["northstar", "ridgeway"] };
  const filtered = customerView(state, { ...data("ridgeway"), workspaceProfiles: { ridgeway: {} } }, analyst);
  assert.deepEqual(Object.keys(filtered.requestAssessments), ["r-extra"]);
  assert.deepEqual(Object.keys(filtered.requestDrafts), ["r-extra"]);
  const assigned = customerView(state, data("ridgeway"), { ...analyst, workspaceIds: ["northstar"] });
  assert.deepEqual(Object.keys(assigned.requestAssessments), ["n-extra"]);
  assert.deepEqual(Object.keys(assigned.requestDrafts), ["n-extra"]);
});
