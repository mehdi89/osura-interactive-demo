import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createState,
  recordDecision,
  submitSupplier,
  filterEngagements,
  saveRequirementReview,
  recordQA,
  workflowStatus,
  addEvidence,
  canCloseCondition,
  closeCondition,
  filterSupplierServices,
} from "../src/state.mjs";

import { sessionUser } from "../src/access.mjs";
import { projectWorkspace } from "../src/data-model.mjs";
const readJSON = async name => JSON.parse(await readFile(new URL(`../public/data/${name}.json`, import.meta.url)));
const model = await readJSON("workspace");
const data = { ...projectWorkspace(model, await readJSON("presentation"), await readJSON("examples")), access: sessionUser(model,"customer-morgan"), activeEngagementId: "cedar" };
const analystData = { ...data, access: sessionUser(model,"analyst-01") };
const catalog = JSON.parse(
  await readFile(new URL("../public/data/screens.json", import.meta.url)),
);
const condition = {
  owner: "A. Morgan",
  due: "2026-11-20",
  evidence: "Service-scoped test",
};

test("all 35 references have unique routes and valid navigation", () => {
  assert.equal(catalog.screens.length, 35);
  const ids = new Set(catalog.screens.map((s) => s.id));
  assert.equal(ids.size, 35);
  for (const screen of catalog.screens.filter((s) => s.role !== "supplier")) {
    assert.ok(
      catalog.navigation[screen.role].some(([id]) => id === screen.nav),
      screen.id,
    );
  }
  assert.equal(data.triage.length, 9);
  assert.equal(Object.values(data.bia).flat().length, 17);
  assert.equal(new Set(data.engagements.map((e) => e.supplier)).size, 8);
});

test("QA, rationale and complete condition gate the customer decision", () => {
  const initial = createState(data);
  assert.throws(
    () =>
      recordDecision(
        { ...initial, selected: "atlas" },
        data,
        "Approve",
        "Proceed",
        condition,
      ),
    /CedarCloud/,
  );
  assert.throws(
    () =>
      recordDecision(
        { ...initial, qa: "Rework requested" },
        data,
        "Approve",
        "Proceed",
        condition,
      ),
    /QA/,
  );
  assert.throws(
    () => recordDecision(initial, data, "Approve", " ", condition),
    /rationale/,
  );
  assert.throws(
    () =>
      recordDecision(initial, data, "Approve with conditions", "Proceed", {
        ...condition,
        owner: "",
      }),
    /owner/,
  );
  assert.throws(
    () => recordDecision(initial, data, "Invented", "Proceed", condition),
    /valid/,
  );
});

test("signed pack preserves evidence and original decision through later edits", () => {
  const initial = createState(data);
  const next = recordDecision(
    initial,
    data,
    "Approve with conditions",
    "Proceed with test",
    condition,
  );
  assert.equal(initial.decision, null);
  assert.equal(next.signedPack.decision.outcome, "Approve with conditions");
  const snapshot = JSON.stringify(next.signedPack);
  const later = { ...next, conditionClosed: true, conclusion: "Supported" };
  assert.equal(JSON.stringify(later.signedPack), snapshot);
  assert.notEqual(next.signedPack.requirements, data.requirements);
  assert.throws(
    () => recordDecision(next, data, "Approve", "Repeat", condition),
    /already/,
  );
});

test("return for clarification creates no signed decision and requests rework", () => {
  const next = recordDecision(
    createState(data),
    data,
    "Return for clarification",
    "Confirm scope",
    condition,
  );
  assert.equal(next.decision, null);
  assert.equal(next.signedPack, null);
  assert.equal(next.qa, "Rework requested");
});

test("supplier submission validates fields, persists an honest receipt and is idempotent", () => {
  const initial = createState(data);
  assert.throws(() => submitSupplier(initial), /Attach evidence/);
  const next = submitSupplier({
    ...initial,
    supplierDraft: {
      fileName: "test.pdf",
      answer: "Payment events covered",
      scope: "Covers this service",
    },
  });
  assert.equal(next.conclusion, "Needs review");
  assert.equal(next.supplierReceipt.fileName, "test.pdf");
  assert.equal(submitSupplier(next), next);
  const second = submitSupplier(
    {
      ...next,
      supplierDraft: {
        fileName: "access.pdf",
        answer: "Payment service access review",
        scope: "Covers this service",
      },
    },
    "Privileged access review record",
  );
  assert.equal(Object.keys(second.supplierReceipts).length, 2);
  assert.equal(second.supplierReceipt.fileName, "test.pdf");
  assert.equal(
    second.supplierReceipts["Privileged access review record"].fileName,
    "access.pdf",
  );
  assert.notEqual(
    second.supplierReceipts["Recovery exercise evidence"].reference,
    second.supplierReceipts["Privileged access review record"].reference,
  );
});

