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
  stdin: { contents: source.slice(0, source.lastIndexOf("Promise.all(")) + "\nexport { App, Decision, Pack, Closure, EvidenceReview, Overview, Assessment, Inventory, RiskGrid, Findings, FindingForm };", resolveDir: new URL("../src", import.meta.url).pathname, loader: "jsx" },
  bundle: true, platform: "node", format: "cjs", packages: "external", loader: { ".css": "empty" }, write: false,
});
const module = { exports: {} };
new Function("require", "module", "exports", bundled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { App, Decision, Pack, Closure, EvidenceReview, Overview, Assessment, Inventory, RiskGrid, Findings, FindingForm } = module.exports;
const readJSON = async name => JSON.parse(await readFile(new URL(`../public/data/${name}.json`, import.meta.url)));
const model = await readJSON("workspace");
const user = sessionUser(model, "customer-morgan");
const data = scopeWorkspace(projectWorkspace(model, await readJSON("presentation"), await readJSON("examples")), user);
const context = (patch = {}) => ({ data, user, state: createState(data), engagement: data.engagements.find(row => row.id === "cedar"), screen: { role: "customer" }, update() {}, navigate() {}, notify() {}, setDrawer() {}, ...patch });
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));

test("customer outcome starts blank with one deliberate review action and read-only proposed obligation", () => {
  const html = render(Decision, context());
  assert.equal((html.match(/>Review my decision →</g) || []).length, 1);
  assert.equal((html.match(/>Record customer decision</g) || []).length, 0);
  assert.equal((html.match(/checked=""/g) || []).length, 0);
  assert.match(html, /<textarea required=""[^>]*><\/textarea>/);
  assert.match(html, /Proposed required evidence/);
  assert.match(html, /read-only advice/);
});

