import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createScenarioValidator, SCENARIO_FORMAT, MAX_SCENARIO_BYTES } from "../src/scenarios.mjs";
import { projectWorkspace } from "../src/data-model.mjs";
import { createState, mergeWorkflowPatch, recordDecision, workflowStatus } from "../src/state.mjs";
import { sessionUser, scopeWorkspace } from "../src/access.mjs";
import { requestAssessment, requestProgress, transitionRequest } from "../src/request-workflow.mjs";

const read = async name => JSON.parse(await readFile(new URL(`../public/${name}`, import.meta.url), "utf8"));
const [workspace, presentation, examples, schema] = await Promise.all(["data/workspace.json", "data/presentation.json", "data/examples.json", "schemas/workspace.schema.json"].map(read));
const defaults = { workspace, presentation, examples };
const validate = createScenarioValidator(schema, defaults);
const pack = () => structuredClone({ format: SCENARIO_FORMAT, version: 1, id: "cedarcloud", name: "CedarCloud", description: "Default synthetic walkthrough", ...defaults });

test("default scenario validates without sharing or mutating caller records", () => {
  const input = pack(), before = structuredClone(input), result = validate(input);
  assert.deepEqual(result, before);
  result.workspace.actors[0].name = "Changed";
  assert.deepEqual(input, before);
  assert.equal(validate(pack()).workspace.actors[0].name, workspace.actors[0].name);
});

test("envelope rejects unknown fields, versions and non-data values", () => {
  for (const change of [p => p.version = 2, p => p.schema = {}, p => p.catalog = {}, p => p.id = "../case", p => p.name = " ", p => p.source = null, p => p.description = () => "code"]) {
    const input = pack(); change(input);
    assert.throws(() => validate(input));
  }
});

test("presentation and example renderer structures reject missing, null and malformed rows", () => {
  for (const change of [p => delete p.presentation.defaults, p => p.presentation.monitoring = null, p => p.presentation.operationsHandoffs = [["missing columns"]], p => p.examples.referencePack.requirements = [null], p => p.presentation.programmeTabs["Control sets"].rows[0][0] = 7]) {
    const input = pack(); change(input);
    assert.throws(() => validate(input));
  }
  const input = pack(); input.presentation.operationsAttention = { cedar: "Scenario-specific next step" };
  input.presentation.scenario.findingServiceLabels = {};
  input.presentation.defaults.recommendation = "Return for clarification";
  assert.equal(validate(input).presentation.operationsAttention.cedar, "Scenario-specific next step");
  input.presentation.defaults.recommendation = "Hold";
  assert.throws(() => validate(input), /existing demo outcome/);
});

test("normalized references, fixed walkthrough slots and required identities stay compatible", () => {
  for (const change of [p => p.workspace.engagements[0].ownerId = "missing", p => p.presentation.scenario.walkthroughEngagementId = "atlas", p => p.workspace.services.find(r => r.id === "cedarcloud-payment-event-processing").supplierId = "hubspot", p => p.workspace.users.find(r => r.id === "analyst-02").canQA = false, p => p.presentation.scenario.directoryIds.push("missing")]) {
    const input = pack(); change(input);
    assert.throws(() => validate(input));
  }
});

test("imports cannot seed saved session actions or a signed customer decision", () => {
  for (const change of [p => p.presentation.initialState.decision = { outcome: "Approve" }, p => p.presentation.initialState.signedPack = {}, p => p.presentation.initialState.events = [{ id: "forged" }], p => p.presentation.initialState.reviews = {}, p => p.presentation.initialState.uploads = [], p => p.presentation.initialState.supplierDraft.answer = "Saved claim", p => p.presentation.initialState.intakeSubmitted = true, p => p.presentation.intake.businessImpactAnswers = { "availability-1": "High" }]) {
    const input = pack(); change(input);
    assert.throws(() => validate(input));
  }
});

