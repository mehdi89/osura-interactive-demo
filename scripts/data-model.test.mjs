import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createModelValidator, projectWorkspace, changeRecord } from "../src/data-model.mjs";
import { loadModelFiles, generateDatabase } from "./database.mjs";
const { schema, data, presentation } = await loadModelFiles();
const examples = JSON.parse(await readFile(new URL("../public/data/examples.json", import.meta.url)));
const validate = createModelValidator(schema, presentation);
const copy = () => structuredClone(data);

test("seed uses strict types, dates and enums, with no undeclared fields", () => {
  assert.equal(validate(data), data);
  for (const [field, value] of [["due", "2026-02-30"], ["risk", "Invented"], ["unexpected", true]]) {
    const invalid = copy(); invalid.engagements[0][field] = value;
    assert.throws(() => validate(invalid));
  }
  const invalid = copy(); invalid.supplierRequests[0].recipient = "not-an-email";
  assert.throws(() => validate(invalid), /email/);
});

test("duplicate ids, dangling references and duplicate composite keys are blocked", () => {
  const duplicate = copy(); duplicate.suppliers.push(duplicate.suppliers[0]);
  assert.throws(() => validate(duplicate), /duplicate id/);
  const dangling = copy(); dangling.engagements[0].ownerId = "missing";
  assert.throws(() => validate(dangling), /missing/);
  const composite = copy(); composite.triageAnswers.push({ ...composite.triageAnswers[0], id: "duplicate-answer" });
  assert.throws(() => validate(composite), /must be unique/);
});

test("version kinds, independent QA and evidence scope/page bounds are enforced", () => {
  const version = copy(); version.engagements[0].corePolicyVersionId = "enhanced-v3";
  assert.throws(() => validate(version), /core version/);
  const qa = copy(); qa.engagements[0].qaReviewerId = qa.engagements[0].analystId;
  assert.throws(() => validate(qa), /differ/);
  const scope = copy(); scope.documentVersions[0].engagementId = "atlas";
  assert.throws(() => validate(scope), /same engagement/);
  const pages = copy(); pages.evidenceCitations[0].pageEnd = 999;
  assert.throws(() => validate(pages), /outside/);
});

test("CRUD is immutable, validates atomically, and projects to the existing register", () => {
  const service = { id: "new-service", supplierId: "cedarcloud", name: "New test service", suggestionOrder: null };
  let model = changeRecord(data, "services", "create", service, validate);
  const row = { ...model.engagements[0], id: "new-engagement", serviceId: service.id };
  model = changeRecord(model, "engagements", "create", row, validate);
  assert.equal(data.engagements.some(r => r.id === row.id), false);
  assert.equal(projectWorkspace(model, presentation, examples).engagements.find(r => r.id === row.id).service, service.name);
  model = changeRecord(model, "engagements", "update", { ...row, stage: "Evidence" }, validate);
  assert.equal(projectWorkspace(model, presentation, examples).engagements.find(r => r.id === row.id).stage, "Evidence");
  assert.throws(() => changeRecord(model, "services", "delete", service, validate), /referenced/);
  assert.throws(() => changeRecord(model, "engagements", "create", row, validate), /Duplicate/);
  model = changeRecord(model, "engagements", "delete", row, validate);
  model = changeRecord(model, "services", "delete", service, validate);
  assert.deepEqual(model, data);
});

test("walkthrough pins cannot be deleted and reference examples remain frozen", () => {
  assert.throws(() => changeRecord(data, "requestItems", "delete", data.requestItems[0], validate), /two ordered items/);
  const row = data.suppliers.find(r => r.id === "cedarcloud");
  const model = changeRecord(data, "suppliers", "update", { ...row, name: "Updated Cedar" }, validate);
  const view = projectWorkspace(model, presentation, examples);
  assert.equal(view.engagements[0].supplier, "Updated Cedar");
  assert.equal(view.findings[0].supplier, "Updated Cedar");
  assert.equal(view.referencePack.engagement.supplier, "CedarCloud");
  view.referencePack.engagement.supplier = "Changed projection";
  assert.equal(examples.referencePack.engagement.supplier, "CedarCloud");
});

test("generated SQL stays in sync and quotes fixture values safely", async () => {
  const output = generateDatabase(schema, data);
  for (const [name, expected] of Object.entries(output))
    assert.equal(await readFile(new URL(`../database/${name}`, import.meta.url), "utf8"), expected);
  const model = copy(); model.actors[0].name = "O'Brien'); DROP TABLE actors; --";
  const sql = generateDatabase(schema, model)["seed.sql"];
  assert.ok(sql.includes("O''Brien''); DROP TABLE actors; --"));
  assert.equal((output["schema.sql"].match(/CREATE TABLE/g) || []).length, 19);
});


test("the data editor cannot redirect CedarCloud's walkthrough to another supplier service", () => {
  const engagement = data.engagements.find(row => row.id === "cedar");
  const otherService = data.services.find(row => row.supplierId !== "cedarcloud");
  assert.throws(() => changeRecord(data, "engagements", "update", { ...engagement, serviceId: otherService.id }, validate), /original supplier service link/);
  const service = data.services.find(row => row.id === engagement.serviceId);
  assert.throws(() => changeRecord(data, "services", "update", { ...service, supplierId: otherService.supplierId }, validate), /original supplier service link/);
});
