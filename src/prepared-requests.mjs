import { calculateRisk, registerControlSet, TIERS } from "./controls.mjs";
import { documentFromLibrary, registerDocuments } from "./document-library.mjs";
import { CEDARLINE_DOCUMENTS } from "./cedarline-pack.mjs";
import { effectiveEngagement, requestAssessment, respondAsSupplier, transitionRequest } from "./request-workflow.mjs";

// Bundled examples open their walkthrough case in the same request flow as new requests.
// The record is replayed through the workflow engine, so every gate applies and nothing is hand-built.
// ponytail: seeded in code because scenario packs must start with an empty session; the backend will store these records.
const VARIANTS = { "cedarcloud-reference": "ready", "approved-supplier-example": "approved", "cedarline-manual-v1": "cedarline", "blank-intake-starter": "fresh" };
const FACT_QUESTIONS = [
  "Personal or payment data (triage: sensitive data access)", "Connects to production systems (triage: network or security configuration access)",
  "Outage interrupts a critical journey (triage: precision-dependent operations)", "Replaceable within one business day (triage: not irreplaceable)",
];
const NOTE = { ready: "Prepared example: replayed analyst, QA and supplier actions. Ready for the customer decision.",
  approved: "Prepared example: completed assessment with a signed Approve decision and no open items.",
  cedarline: "Prepared from the supplied Cedarline case: original evidence, supplier answers, corrections, source reviews and findings. The source analyst recommended HOLD and the buyer deferred; neither is imported as a current recommendation or decision." };

export function prepareExampleData(data, model, scenario) {
  const variant = VARIANTS[scenario?.id];
  if (!variant || !data.allEngagements.some(row => row.id === "cedar")) return data;
  const triage = Object.fromEntries((model.triageAnswers || []).filter(a => a.engagementId === "cedar").map(a => [a.questionId, a.value]));
  const yn = value => value === undefined ? "Unknown" : value ? "Yes" : "No";
  const anyOf = (...keys) => keys.every(k => triage[k] === undefined) ? undefined : keys.some(k => triage[k]);
  const answers = { 0: yn(triage.hasSensitiveDataAccess), 1: yn(anyOf("hasNetworkAccess", "hasSecurityConfigAccess")), 2: yn(triage.hasPrecisionReliance), 3: yn(triage.isIrreplaceable === undefined ? undefined : !triage.isIrreplaceable) };
  const bia = Object.fromEntries((model.biaAnswers || []).filter(a => a.engagementId === "cedar").map(a => [a.questionId, a.impact]));
  const businessImpact = Object.keys(bia).length ? { questions: data.biaQuestions.map(q => ({ id: q.id, dimension: q.dimension, label: q.label, answer: bia[q.id] || "Unknown" })) } : null;
  if (variant === "cedarline") {
    registerDocuments(CEDARLINE_DOCUMENTS);
    registerControlSet("cedarline", data.requirements.map(r => ({ id: r.id, family: r.family, name: r.name, expectation: r.expectation, reason: "Supplied Cedarline buyer requirement / supplier question" })));
  }
  const actor = id => model.actors.find(row => row.id === id)?.name || id;
  const convert = row => row.id !== "cedar" ? row : { ...row, receipt: `EXAMPLE-${scenario.id}`.toUpperCase(), answers, questions: FACT_QUESTIONS, businessImpact,
    purpose: row.service, attachments: [], controlSet: variant === "cedarline" ? "cedarline" : undefined, preparedExample: variant };
  return { ...data, allEngagements: data.allEngagements.map(convert), engagements: data.engagements.map(convert),
    preparedExample: { variant, scenario: scenario.id, source: variant === "cedarline" ? scenario.source : null,
      actors: { analyst: actor("osura-analyst-01"), qa: actor("qa-reviewer-02"), customer: actor(data.allEngagements.find(r => r.id === "cedar").decisionOwnerId) } } };
}