test("search and risk filters select matching service-level records", () => {
  assert.equal(filterEngagements(data.engagements, "HubSpot").length, 2);
  assert.equal(
    filterEngagements(data.engagements, "HubSpot", "High").length,
    1,
  );
  assert.equal(
    filterEngagements(data.engagements, "no-such-supplier").length,
    0,
  );
  assert.equal(filterEngagements(data.engagements, "", "Low").length, 3);
  assert.equal(
    filterEngagements(
      [{ supplier: "HubSpot", risk: "Varies", risks: ["High", "Medium"] }],
      "",
      "High",
    ).length,
    1,
  );
});

test("reviewing another requirement cannot clear the recovery evidence gate", () => {
  const state = { ...createState(data), conclusion: "Needs review" };
  const next = saveRequirementReview(state, analystData, "INC-03", {
    recommendation: "Approve with conditions", judgement: "Notification roles documented",
    conclusion: "Supported",
    reason: "",
  });
  assert.equal(next.conclusion, "Needs review");
  assert.equal(next.reviews["INC-03"].conclusion, "Supported");
  assert.throws(
    () => recordDecision(next, data, "Approve", "Proceed", condition),
    /supplier evidence/,
  );
  assert.throws(
    () =>
      saveRequirementReview(state, analystData, "R-07", {
        recommendation: "Approve with conditions", judgement: "Read source",
        conclusion: "Needs review",
        reason: "",
      }),
    /reviewed evidence/,
  );
  const reviewed = saveRequirementReview(state, analystData, "R-07", {
    recommendation: "Approve with conditions", judgement: "Exact service test supports coverage",
    conclusion: "Supported",
    reason: "New scoped test supplied",
  });
  assert.equal(reviewed.conclusion, "Supported");
  assert.equal(reviewed.qa, "Rework requested");
});

test("custom supplier item labels and reference ids come from the dataset", () => {
  const state = {
    ...createState(data),
    requestReference: "CUSTOM-1",
    supplierDraft: {
      fileName: "test.pdf",
      answer: "Scoped service proof",
      scope: "Covers this service",
    },
  };
  const next = submitSupplier(state, "Custom recovery", "Custom recovery");
  assert.equal(next.supplierReceipt.reference, "CUSTOM-1-R01");
  assert.equal(next.conclusion, "Needs review");
});


test("QA send-back requires an analyst revision and readiness agrees with the decision gate", () => {
  const qaData = { ...data, access: sessionUser(model, "analyst-02") };
  const sentBack = recordQA(createState(data), qaData, "Rework requested", "Explain service scope");
  assert.equal(workflowStatus(sentBack).label, "Analyst revision required");
  assert.equal(workflowStatus(sentBack).nextOwner, "Analyst");
  assert.deepEqual([workflowStatus(sentBack).stage, workflowStatus(sentBack).step], ["Findings", 2]);
  assert.throws(() => recordQA(sentBack, qaData, "Passed", "Changed my mind"), /must revise/);
  const revised = saveRequirementReview(sentBack, analystData, "R-07", {
    recommendation: "Approve with conditions", judgement: "Exact service scope considered", conclusion: "Partially supported", reason: "",
  });
  assert.equal(workflowStatus(revised).label, "Independent QA required");
  assert.deepEqual([workflowStatus(revised).stage, workflowStatus(revised).step], ["QA", 3]);
  const passed = recordQA(revised, qaData, "Passed with condition", "Independently checked revision");
  assert.equal(workflowStatus(passed).ready, true);
  assert.deepEqual([workflowStatus(passed).stage, workflowStatus(passed).step], ["Decision", 4]);
  const approved = recordDecision(passed, data, "Approve", "Service scope is acceptable", null);
  assert.deepEqual([workflowStatus(approved).stage, workflowStatus(approved).step], ["Active", 5]);
  const signed = recordDecision(passed, data, "Reject", "Service scope is unacceptable", null);
  assert.equal(workflowStatus(signed).label, "Rejected");
  assert.deepEqual([workflowStatus(signed).stage, workflowStatus(signed).step], ["Rejected", 5]);
  assert.equal(workflowStatus(signed).ready, false);
});

