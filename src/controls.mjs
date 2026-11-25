import { summarizeImpact } from "./ctp.mjs";

// R1/R2 demo baseline. Deterministic and transparent; labels and thresholds await Andre's validation.
// ponytail: rules live in code for the demo; the real build loads a published, versioned rule set (A4/A6).
export const RULES_VERSION = "CTP demo rules v0 · synthetic, pending methodology validation";
export const TIERS = ["Low", "Medium", "High", "Critical"];
export const CONTROL_CONCLUSIONS = ["Supported", "Insufficient", "Contradicted", "Missing", "Not applicable"];
export const GAP_CONCLUSIONS = ["Insufficient", "Contradicted", "Missing"];

// Control library (separate from the rules that apply it). Keywords drive the simulated AI.
export const CONTROL_LIBRARY = [
  { id: "CTL-SEC", family: "Security assurance", name: "Independent security assurance", expectation: "Current SOC 2 Type II report or ISO 27001 certificate covering the contracted service", keywords: ["SOC 2", "service in scope", "carved out", "Auditor"] },
  { id: "CTL-ACC", family: "Access control", name: "Privileged access management", expectation: "MFA for administrative access and evidenced periodic privileged access reviews", keywords: ["Multi-factor", "Privileged access", "administrative access"] },
  { id: "CTL-DATA", family: "Data protection", name: "Data protection and deletion", expectation: "Contractual deletion commitment and a completed deletion test", keywords: ["deleted", "deletion", "personal data"] },
  { id: "CTL-SUB", family: "Supply chain", name: "Subprocessor management", expectation: "Subprocessor list with security obligations flowed down", keywords: ["subprocessor", "Subprocessors", "flowed down"] },
  { id: "CTL-BCP", family: "Resilience", name: "Business continuity and recovery testing", expectation: "A dated technical recovery test meeting the agreed RTO and RPO", keywords: ["RTO", "RPO", "failover", "restored", "continuity exercise"] },
  { id: "CTL-IR", family: "Incident management", name: "Incident response and notification", expectation: "Incident response plan with a customer notification commitment", keywords: ["notified", "incident", "Incidents", "post-incident"] },
  { id: "CTL-VUL", family: "Vulnerability management", name: "Penetration testing and remediation", expectation: "Penetration test within 12 months with high severity issues remediated", keywords: ["Penetration", "high severity", "remediated"] },
];
// Scenario control sets (e.g. Cedarline's supplied buyer requirements) replace the generic rules for that case.
// ponytail: module-level registry for bundled examples; the backend stores published control sets per framework.
const CONTROL_SETS = {};
const keywordsFor = row => [...new Set(`${row.name} ${row.expectation}`.split(/[^A-Za-z0-9]+/).filter(w => w.length > 4))].slice(0, 8);
export const registerControlSet = (name, controls) => { CONTROL_SETS[name] = controls.map(row => ({ ...row, keywords: row.keywords || keywordsFor(row) })); };
export const controlById = id => CONTROL_LIBRARY.find(row => row.id === id) || Object.values(CONTROL_SETS).flat().find(row => row.id === id);

// Intake context facts (index into engagement.answers) → named facts.
const fact = (engagement, index) => engagement.answers?.[index] || "Unknown";
export const contextFacts = engagement => ({
  sensitiveData: fact(engagement, 0), production: fact(engagement, 1), criticalJourney: fact(engagement, 2), replaceable: fact(engagement, 3),
  unlocked: engagement.triage?.sections?.map(section => section.id) || [],
});

export const RULES = [
  { id: "R-BASE", description: "Every in-scope supplier service", controls: ["CTL-SEC", "CTL-IR"], when: () => true, why: () => "Applies to every in-scope supplier service" },
  { id: "R-DATA", description: "Personal or payment data is not No", controls: ["CTL-DATA", "CTL-SUB"], when: (f) => f.sensitiveData !== "No", why: (f) => `Personal or payment data: ${f.sensitiveData}` },
  { id: "R-PROD", description: "Connects to production systems is not No, or tier High or above", controls: ["CTL-ACC", "CTL-VUL"], when: (f, tier) => f.production !== "No" || TIERS.indexOf(tier) >= 2, why: (f, tier) => f.production !== "No" ? `Connects to production systems: ${f.production}` : `${tier} inherent risk` },
  { id: "R-AVAIL", description: "Critical journey is not No, not replaceable within a day, or tier High or above", controls: ["CTL-BCP"], when: (f, tier) => f.criticalJourney !== "No" || f.replaceable !== "Yes" || TIERS.indexOf(tier) >= 2, why: (f) => `Critical journey: ${f.criticalJourney}; replaceable within a day: ${f.replaceable}` },
  { id: "R-TRIAGE-DATA", description: "Triage unlocked personal data protection", controls: ["CTL-DATA", "CTL-SUB"], when: (f) => f.unlocked.includes("personal_data"), why: () => "Triage: access to sensitive data is Yes or Unknown" },
  { id: "R-TRIAGE-IP", description: "Triage unlocked intellectual property", controls: ["CTL-ACC"], when: (f) => f.unlocked.includes("ip_security"), why: () => "Triage: intellectual property involvement is Yes or Unknown" },
  { id: "R-TRIAGE-PHYS", description: "Triage unlocked physical security", controls: ["CTL-BCP"], when: (f) => f.unlocked.includes("physical_security"), why: () => "Triage: IT services is Yes or Unknown" },
  { id: "R-TRIAGE-SEC", description: "Triage unlocked information security", controls: ["CTL-ACC", "CTL-VUL", "CTL-IR"], when: (f) => f.unlocked.includes("infosec"), why: () => "Triage: at least one indicator is Yes or Unknown" },
];

