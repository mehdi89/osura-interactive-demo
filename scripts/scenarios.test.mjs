import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createScenarioValidator, SCENARIO_FORMAT, MAX_SCENARIO_BYTES } from "../src/scenarios.mjs";
import { projectWorkspace } from "../src/data-model.mjs";
import { createState, recordDecision, workflowStatus } from "../src/state.mjs";
import { sessionUser, scopeWorkspace } from "../src/access.mjs";

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