test("historical missing QA stays labelled and cannot carry an invented date or actor", () => {
  const input = pack(); input.examples.referencePack.qaReview = { actor: "Not recorded", prepared: true, at: null };
  input.examples.referencePack.decision.condition = null;
  assert.deepEqual(validate(input).examples.referencePack.qaReview, input.examples.referencePack.qaReview);
  for (const qa of [null, { actor: "Reviewer", prepared: true, at: null }, { actor: "Not recorded", prepared: true, at: "2026-11-05" }, { actor: "Not recorded", prepared: false, at: null }, { actor: "Reviewer", prepared: true, at: "not a date" }]) {
    input.examples.referencePack.qaReview = qa;
    assert.throws(() => validate(input), /QA/);
  }
});

test("scenario imports cannot replace the official CTP methodology questions", () => {
  const input = pack(); input.workspace.biaQuestions[0].label = "Changed impact question";
  assert.throws(() => validate(input), /official CTP/);
});

test("oversized, cyclic, deep and unsafe JSON inputs are rejected before application", () => {
  const huge = pack(); huge.description = "x".repeat(MAX_SCENARIO_BYTES);
  assert.throws(() => validate(huge), /2 MB/);
  const cyclic = pack(); cyclic.source = cyclic;
  assert.throws(() => validate(cyclic), /cyclic/);
  const deep = pack(); deep.source = {}; let item = deep.source;
  for (let i = 0; i < 35; i++) item = item.next = {};
  assert.throws(() => validate(deep), /deeply nested/);
  const unsafe = pack(); unsafe.source = JSON.parse('{"__proto__": {"polluted": true}}');
  assert.throws(() => validate(unsafe), /unsafe object key/);
  const sparse = pack(); sparse.source = { rows: Array(3) };
  assert.throws(() => validate(sparse), /dense JSON arrays/);
  assert.equal({}.polluted, undefined);
});

test("Cedarline fits the unchanged walkthrough contract without importing QA, decisions or CTP answers", async () => {
  const imported = validate(await read("data/scenarios/cedarline.json"));
  const view = projectWorkspace(imported.workspace, imported.presentation, imported.examples);
  assert.equal(view.workspace.name, "Northbridge Commerce Ltd");
  assert.equal(view.engagements.find(row => row.id === "cedar").supplier, "Cedarline Analytics Ltd");
  assert.equal(view.requirements.length, 14);
  assert.equal(view.findings.length, 7);
  assert.equal(view.request.items.length, 2);
  assert.equal(imported.workspace.biaAnswers.length, 0);
  assert.equal(imported.workspace.triageAnswers.length, 0);
  assert.equal(view.engagements.find(row => row.id === "cedar").risk, "Pending triage");
  const state = createState(view);
  assert.equal(state.decision, null);
  assert.equal(state.signedPack, null);
  assert.deepEqual(state.events, []);
  assert.equal(state.judgement, "");
  assert.equal(workflowStatus(state).ready, false);
  const scoped = scopeWorkspace(view, sessionUser(imported.workspace, "customer-morgan"));
  assert.throws(() => recordDecision(state, scoped, "Approve", "Attempt before QA", null), /QA/);
  assert.match(view.referencePack.decision.outcome, /Deferred/);
  assert.equal(view.referencePack.decision.condition, null);
  assert.deepEqual(view.referencePack.qaReview, { actor: "Not recorded", prepared: true, at: null });
  assert.equal(view.findings.some(row => row.id === "F-01"), false);
});

