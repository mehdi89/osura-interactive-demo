import { createModelValidator, projectWorkspace } from "./data-model.mjs";

export const SCENARIO_FORMAT = "osura-demo-scenario";
export const MAX_SCENARIO_BYTES = 2 * 1024 * 1024;

const fail = (path, message) => { throw new Error(`${path}: ${message}`); };
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const maps = new Set(["presentation.operationsAttention", "presentation.scenario.findingServiceLabels"]);

function inspectJSON(value, path = "scenario", depth = 0, seen = new Set(), count = { value: 0 }) {
  if (depth > 30 || ++count.value > 30000) fail(path, "scenario is too deeply nested or too large");
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value !== "object") fail(path, "only JSON data is allowed");
  if (seen.has(value)) fail(path, "cyclic data is not allowed");
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
    fail(path, "only plain JSON objects are allowed");
  if (Array.isArray(value) && Object.getPrototypeOf(value) !== Array.prototype) fail(path, "only plain JSON arrays are allowed");
  if (Array.isArray(value) && (value.length > 30000 || Reflect.ownKeys(value).length !== value.length + 1)) fail(path, "only dense JSON arrays are allowed");
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === "length") continue;
    if (typeof key !== "string" || ["__proto__", "prototype", "constructor"].includes(key)) fail(path, "unsafe object key");
    if (Array.isArray(value) && !/^(0|[1-9]\d*)$/.test(key)) fail(path, "only JSON array items are allowed");
    const property = Object.getOwnPropertyDescriptor(value, key);
    if (!property.enumerable || !Object.hasOwn(property, "value")) fail(path, "only JSON values are allowed");
    inspectJSON(property.value, `${path}.${key}`, depth + 1, seen, count);
  }
  seen.delete(value);
}

function checkShape(value, sample, path) {
  if (path === "examples.referencePack.decision.condition" && value === null) return;
  if (sample === null) { if (value !== null) fail(path, "must remain null"); return; }
  if (Array.isArray(sample)) {
    if (!Array.isArray(value)) fail(path, "must be an array");
    if (!sample.length) { if (value.length) fail(path, "must start empty"); return; }
    for (const row of value) {
      if (Array.isArray(sample[0])) {
        if (!Array.isArray(row) || row.length !== sample[0].length) fail(path, "invalid row columns");
        row.forEach((cell, index) => checkShape(cell, sample[0][index], `${path}[].${index}`));
      } else {
        const shape = object(row) ? sample.find(item => object(item) && Object.keys(item).length === Object.keys(row).length && Object.keys(item).every(key => Object.hasOwn(row, key))) : sample[0];
        if (shape === undefined) fail(path, "invalid row fields");
        checkShape(row, shape, `${path}[]`);
      }
    }
    return;
  }
  if (object(sample)) {
    if (!object(value)) fail(path, "must be an object");
    if (maps.has(path)) {
      const entry = Object.values(sample)[0];
      for (const [key, item] of Object.entries(value)) checkShape(item, entry, `${path}.${key}`);
      return;
    }
    const allowed = new Set(Object.keys(sample));
    if (path === "examples.referencePack") allowed.add("qaReview");
    if (path === "presentation.defaults") for (const key of ["recommendation", "materialIssue", "requestItemDescriptions"]) allowed.add(key);
    for (const key of Object.keys(value)) if (!allowed.has(key)) fail(`${path}.${key}`, "unsupported field");
    for (const [key, item] of Object.entries(sample)) {
      if (!Object.hasOwn(value, key)) fail(`${path}.${key}`, "required field is missing");
      checkShape(value[key], item, `${path}.${key}`);
    }
    return;
  }
  if (typeof value !== typeof sample) fail(path, `must be ${typeof sample}`);
  if (path.startsWith("presentation.initialState.") && (sample === "" || sample === false) && value !== sample)
    fail(path, "session drafts and actions must start empty");
}