test("ordinary evidence uploads invalidate readiness and require their own review", () => {
  const initial = createState(data);
  const uploaded = addEvidence(initial, analystData, { name: "access.pdf", requirement: "IAM-04" });
  assert.equal(uploaded.pendingReviews["IAM-04"], true);
  assert.equal(workflowStatus(uploaded).label, "Evidence re-review required");
  assert.deepEqual([workflowStatus(uploaded).stage, workflowStatus(uploaded).step], ["Evidence", 2]);
  assert.throws(() => recordDecision(uploaded, data, "Approve", "Proceed", null), /supplier evidence/);
  assert.throws(() => addEvidence(initial, analystData, { name: "  " }), /file/);
  assert.throws(() => addEvidence(initial, analystData, { name: "file.pdf", requirement: "missing" }), /valid/);
  const all = addEvidence(initial, analystData, { name: "general.pdf" });
  assert.equal(Object.values(all.pendingReviews).filter(Boolean).length, data.requirements.length);
  assert.notEqual(addEvidence(initial, analystData, { name: "file.pdf" }).uploads[0].version, all.uploads[0].version);
  assert.equal(initial.uploads, undefined);
});

test("a signed pack keeps its workspace name and cannot close on evidence predating the decision", () => {
  const signed = recordDecision(createState(data), data, "Approve with conditions", "Proceed with future proof", condition);
  assert.equal(signed.signedPack.workspace.name, data.workspace.name);
  const old = {
    ...signed,
    supplierReceipt: { at: "2020-01-01T00:00:00Z", reference: "old" },
    reviews: { "R-07": { conclusion: "Supported", at: "2026-11-05T00:00:00Z", evidenceVersions: ["old"] } },
    conclusion: "Supported",
  };
  assert.equal(canCloseCondition(old), false);
  assert.throws(() => closeCondition(old, analystData, "Looks fine"), /after the customer decision/);
  const decisionAt = "2026-11-05T00:00:00Z";
  const receipt = { at: "2026-11-06T00:00:00Z", reference: "new" };
  const later = { ...old, signedPack: { ...signed.signedPack, decision: { ...signed.decision, at: decisionAt } },
    supplierReceipt: receipt, reviews: { "R-07": { conclusion: "Supported", at: "2026-11-06T01:00:00Z", evidenceVersions: [receipt.reference] } } };
  assert.equal(canCloseCondition(later), true);
  assert.equal(canCloseCondition({ ...later, pendingReviews: { "R-07": true } }), false);
  const closed = closeCondition(later, analystData, "Reviewed the later scoped proof");
  assert.equal(closed.conditionClosed, true);
  assert.equal(closed.signedPack, later.signedPack);
  assert.equal(canCloseCondition({ ...later, reviews: { "R-07": { ...later.reviews["R-07"], evidenceVersions: ["old"] } } }), false);
});

test("supplier filters match service scope before grouping mixed supplier outcomes", () => {
  const rows = [
    { id: "review", workspaceId: "one", supplier: "Shared", service: "Events", stage: "Decision", risk: "High" },
    { id: "approved", workspaceId: "one", supplier: "Shared", service: "CRM", stage: "Active", risk: "Low" },
    { id: "rejected", workspaceId: "one", supplier: "Rejected", service: "Storage", stage: "Rejected", risk: "High" },
  ];
  assert.deepEqual(filterSupplierServices(rows, "", "All", "Approved").map(row => row.id), ["approved"]);
  assert.equal(filterSupplierServices(rows, "", "All", "Approved")[0].service, "CRM");
  assert.deepEqual(filterSupplierServices(rows, "", "All", "Needs attention").map(row => row.id), ["review"]);
  const low = filterSupplierServices(rows, "", "Low");
  assert.equal(low.length, 1); assert.equal(low[0].service, "CRM"); assert.equal(low[0].serviceCount, 1);
  const grouped = filterSupplierServices(rows);
  assert.equal(grouped[0].serviceCount, 2); assert.equal(grouped[0].service, "Events · CRM");
});