test("Cedarline source answers, missing evidence and original assets retain their provenance", async () => {
  const imported = validate(await read("data/scenarios/cedarline.json"));
  assert.equal(imported.source.supplierAnswers.length, 14);
  assert.equal(imported.source.supplierCorrections.length, 4);
  assert.equal(imported.source.missingEvidence.length, 3);
  assert.equal(imported.source.assets.length, 11);
  for (const asset of imported.source.assets) {
    assert.match(asset.url, /^\/data\/scenarios\/cedarline-assets\/[^/]+$/);
    const bytes = await readFile(new URL(`../public${asset.url}`, import.meta.url));
    assert.equal(bytes.length, asset.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
  }
});

test("new requests complete their own journey under Cedarline without borrowing prepared analysis", async () => {
  const imported = validate(await read("data/scenarios/cedarline.json"));
  const base = projectWorkspace(imported.workspace, imported.presentation, imported.examples);
  const owner = sessionUser(imported.workspace, "customer-morgan");
  const engagement = { id: "request-cedarline-test", receipt: "REQ-CEDARLINE-TEST", workspaceId: owner.workspaceId,
    client: base.workspaceProfiles[owner.workspaceId].name, supplier: "Zapier", service: "Staff record synchronisation",
    decisionOwnerId: owner.actorId, risk: "Pending triage", stage: "Intake", answers: { 0: "Unknown" } };
  let state = { ...createState(base), selected: engagement.id, extraEngagements: [engagement] };
  const prepared = structuredClone({ conclusion: state.conclusion, judgement: state.judgement, qa: state.qa, qaReview: state.qaReview });
  assert.equal(requestProgress(requestAssessment(state, engagement)).stage, "Intake");
  assert.deepEqual(requestAssessment(state, engagement).evidence, []);
  const act = (identity, action, values) => {
    const data = scopeWorkspace(base, sessionUser(imported.workspace, identity));
    const context = { ...data, activeEngagementId: engagement.id, engagements: [...data.engagements, engagement],
      workspace: data.workspaceProfiles[engagement.workspaceId] };
    state = mergeWorkflowPatch(state, transitionRequest(state, context, engagement.id, action, values));
  };
  act("analyst-01", "scope", { service: engagement.service, risk: "Medium", plan: "Standard review", rationale: "Manual service classification after reviewing customer context." });
  act("analyst-01", "evidence", { name: "Zapier service report", source: "Separately supplied report", version: "v1", notes: "Covers this new staff-record service only." });
  const evidence = requestAssessment(state, engagement).evidence[0];
  act("analyst-01", "review", { evidenceId: evidence.id, conclusion: "Supported", rationale: "Reviewed the exact staff-record service source." });
  act("analyst-01", "recommend", { outcome: "Approve", rationale: "The new source supports this service's recommendation." });
  act("analyst-02", "qa", { outcome: "Passed", rationale: "Independent challenge checked the new service report." });
  act("customer-morgan", "decision", { outcome: "Approve", rationale: "Accept this service's reviewed outcome." });
  const record = requestAssessment(state, engagement);
  assert.equal(requestProgress(record).stage, "Active");
  assert.equal(record.decision.actor, "Morgan Vale");
  assert.equal(record.signedPack.engagement.supplier, "Zapier");
  assert.equal(record.signedPack.workspace.name, "Northbridge Commerce Ltd");
  assert.equal(record.signedPack.policy, base.workspaceProfiles.northstar.policy);
  assert.equal(record.signedPack.overlay, base.workspaceProfiles.northstar.overlay);
  assert.deepEqual(record.signedPack.evidence.map(row => [row.name, row.version]), [["Zapier service report", "v1"]]);
  assert.deepEqual(Object.keys(record.signedPack.reviews), [evidence.id]);
  assert.equal(record.signedPack.qa.actorId, sessionUser(imported.workspace, "analyst-02").actorId);
  assert.deepEqual({ conclusion: state.conclusion, judgement: state.judgement, qa: state.qa, qaReview: state.qaReview }, prepared);
  for (const entry of record.events) {
    assert.equal(entry.workspaceId, owner.workspaceId);
    assert.equal(entry.customer, "Northbridge Commerce Ltd");
    assert.equal(entry.engagementId, engagement.id);
    assert.equal(entry.service, engagement.service);
  }
});
