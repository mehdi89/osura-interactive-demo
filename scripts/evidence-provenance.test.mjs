import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { build } from "esbuild";

const source = await readFile(new URL("../src/main.jsx", import.meta.url), "utf8");
const bundled = await build({
  stdin: { contents: source.slice(0, source.lastIndexOf("Promise.all(")) + "\nexport { projectRequirementEvidence };", resolveDir: new URL("../src", import.meta.url).pathname, loader: "jsx" },
  bundle: true, platform: "node", format: "cjs", packages: "external", loader: { ".css": "empty" }, write: false,
});
const module = { exports: {} };
new Function("require", "module", "exports", bundled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { projectRequirementEvidence } = module.exports;
const requirement = { id: "R-07", source: "Original.pdf · v1", passage: "Prepared fixture passage", conclusion: "Partially supported" };
const data = { request: { items: ["Recovery evidence", "Access evidence"] }, documents: [{ name: "Original.pdf", version: "v1", requirement: "R-07", date: "2026-10-30" }] };
const upload = { name: "same.pdf", version: "upload-01", receivedAt: "2026-11-06T10:00:00Z", requirement: "R-07" };
const receipt = { fileName: "same.pdf", reference: "RECEIPT-02", at: "2026-11-06T11:00:00Z", answer: "New service-scoped exercise answer" };

test("newer supplier receipt wins equal filenames coherently across source and passage", () => {
  const projected = projectRequirementEvidence(requirement, { uploads: [upload], supplierReceipts: { "Recovery evidence": receipt } }, data);
  assert.equal(projected.passage, receipt.answer);
  assert.equal(projected.sourceDocument.name, receipt.fileName);
  assert.equal(projected.sourceDocument.version, receipt.reference);
  assert.equal(projected.sourceDocument.date, receipt.at);
  assert.match(projected.source, /RECEIPT-02/);
  assert.doesNotMatch(projected.source, /upload-01/);
  assert.match(projected.proves, /Supplier claim/);
});

test("newer metadata upload replaces supplier passage even with the same filename", () => {
  const laterUpload = { ...upload, receivedAt: "2026-11-06T12:00:00Z" };
  const projected = projectRequirementEvidence(requirement, { uploads: [laterUpload], supplierReceipts: { "Recovery evidence": receipt } }, data);
  assert.equal(projected.sourceDocument.version, upload.version);
  assert.equal(projected.sourceDocument.date, laterUpload.receivedAt);
  assert.match(projected.source, /upload-01/);
  assert.match(projected.passage, /Only file metadata/);
  assert.doesNotMatch(projected.passage, /New service-scoped exercise answer/);
});

test("latest source follows received time and requirement, independently of upload order", () => {
  const newest = { ...upload, name: "new.pdf", version: "newest", receivedAt: "2026-11-06T13:00:00Z" };
  const unrelated = { ...newest, name: "access.pdf", version: "wrong-scope", requirement: "IAM-04", receivedAt: "2026-11-06T14:00:00Z" };
  const projected = projectRequirementEvidence(requirement, { uploads: [newest, unrelated, upload], pendingReviews: { "R-07": true } }, data);
  assert.equal(projected.sourceDocument.version, "newest");
  assert.equal(projected.sourceDocument.name, "new.pdf");
  assert.equal(projected.conclusion, "Needs review");
});

test("untouched requirements retain their prepared source and provenance", () => {
  const projected = projectRequirementEvidence(requirement, {}, data);
  assert.equal(projected.source, requirement.source);
  assert.equal(projected.passage, requirement.passage);
  assert.equal(projected.sourceDocument.version, "v1");
});