export function seedPreparedRequest(data) {
  const meta = data.preparedExample;
  if (!meta || meta.variant === "fresh") return {};
  const engagement = data.allEngagements.find(row => row.id === "cedar");
  const ws = engagement.workspaceId;
  const users = {
    analyst: { id: "analyst-01", actorId: engagement.analystId || "osura-analyst-01", role: "analyst", name: meta.actors.analyst, active: true, canQA: false, workspaceIds: [ws] },
    qa: { id: "analyst-02", actorId: engagement.qaReviewerId || "qa-reviewer-02", role: "analyst", name: meta.actors.qa, active: true, canQA: true, workspaceIds: [ws] },
    customer: { id: "customer-morgan", actorId: engagement.decisionOwnerId, role: "customer", name: meta.actors.customer, active: true, workspaceIds: [ws] },
  };
  let state = { requestAssessments: {}, events: [] };
  const act = (role, action, values) => {
    const context = { ...data, engagements: [engagement], activeEngagementId: "cedar", access: users[role], workspace: data.workspaceProfiles?.[ws] || data.workspace };
    state = { ...state, ...transitionRequest(state, context, "cedar", action, values) };
  };
  const record = () => requestAssessment(state, engagement);
  const docId = libraryId => record().evidence.findLast(row => row.libraryId === libraryId)?.id;
  const addDoc = (libraryId, doesNotProve) => act("analyst", "evidence", { libraryId, notes: `${documentFromLibrary(libraryId).name} reviewed for ${engagement.service}.`, doesNotProve });
  const cite = (controlId, libraryId, page, excerpt, shows) => act("analyst", "cite", { controlId, documentId: docId(libraryId), page, excerpt, shows });
  const conclude = (controlId, conclusion, rationale) => act("analyst", "conclude", { controlId, conclusion, rationale, overrideReason: "Prepared example review of the cited evidence." });
  const scopeIt = (rationale, plan = engagement.plan || "Enhanced v3") => {
    const calculated = calculateRisk(effectiveEngagement(engagement, record())).tier;
    const risk = TIERS.includes(engagement.risk) ? engagement.risk : calculated;
    act("analyst", "scope", { service: engagement.service, risk, plan, rationale,
      overrideReason: risk === calculated ? "" : "Prepared example keeps the case's recorded tier; compare it with the calculated tier and drivers." });
  };

  if (meta.variant === "ready" || meta.variant === "approved") {
    scopeIt(meta.variant === "ready" ? "Prepared example: payment service with sensitive data, production access and no same-day fallback." : "Prepared example: freight tracking holding shipment and customer contact data.");
    const docs = meta.variant === "ready"
      ? ["doc-soc2-2026", "doc-dpa-v3", "doc-ir-v1", "doc-pentest-2026", "doc-bcp-2024"]
      : ["doc-soc2-2026", "doc-dpa-v3", "doc-ir-v1", "doc-pentest-retest-2026", "doc-deletion-test-2026", "doc-bcp-2026"];
    for (const id of docs) addDoc(id, "Operating effectiveness outside the stated period.");
    if (meta.variant === "ready") {
      act("analyst", "claim", { controlId: "CTL-BCP", text: "Recovery is tested every year and service is restored within 1 hour.", rationale: "Supplier questionnaire answer" });
      act("analyst", "askSupplier", { ask: `Please provide for ${engagement.service}:\n- CTL-BCP: a dated technical recovery test meeting the agreed RTO and RPO`, due: "2026-11-30", controlIds: ["CTL-BCP"], consolidated: true });
      const ask = record().supplierAsks.at(-1);
      state = { ...state, ...respondAsSupplier(state, "cedar", ask.id, { libraryId: "doc-bcp-2026", notes: "Failover test of the contracted service, October 2026.", claim: "Failover was tested on 27 October 2026; service was restored in 2 hours." }, { actorId: "supplier-contact", id: "supplier-contact", name: `${engagement.supplier} contact` }) };
      act("analyst", "reviewDocument", { evidenceId: docId("doc-bcp-2026"), doesNotProve: "Recovery of services outside the contracted scope.", rationale: "Dated technical failover test from the supplier response." });
    }
    cite("CTL-SEC", "doc-soc2-2026", 1, "The service in scope is the contracted service and its customer data processing.", "The audit covers the contracted service.");
    cite("CTL-ACC", "doc-soc2-2026", 2, "Privileged access reviews are performed quarterly and evidenced for all four quarters.", "Quarterly privileged access reviews are evidenced.");
    cite("CTL-SUB", "doc-dpa-v3", 2, "Security obligations are flowed down by written contract.", "Subprocessor obligations are contractual.");
    cite("CTL-IR", "doc-ir-v1", 1, "Customers are notified of a confirmed security incident affecting their data within 72 hours.", "A 72-hour notification commitment exists.");
    cite("CTL-BCP", "doc-bcp-2026", 2, "Service was restored in 2 hours, within the 4 hour RTO.", "A dated failover test met the RTO.");
    if (meta.variant === "ready") {
      cite("CTL-DATA", "doc-soc2-2026", 3, "One exception: the annual data deletion test was not performed during the period.", "No deletion test was performed.");
      cite("CTL-VUL", "doc-pentest-2026", 2, "One high severity issue remains open with a target date of 31 January 2027.", "A high severity issue is still open.");
    } else {
      cite("CTL-DATA", "doc-deletion-test-2026", 1, "All test records were deleted and deletion was confirmed in writing.", "A completed deletion test.");
      cite("CTL-VUL", "doc-pentest-retest-2026", 2, "All high severity issues from the June 2026 test are remediated and verified closed as of 15 October 2026.", "High severity issues are closed on retest.");
    }
    const gaps = meta.variant === "ready" ? { "CTL-DATA": "Insufficient", "CTL-VUL": "Insufficient" } : {};
    for (const row of record().controls.filter(c => c.status !== "Removed")) conclude(row.controlId, gaps[row.controlId] || "Supported", `Prepared example: the cited page ${gaps[row.controlId] ? "shows a gap" : "meets the expectation"}.`);
    if (meta.variant === "ready") {
      const lastCite = id => record().citations.findLast(c => c.controlId === id).id;
      act("analyst", "finding", { controlIds: ["CTL-DATA"], issue: "No completed data deletion test for the service", severity: "Medium", severityRationale: "Contractual deletion exists but is untested.", action: "Provide a completed deletion test for the contracted service.", owner: `${engagement.supplier} security lead`, due: "2027-01-31", citationIds: [lastCite("CTL-DATA")] });
      act("analyst", "finding", { controlIds: ["CTL-VUL"], issue: "High severity penetration test issue still open", severity: "High", severityRationale: "Externally exploitable issue on a payment service.", action: "Remediate and provide a retest letter.", owner: `${engagement.supplier} security lead`, due: "2027-01-31", citationIds: [lastCite("CTL-VUL")] });
      act("analyst", "recommend", { outcome: "Approve with conditions", rationale: "Recovery is now evidenced; approve with conditions while the deletion and penetration test findings are remediated." });
      act("qa", "qa", { outcome: "Rework requested", rationale: "The high severity issue needs an explicit treatment.", challenge: "Why is approval appropriate while a high severity issue is open?", challengeControlId: "CTL-VUL" });
      act("analyst", "respondChallenge", { challengeId: record().challenges[0].id, rationale: "The finding has an owner and a January due date; the customer must accept the risk explicitly or reject.", citationId: lastCite("CTL-VUL") });
      act("analyst", "recommend", { outcome: "Approve with conditions", rationale: "Approve with conditions; the customer records a risk acceptance for the two open findings until they close." });
      act("qa", "qa", { outcome: "Passed", rationale: "Prepared example: the challenge is answered and both findings are owned and dated." });
    } else {
      act("analyst", "recommend", { outcome: "Approve", rationale: "Every applied control is supported by current, cited evidence." });
      act("qa", "qa", { outcome: "Passed", rationale: "Prepared example: independently checked every citation against its page." });
      act("customer", "decision", { outcome: "Approve", rationale: "Prepared example: the reviewed evidence meets our needs for this service." });
    }
  }

  if (meta.variant === "cedarline") {
    const src = meta.source;
    const reqId = q => src.idMappings.requirements[q];
    scopeIt("Prepared from the supplied Cedarline case. No CTP triage or impact answers were supplied, so the calculated tier is provisional; complete triage before relying on it.", engagement.plan || "Standard v2");
    for (const e of src.evidence) act("analyst", "evidence", { libraryId: `cl-${e["Evidence ID"].toLowerCase()}`, notes: e["What it supports"], doesNotProve: e["What it does NOT prove"] });
    const corrections = Object.fromEntries(src.supplierCorrections.map(c => [c.questionId, c]));
    for (const a of src.supplierAnswers) {
      act("analyst", "claim", { controlId: reqId(a.ID), text: a["Supplier response"], source: "supplier", rationale: `Original questionnaire answer (${a["Document claimed"]})` });
      if (corrections[a.ID]) act("analyst", "claim", { controlId: reqId(a.ID), text: corrections[a.ID].answer, source: "supplier", rationale: `Supplier correction ${corrections[a.ID].sourceEvidenceId}, ${corrections[a.ID].sourceTimestamp}` });
    }
    const words = s => new Set(s.toLowerCase().match(/[a-z0-9]{4,}/g) || []);
    const STATE = { "Supported (document)": "Supported", "Supported (self-attested)": "Supported", Insufficient: "Insufficient", Contradicted: "Contradicted", Missing: "Missing" };
    for (const r of src.controlReviews) {
      const controlId = reqId(r["Q ID"]);
      for (const ref of new Set(r["Source pointer"].match(/E0\d/g) || [])) {
        const doc = documentFromLibrary(`cl-${ref.toLowerCase()}`);
        const target = words(`${r["Evidence actually shows"]} ${r["Supplier claim"]}`);
        const best = doc.pages[0].match(/[^.]+\./g).map(s => s.trim()).filter(s => s.length > 20 && !/FICTIONAL|TRAINING CASE/.test(s))
          .map(s => [s, [...words(s)].filter(w => target.has(w)).length]).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (best) cite(controlId, doc.id, 1, best, r["Evidence actually shows"]);
      }
      act("analyst", "conclude", { controlId, conclusion: STATE[r.State] || "Missing", rationale: `Source review (${r.Reviewer}): ${r["Reason / limitation"]}`, overrideReason: `Source analyst state: ${r.State}.` });
    }
    for (const f of src.findings) {
      const controlIds = f["Related IDs"].split(",").map(q => reqId(q.trim()));
      const citationIds = record().citations.filter(c => controlIds.includes(c.controlId)).map(c => c.id);
      act("analyst", "finding", { controlIds, issue: f["Assessment issue"], severity: f["Suggested priority"] === "High" ? "High" : f["Suggested priority"] === "Low" ? "Low" : "Medium",
        severityRationale: `Source priority ${f["Suggested priority"]}; ${f.State}.`, action: f["Action requested"], owner: f.Owner, due: f["Target date (suggested)"], citationIds,
        missingRequirement: citationIds.length ? "" : f["Evidence anchors"] });
    }
  }
  const final = { ...record(), preparedExample: { variant: meta.variant, note: NOTE[meta.variant] } };
  return { requestAssessments: { cedar: final } };
}
