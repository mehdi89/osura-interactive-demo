import test from "node:test";
import assert from "node:assert/strict";
import { TRIAGE_INDICATORS, unlockedSections, firstMissingTriage, snapshotTriage } from "../src/triage.mjs";
import { calculateRisk, deriveControls } from "../src/controls.mjs";

const all = value => Object.fromEntries(TRIAGE_INDICATORS.map(row => [row.id, value]));

test("triage: all No unlocks nothing; Yes or Unknown unlocks the gated section", () => {
  assert.deepEqual(unlockedSections(all("No")).map(s => s.id), []);
  assert.deepEqual(unlockedSections({ ...all("No"), hasSensitiveDataAccess: "Yes" }).map(s => s.id), ["personal_data", "infosec"]);
  assert.deepEqual(unlockedSections({ ...all("No"), isIPInvolved: "Unknown" }).map(s => s.id), ["ip_security", "infosec"], "Unknown is never treated as No");
  assert.deepEqual(unlockedSections({ ...all("No"), hasNetworkAccess: "Yes" }).map(s => s.id), ["infosec"]);
});

test("triage: required follow-ups block submission; optional text does not; locked answers are dropped", () => {
  const answers = { ...all("No"), isITService: "Yes" };
  assert.match(firstMissingTriage({}, {}).message, /IT services/);
  assert.match(firstMissingTriage(answers, {}).message, /data centre/);
  const followUps = { ps1: "Yes", ps2: "No", is1: "Yes", is2: "Unknown", is3: "Yes", pd1: "No" };
  assert.equal(firstMissingTriage(answers, followUps), null);
  const snap = snapshotTriage(answers, followUps);
  assert.equal(snap.triagedIn, true);
  assert.deepEqual(snap.sections.map(s => s.id), ["physical_security", "infosec"]);
  assert.ok(!JSON.stringify(snap).includes('"pd1"'), "a locked section's stale answer is not submitted");
  assert.throws(() => snapshotTriage({ ...answers, hasSensitiveDataAccess: "Yes" }, followUps), /encrypted at rest/);
});

test("triage drives controls and risk drivers without changing the tier", () => {
  const base = { answers: { 0: "No", 1: "No", 2: "No", 3: "Yes" } };
  const triage = snapshotTriage({ ...all("No"), isITService: "Yes" }, { ps1: "No", ps2: "Yes", is1: "Yes", is2: "Yes", is3: "Yes" });
  assert.deepEqual(deriveControls(base, "Low").map(r => r.controlId), ["CTL-SEC", "CTL-IR"]);
  const withTriage = deriveControls({ ...base, triage }, "Low").map(r => r.controlId);
  assert.ok(["CTL-BCP", "CTL-ACC", "CTL-VUL"].every(id => withTriage.includes(id)));
  const risk = calculateRisk({ ...base, triage });
  assert.equal(risk.tier, calculateRisk(base).tier);
  assert.ok(risk.drivers.some(d => /1 triage follow-up answer/.test(d.input)));
  assert.equal(calculateRisk({ ...base, triage: snapshotTriage({ ...all("No"), isIrreplaceable: "Unknown" }, { is1: "Yes", is2: "Yes", is3: "Yes" }) }).provisional, true);
});