// R1: inherent risk from the submitted answers, with the inputs that drove it. Unknown is never treated as low.
export function calculateRisk(engagement) {
  const questions = engagement.businessImpact?.questions || [];
  const answers = Object.fromEntries(questions.map(q => [q.id, q.answer]));
  const known = Object.fromEntries(Object.entries(answers).map(([id, a]) => [id, a === "Unknown" ? "High" : a]));
  const impact = questions.length ? summarizeImpact(questions, known) : { score: null, label: "Not answered" };
  const facts = contextFacts(engagement);
  const drivers = [];
  let tier = impact.score === 5 ? "High" : impact.score === 3 ? "Medium" : "Low";
  const highs = questions.filter(q => q.answer === "High");
  if (highs.length) drivers.push({ input: `${highs.length} impact answer(s) High`, detail: highs.slice(0, 3).map(q => q.label).join("; "), effect: "Base impact High" });
  const unknownImpact = questions.filter(q => q.answer === "Unknown");
  if (unknownImpact.length) drivers.push({ input: `${unknownImpact.length} impact answer(s) Unknown`, detail: unknownImpact.slice(0, 3).map(q => q.label).join("; "), effect: "Scored as High until confirmed" });
  const raise = (to, input, effect) => { if (TIERS.indexOf(to) > TIERS.indexOf(tier)) tier = to; drivers.push({ input, effect }); };
  if (facts.sensitiveData === "Yes") raise("High", "Personal or payment data: Yes", "At least High");
  if (facts.criticalJourney === "Yes" && facts.replaceable === "No" && tier === "High") raise("Critical", "Critical journey and not replaceable within a day", "Raised to Critical");
  const triage = engagement.triage;
  const unknownTriage = triage?.indicators.filter(row => row.answer === "Unknown") || [];
  if (triage) {
    const unlocked = triage.indicators.filter(row => row.answer !== "No");
    drivers.push({ input: `Triage: ${unlocked.length} of ${triage.indicators.length} indicators Yes or Unknown`, detail: triage.sections.map(s => s.title).join("; ") || "No follow-up sections", effect: triage.sections.length ? "Follow-up sections and their controls added" : "No follow-up sections" });
    const gaps = triage.sections.flatMap(s => s.questions).filter(q => q.type !== "text" && q.answer !== "Yes");
    if (gaps.length) drivers.push({ input: `${gaps.length} triage follow-up answer(s) No or Unknown`, detail: gaps.slice(0, 3).map(q => q.text).join("; "), effect: "Analyst verifies against evidence" });
    if (unknownTriage.length) drivers.push({ input: `Unknown triage indicators: ${unknownTriage.map(row => row.label).join(", ")}`, effect: "Provisional until clarified" });
  }
  const unknownFacts = Object.entries(facts).filter(([, v]) => v === "Unknown").map(([k]) => k);
  if (unknownFacts.length) drivers.push({ input: `Unknown context facts: ${unknownFacts.join(", ")}`, effect: "Provisional until clarified" });
  return { tier, provisional: unknownFacts.length > 0 || unknownImpact.length > 0 || unknownTriage.length > 0, baseImpact: impact.label, drivers, rulesVersion: RULES_VERSION };
}

// R2: controls applied from the rating and facts, each with its rule and reason.
export function deriveControls(engagement, tier) {
  if (engagement.controlSet && CONTROL_SETS[engagement.controlSet])
    return CONTROL_SETS[engagement.controlSet].map(row => ({ controlId: row.id, source: "rule", ruleId: `SET-${engagement.controlSet}`, reason: row.reason || "Supplied buyer requirement for this case", rulesVersion: RULES_VERSION }));
  const facts = contextFacts(engagement);
  const applied = new Map();
  for (const rule of RULES) if (rule.when(facts, tier))
    for (const controlId of rule.controls) if (!applied.has(controlId))
      applied.set(controlId, { controlId, source: "rule", ruleId: rule.id, reason: rule.why(facts, tier), rulesVersion: RULES_VERSION });
  return [...applied.values()];
}