export function createScenarioValidator(schema, defaults) {
  const baseline = structuredClone(defaults);
  return pack => {
    inspectJSON(pack);
    if (new TextEncoder().encode(JSON.stringify(pack)).length > MAX_SCENARIO_BYTES) fail("scenario", "file exceeds 2 MB");
    if (!object(pack)) fail("scenario", "must be an object");
    const fields = ["format", "version", "id", "name", "description", "workspace", "presentation", "examples"];
    for (const key of Object.keys(pack)) if (![...fields, "source"].includes(key)) fail(key, "unsupported scenario field");
    for (const key of fields) if (!Object.hasOwn(pack, key)) fail(key, "required scenario field is missing");
    if (pack.format !== SCENARIO_FORMAT || pack.version !== 1) fail("scenario", "unsupported format or version");
    if (typeof pack.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pack.id) || pack.id.length > 80) fail("id", "must be a short scenario slug");
    for (const field of ["name", "description"]) if (typeof pack[field] !== "string" || !pack[field].trim()) fail(field, "must be non-empty text");
    if (Object.hasOwn(pack, "source") && !object(pack.source)) fail("source", "must be an object");
    checkShape(pack.presentation, baseline.presentation, "presentation");
    checkShape(pack.examples, baseline.examples, "examples");
    const { presentation, examples, workspace } = pack;
    if (presentation.schemaVersion !== baseline.presentation.schemaVersion) fail("presentation.schemaVersion", "must use the installed demo version");
    if (presentation.defaults.recommendation !== undefined && !["Approve", "Approve with conditions", "Reject", "Return for clarification"].includes(presentation.defaults.recommendation))
      fail("presentation.defaults.recommendation", "must use an existing demo outcome");
    if (presentation.defaults.materialIssue !== undefined && typeof presentation.defaults.materialIssue !== "string") fail("presentation.defaults.materialIssue", "must be text");
    if (presentation.defaults.requestItemDescriptions !== undefined && (!Array.isArray(presentation.defaults.requestItemDescriptions) || presentation.defaults.requestItemDescriptions.length !== 2 || presentation.defaults.requestItemDescriptions.some(value => typeof value !== "string")))
      fail("presentation.defaults.requestItemDescriptions", "must describe the two existing request items");
    for (const key of ["selected"]) if (presentation.initialState[key] !== baseline.presentation.initialState[key]) fail(`presentation.initialState.${key}`, "must keep the compatible walkthrough slot");
    for (const key of ["workspaceId", "walkthroughEngagementId"]) if (presentation.scenario[key] !== baseline.presentation.scenario[key]) fail(`presentation.scenario.${key}`, "must keep the compatible walkthrough slot");
    const qa = examples.referencePack.qaReview;
    if (qa !== undefined) {
      if (!object(qa) || Object.keys(qa).sort().join() !== "actor,at,prepared" || typeof qa.actor !== "string" || !qa.actor.trim() || qa.prepared !== true || !(qa.at === null || typeof qa.at === "string"))
        fail("examples.referencePack.qaReview", "must be a labelled prepared QA record");
      if ((qa.at === null) !== (qa.actor === "Not recorded")) fail("examples.referencePack.qaReview", "missing QA must use Not recorded and a null date");
      if (qa.at !== null && (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(qa.at) || !Number.isFinite(Date.parse(qa.at)))) fail("examples.referencePack.qaReview", "QA date is invalid");
    }
    createModelValidator(schema, presentation)(workspace);
    for (const user of baseline.workspace.users) {
      const row = workspace.users.find(item => item.id === user.id);
      if (!row || ["role", "workspaceId", "active", "canQA"].some(key => row[key] !== user[key])) fail(`workspace.users.${user.id}`, "must retain the demo identity's role and scope");
    }
    if (workspace.biaQuestions.length !== baseline.workspace.biaQuestions.length || baseline.workspace.biaQuestions.some((question, index) => Object.entries(question).some(([key, value]) => workspace.biaQuestions[index][key] !== value)))
      fail("workspace.biaQuestions", "the official CTP question definitions must remain unchanged");
    for (const [field, table] of [["directoryIds", "engagements"], ["intakeSupplierIds", "suppliers"]])
      for (const id of presentation.scenario[field]) if (!workspace[table].some(row => row.id === id)) fail(`presentation.scenario.${field}`, `unknown ${id}`);
    projectWorkspace(workspace, presentation, examples);
    return structuredClone(pack);
  };
}
