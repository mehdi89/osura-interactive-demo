import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";
import { sessionUser, scopeWorkspace } from "../src/access.mjs";
import { projectWorkspace } from "../src/data-model.mjs";
import { createState, recordDecision } from "../src/state.mjs";

// Render the actual screen functions without starting the browser-only app bootstrap.
const source = await readFile(new URL("../src/main.jsx", import.meta.url), "utf8");
const bundled = await build({
  stdin: { contents: source.slice(0, source.lastIndexOf("Promise.all(")) + "\nexport { Decision, Pack, Closure, EvidenceReview };", resolveDir: new URL("../src", import.meta.url).pathname, loader: "jsx" },
  bundle: true, platform: "node", format: "cjs", packages: "external", loader: { ".css": "empty" }, write: false,
});
const module = { exports: {} };
new Function("require", "module", "exports", bundled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { Decision, Pack, Closure, EvidenceReview } = module.exports;
const readJSON = async name => JSON.parse(await readFile(new URL(`../public/data/${name}.json`, import.meta.url)));
const model = await readJSON("workspace");
const user = sessionUser(model, "customer-morgan");
const data = scopeWorkspace(projectWorkspace(model, await readJSON("presentation"), await readJSON("examples")), user);
const context = (patch = {}) => ({ data, user, state: createState(data), engagement: data.engagements.find(row => row.id === "cedar"), screen: { role: "customer" }, update() {}, navigate() {}, notify() {}, setDrawer() {}, ...patch });
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));

test("customer outcome starts blank with one Record action and read-only proposed obligation", () => {
  const html = render(Decision, context());
  assert.equal((html.match(/>Record decision</g) || []).length, 1);
  assert.equal((html.match(/checked=""/g) || []).length, 0);
  assert.match(html, /<textarea required=""><\/textarea>/);
  assert.match(html, /Proposed required evidence/);
  assert.match(html, /read-only advice/);
});

test("decision readiness and disabled action reflect unresolved evidence", () => {
  const c = context();
  c.state.pendingReviews = { "IAM-04": true };
  const html = render(Decision, c);
  assert.match(html, /Evidence re-review required/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>[\s\S]*?Record decision/);
  assert.doesNotMatch(html, /Ready for customer decision/);
});

test("prepared packs carry an article label that remains in print; signed packs use frozen workspace", () => {
  assert.match(render(Pack, context()), /PREPARED REFERENCE EXAMPLE/);
  const c = context();
  c.state = recordDecision(c.state, c.data, "Reject", "The service does not meet our needs.", null);
  c.data = { ...c.data, workspace: { ...c.data.workspace, name: "Changed workspace" } };
  const html = render(Pack, c);
  assert.match(html, /Northstar Payments/);
  assert.doesNotMatch(html, /Changed workspace|Continue to active assurance/);
});

test("closure is a preview when evidence predates the signed condition", () => {
  const c = context();
  c.state = recordDecision(c.state, c.data, "Approve with conditions", "The evidence obligation is required.", { owner: "Decision Owner", due: "2026-11-20", evidence: "New service-scoped exercise" });
  c.state.supplierReceipt = { fileName: "old-exercise.pdf", reference: "OLD-01", at: "2026-10-01T10:00:00Z" };
  c.state.reviews = { "R-07": { conclusion: "Supported", at: new Date().toISOString(), evidenceVersions: ["OLD-01"] } };
  const html = render(Closure, c);
  assert.match(html, /Closure preview only/);
  assert.match(html, /Evidence received before the decision cannot close its condition/);
});

test("source inspection uses the current file and version rather than the original fixture", () => {
  const c = context({ screen: { role: "analyst" }, user: sessionUser(model, "analyst-01") });
  c.data = { ...c.data, requirements: c.data.requirements.map(row => row.id === "R-07" ? { ...row, sourceDocument: { name: "new-exercise.pdf", version: "NEW-03", date: "2026-11-06", page: "Supplier response · no extraction" } } : row) };
  const html = render(EvidenceReview, c);
  assert.match(html, /new-exercise.pdf/);
  assert.match(html, /NEW-03/);
  assert.match(html, /View source excerpt/);
  assert.doesNotMatch(html, /View original/);
});