test("decision readiness and disabled action reflect unresolved evidence", () => {
  const c = context();
  c.state.pendingReviews = { "IAM-04": true };
  const html = render(Decision, c);
  assert.match(html, /Evidence re-review required/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>[\s\S]*?Review my decision/);
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

function findElement(element, text) {
  if (!React.isValidElement(element)) return null;
  if (element.props.children === text && typeof element.props.onClick === "function") return element;
  for (const value of [element.props.action, ...React.Children.toArray(element.props.children)]) {
    const found = findElement(value, text);
    if (found) return found;
  }
  return null;
}

test("assurance navigation accepts click events and preserves the signed engagement", () => {
  const c = context();
  const routes = [];
  const patches = [];
  c.navigate = route => routes.push(route);
  c.update = patch => patches.push(patch);
  findElement(Overview(c), "Monitoring plan →").props.onClick({ type: "click" });
  assert.equal(routes.at(-1), "C08");
  c.state = recordDecision(c.state, c.data, "Approve", "Evidence is acceptable.", null);
  findElement(Pack(c), "Continue to active assurance →").props.onClick({ type: "click" });
  assert.equal(routes.at(-1), "C08");
  assert.equal(patches.at(-1).selected, c.state.signedPack.engagement.id);
});

test("customer overview and decision steps do not claim customer action during rework", () => {
  const c = context();
  c.state = { ...c.state, qa: "Rework requested", qaReworkRevision: 0 };
  const overview = render(Overview, c);
  assert.doesNotMatch(overview, />Review decision</);
  assert.match(overview, /0 decision ready/);
  assert.match(render(Decision, c), /aria-current="step" class="current">Evidence &amp; follow-up/);
  c.state = { ...c.state, qaReworkRevision: null, pendingReviews: { "IAM-04": true } };
  assert.match(render(Decision, c), /aria-current="step" class="current">Evidence &amp; follow-up/);
});

const catalog = await readJSON("screens");
function renderApp(screenId, props = {}) {
  const previous = globalThis.location;
  globalThis.location = { hash: `#${screenId}` };
  try {
    return render(App, { data, catalog, model, user, identity: user.id, auditLog: [], onSwitch() {}, onDataChange() {}, onAudit() {}, ...props });
  } finally { globalThis.location = previous; }
}

test("unsigned conditions remain proposals in findings and monitoring", () => {
  const findings = renderApp("C12");
  assert.match(findings, /Proposed condition/);
  assert.match(findings, /<strong>0<\/strong><span>Customer-approved conditions<\/span>/);
  assert.doesNotMatch(findings, /<dt>Treatment<\/dt><dd>Customer approval condition<\/dd>/);
  const monitoring = renderApp("C08");
  assert.match(monitoring, /<strong>1<\/strong><span>Prepared proposals<\/span>/);
  assert.match(monitoring, /No customer outcome recorded/);
  assert.match(monitoring, /Prepared proposals are not customer obligations/);
});

test("a selected Atlas finding never defaults to the CedarCloud condition", () => {
  const c = context();
  const finding = c.data.findings.find(row => row.supplier === "Atlas Identity");
  c.state = { ...c.state, selected: finding.engagementId, selectedFinding: finding.id };
  c.engagement = c.data.engagements.find(row => row.id === finding.engagementId);
  const html = render(Findings, c);
  const selectedScope = html.slice(html.indexOf('class="op-selected-scope"'), html.indexOf('<h3 class="op-panel-subheading"'));
  assert.match(selectedScope, /<h3>Atlas Identity<\/h3>/);
  assert.doesNotMatch(selectedScope, /CedarCloud/);
});

test("risk matrix includes the live QA stage and its critical review", () => {
  const c = context();
  c.data = { ...c.data, engagements: c.data.engagements.map(row => row.id === "cedar" ? { ...row, stage: "QA" } : row) };
  assert.match(render(RiskGrid, c), /aria-label="Critical QA: 1 reviews"/);
});

test("assessment and inventory counts follow the current reviewed requirements", () => {
  const c = context();
  c.data = { ...c.data, requirements: c.data.requirements.map(row => row.id === "R-07" ? { ...row, conclusion: "Supported" } : row) };
  c.state = { ...c.state, conclusion: "Supported" };
  assert.match(render(Assessment, c), /3 supported · 1 unknown/);
  assert.doesNotMatch(render(Assessment, c), /10 supported|12 applicable|1 partial/);
  assert.match(render(Inventory, c), /<strong>3<\/strong><b>Requirements supported<\/b>/);
  assert.match(render(Inventory, c), /<strong>0<\/strong><b>Partial coverage<\/b>/);
});

test("closure shows the exact eligible upload instead of an older supplier receipt", () => {
  const c = context();
  c.state = recordDecision(c.state, c.data, "Approve with conditions", "Require newer scoped proof.", { owner: "A. Morgan", due: "2026-11-20", evidence: "Scoped exercise" });
  const signedAt = Date.parse(c.state.decision.at);
  c.state.supplierReceipt = { fileName: "old-supplier.pdf", reference: "OLD", at: new Date(signedAt - 1000).toISOString() };
  c.state.uploads = [{ name: "closure.pdf", version: "UPLOAD-NEW", receivedAt: new Date(signedAt + 1000).toISOString(), requirement: "R-07" }];
  c.state.reviews = { "R-07": { actor: "Analyst 01", conclusion: "Supported", at: new Date(signedAt + 2000).toISOString(), evidenceVersions: ["UPLOAD-NEW"] } };
  const html = render(Closure, c);
  assert.match(html, /closure.pdf/);
  assert.match(html, /UPLOAD-NEW/);
  assert.match(html, /Evidence used for closure/);
  assert.doesNotMatch(html, /old-supplier.pdf/);
});


test("readiness layout names each gate and links the exact outstanding requirement", () => {
  const c = context();
  c.state.pendingReviews = { "R-07": true };
  c.state.conclusion = "Needs review";
  const html = render(Assessment, c);
  assert.match(html, /class="case-gates"/);
  assert.equal((html.match(/class="case-gate /g) || []).length, 4);
  assert.match(html, /Customer decision is paused/);
  assert.match(html, /R-07 · /);
  assert.match(html, /What unblocks the decision/);
});

test("analyst evidence layout exposes support, gap, conclusion meaning and saved status", () => {
  const c = context({ screen: { role: "analyst" }, user: sessionUser(model, "analyst-01") });
  c.state.reviews = { "R-07": { judgement: "Reviewed against the scoped requirement.", conclusion: "Partially supported", recommendation: "Approve with conditions", actor: "Analyst 01", at: "2026-11-06T12:00:00Z" } };
  const html = render(EvidenceReview, c);
  assert.match(html, /evidence-task-grid/);
  assert.match(html, /What this source supports/);
  assert.match(html, /What it does not establish/);
  assert.match(html, /supports only part of this requirement/);
  assert.match(html, /Assessment saved/);
  assert.match(html, /Save and review the next requirement/);
});

test("recorded conditional outcome presents its owner, date and required next obligation", () => {
  const c = context();
  c.state = recordDecision(c.state, c.data, "Approve with conditions", "Proceed with owned follow-up.", { owner: "A. Morgan", due: "2026-11-20", evidence: "New scoped recovery exercise" });
  const html = render(Pack, c);
  assert.match(html, /Decision recorded. Your next obligation is clear/);
  assert.match(html, /New scoped recovery exercise/);
  assert.match(html, /20 Nov 2026/);
  assert.match(html, /View the recovery condition/);
});


test("finding form starts without material defaults and requires an explicit review action", () => {
  const c = context({ user: sessionUser(model, "analyst-01") });
  const html = render(FindingForm, c);
  assert.equal((html.match(/<option value="" selected="">/g) || []).length, 3);
  assert.match(html, /Accountable owner \(required\)[\s\S]*?<input required=""[^>]*value=""/);
  assert.match(html, /Due date \(required\)[\s\S]*?<input type="date" required="" value=""/);
  assert.match(html, />Review finding<\/button>/);
  assert.doesNotMatch(html, />Record finding<\/button>/);
});

test("finding form pins supplier service scope and offers only applicable requirements", () => {
  const c = context({ user: sessionUser(model, "analyst-01") });
  c.data = { ...c.data, requirements: c.data.requirements.filter(row => row.id === "R-07") };
  const html = render(FindingForm, c);
  assert.match(html, /PINNED SERVICE SCOPE/);
  assert.match(html, /<h3>CedarCloud · Payment event processing<\/h3>/);
  assert.match(html, /Northstar Payments/);
  assert.match(html, /<option value="R-07">/);
  assert.doesNotMatch(html, /<option value="IAM-04">/);
});

test("portfolio previews cannot create findings using CedarCloud requirements", () => {
  const c = context({ user: sessionUser(model, "analyst-01") });
  c.engagement = c.data.engagements.find(row => row.supplier === "Atlas Identity");
  const html = render(FindingForm, c);
  assert.match(html, /Atlas Identity/);
  assert.match(html, /no applicable requirement records available for finding creation/);
  assert.doesNotMatch(html, /<form|Review finding|Record finding/);
});


test("customers have no sidebar switcher and Ridgeway renders only its own portfolio", async () => {
  const base = projectWorkspace(model, await readJSON("presentation"), await readJSON("examples"));
  const user = sessionUser(model, "customer-singh");
  const html = renderApp("C01", { data: base, user, identity: user.id });
  assert.doesNotMatch(html, /aria-label="Customer workspace"|class="workspace /);
  assert.match(html, /value="customer-morgan"/);
  assert.match(html, /value="customer-singh" selected=""/);
  assert.match(html, /Ridgeway Finance/);
  assert.match(html, /Clearbridge Data/);
  assert.match(html, /Kite Legal/);
  assert.doesNotMatch(html, /CedarCloud needs your decision|CedarCloud_BCP|Northstar Payments \/ Customer overview/);
});

test("analysts retain the top-bar customer filter and role profiles without sidebar cards", async () => {
  const base = projectWorkspace(model, await readJSON("presentation"), await readJSON("examples"));
  for (const id of ["analyst-01", "analyst-02", "superadmin"]) {
    const user = sessionUser(model, id);
    const html = renderApp(user.role === "superadmin" ? "A01" : "O01", { data: base, user, identity: id });
    assert.doesNotMatch(html, /class="workspace |aria-label="Customer workspace"/);
    assert.match(html, /class="profile"/);
    if (user.role === "analyst") assert.match(html, /aria-label="Customer filter"/);
    else assert.doesNotMatch(html, /aria-label="Customer filter"/);
  }
});
