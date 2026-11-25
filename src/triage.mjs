// Service triage indicators, ported from compliance-triage-pro (DEFAULT_TRIAGE_QUESTIONS and DEFAULT_SECTIONS).
// Yes or Unknown unlocks a follow-up section: Unknown is never treated as No.
// ponytail: questions live in code for the demo; the backend loads them from the published CTP policy version.
export const TRIAGE_CHOICES = ["Yes", "No", "Unknown"];
export const FOLLOW_UP_CHOICES = ["Yes", "No", "Unknown"];
export const TRIAGE_SOURCE = "compliance-triage-pro · Service Triage Indicators and questionnaire sections";

export const TRIAGE_INDICATORS = [
  { id: "isITService", label: "IT services", question: "Will the supplier provide IT services?", hint: "Software development, cloud hosting, infrastructure maintenance or IT support desk functions." },
  { id: "isIPInvolved", label: "Intellectual property involvement", question: "Will the supplier receive or create intellectual property?", hint: "Patent applications, proprietary algorithms, design schematics or sensitive marketing strategies." },
  { id: "isIndirectIPAccess", label: "Indirect intellectual property access", question: "Will the supplier have indirect access to areas where intellectual property is processed?", hint: "For example facilities maintenance in R&D labs, or administrative staff near classified project areas." },
  { id: "isIrreplaceable", label: "Market substitutability", question: "Is the supplier irreplaceable in the market?", hint: "A monopoly, or a unique patent that makes switching supplier prohibitively difficult or impossible." },
  { id: "hasPrecisionReliance", label: "Precision reliance", question: "Do you rely heavily on the accuracy or precision of this service?", hint: "Calibration of laboratory equipment, complex payroll processing or financial audit services." },
  { id: "hasNetworkAccess", label: "Network access", question: "Will the supplier have access to your physical premises or networks?", hint: "VPN credentials, physical key fobs, remote desktop or on-site hardware access." },
  { id: "hasSensitiveDataAccess", label: "Access to sensitive data", question: "Will the supplier access sensitive data, for example personal data?", hint: "GDPR-protected information, HR records, health data or customer financial details." },
  { id: "hasSecurityConfigAccess", label: "Access to security configuration", question: "Will the supplier access security information?", hint: "Firewall logs, encryption keys, server hardening guides or physical security blueprints." },
];

export const inScope = answer => answer === "Yes" || answer === "Unknown";
const anyInScope = answers => TRIAGE_INDICATORS.some(row => inScope(answers[row.id]));

export const TRIAGE_SECTIONS = [
  { id: "personal_data", title: "Personal data protection", unlockedBy: "Access to sensitive data", unlocked: a => inScope(a.hasSensitiveDataAccess), questions: [
    { id: "pd1", text: "Has the supplier appointed a Data Protection Officer (DPO)?" },
    { id: "pd2", text: "Is personal data encrypted at rest?" },
    { id: "pd3", text: "Is personal data encrypted in transit (TLS 1.2+)?" },
  ] },
  { id: "ip_security", title: "Intellectual property", unlockedBy: "Intellectual property involvement", unlocked: a => inScope(a.isIPInvolved), questions: [
    { id: "ip1", text: "Is your intellectual property logically or physically segregated from other clients?" },
    { id: "ip2", text: "Are detailed background checks performed on staff with access to intellectual property?" },
  ] },
  { id: "physical_security", title: "Physical security", unlockedBy: "IT services", unlocked: a => inScope(a.isITService), questions: [
    { id: "ps1", text: "Is the data centre ISO 27001 or SOC 2 Type II certified?" },
    { id: "ps2", text: "Is 24/7 CCTV monitoring in place at all access points?" },
  ] },
  // ponytail: in the source app this section is always shown; here it opens once any indicator is in scope (the source's "BIA triggered").
  { id: "infosec", title: "Information security", unlockedBy: "Any indicator Yes or Unknown", unlocked: anyInScope, questions: [
    { id: "is1", text: "Is multi-factor authentication (MFA) mandatory for all administrative access?" },
    { id: "is2", text: "Are regular penetration tests or vulnerability scans performed?" },
    { id: "is3", text: "Is there a formal security incident response plan in place?" },
    { id: "is4", text: "Key fourth-party subcontractors or sub-processors used to deliver the service", type: "text", optional: true },
    { id: "is5", text: "Subcontractors that will handle sensitive data or materials such as IP, confidential or personal information", type: "text", optional: true },
  ] },
];

export const unlockedSections = (answers = {}) => TRIAGE_SECTIONS.filter(section => section.unlocked(answers));

// First unanswered indicator or required follow-up, as { id, message }.
export function firstMissingTriage(answers = {}, followUps = {}) {
  const indicator = TRIAGE_INDICATORS.find(row => !TRIAGE_CHOICES.includes(answers[row.id]));
  if (indicator) return { id: `triage-${indicator.id}`, message: `Answer the triage indicator: ${indicator.question} Unknown is a valid answer.` };
  for (const section of unlockedSections(answers)) {
    const question = section.questions.find(q => !q.optional && !FOLLOW_UP_CHOICES.includes(followUps[q.id]));
    if (question) return { id: `triage-${question.id}`, message: `Answer the ${section.title.toLowerCase()} question: ${question.text} Unknown is a valid answer.` };
  }
  return null;
}

// Submitted snapshot: wording is copied so later question edits cannot rewrite a receipt. Locked sections are not stored.
export function snapshotTriage(answers = {}, followUps = {}) {
  const missing = firstMissingTriage(answers, followUps);
  if (missing) throw new Error(missing.message);
  return {
    source: TRIAGE_SOURCE,
    indicators: TRIAGE_INDICATORS.map(({ id, label, question }) => ({ id, label, question, answer: answers[id] })),
    triagedIn: anyInScope(answers),
    sections: unlockedSections(answers).map(({ id, title, unlockedBy, questions }) => ({ id, title, unlockedBy,
      questions: questions.map(({ id: qid, text, type }) => ({ id: qid, text, type: type || "choice", answer: String(followUps[qid] ?? "").trim() })) })),
  };
}
