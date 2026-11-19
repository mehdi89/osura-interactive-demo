import { actionEntry, requireAction } from "./access.mjs";
import { calculateRisk, CONTROL_CONCLUSIONS, controlById, deriveControls, GAP_CONCLUSIONS, RULES_VERSION, TIERS } from "./controls.mjs";
import { documentFromLibrary, excerptOnPage, isStale } from "./document-library.mjs";

export const OUTCOMES = ["Approve", "Approve with conditions", "Reject", "Return for clarification"];
export const QA_OUTCOMES = ["Passed", "Passed with condition", "Rework requested", "More evidence required"];
export const SEVERITIES = ["High", "Medium", "Low"];
export const SOURCE_TYPES = ["Independent audit report", "Independent test report", "Supplier test report", "Supplier policy", "Contract", "Supplier statement", "Other"];
const labels = {
  clarify: "Assessment clarification requested", respond: "Customer clarification answered", scope: "Assessment scope and inherent risk confirmed",
  addControl: "Control added to scope", removeControl: "Control marked not applicable", evidence: "Assessment document version recorded",
  reviewDocument: "Assessment document reviewed", cite: "Evidence citation recorded", claim: "Supplier claim recorded",
  aiRun: "Simulated AI run recorded", aiDecision: "AI proposal decision recorded", conclude: "Control conclusion recorded",
  finding: "Assessment finding raised", closeFinding: "Assessment finding closed", recommend: "Assessment recommendation recorded",
  qa: "Assessment independent QA recorded", respondChallenge: "QA challenge answered", decision: "Assessment customer decision recorded",
  close: "Assessment condition closed", askSupplier: "Supplier evidence requested", withdrawAsk: "Supplier evidence request withdrawn",
};
// Actions that make someone an author of the analysis; authors cannot perform independent QA (Q1).
const AUTHOR_ACTIONS = ["scope", "addControl", "removeControl", "evidence", "reviewDocument", "cite", "claim", "aiDecision", "conclude", "finding", "recommend", "respondChallenge"];
// Actions still allowed after a signed decision while a condition or finding is open (F3, M2).
const FOLLOW_UP_ACTIONS = ["evidence", "reviewDocument", "cite", "claim", "close", "closeFinding", "askSupplier", "withdrawAsk"];
const text = value => typeof value === "string" ? value.trim() : "";
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const isDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export function requestAssessment(state, engagement) {
  return state.requestAssessments?.[engagement.id] || {
    scope: null, factUpdates: {}, controls: [], clarification: null, customerReturn: null, evidence: [], citations: [], claims: [], aiRuns: [], aiDecisions: [],
    controlReviews: {}, findings: [], recommendation: null, qa: null, challenges: [], decision: null, signedPack: null, conditionClosed: false,
    revision: 0, events: [], supplierAsks: [],
  };
}

// Intake answers with any facts the customer clarified (R1 recompute).
export const effectiveEngagement = (engagement, record) => ({ ...engagement, answers: { ...engagement.answers, ...record.factUpdates } });
export const activeControls = record => (record.controls || []).filter(row => row.status !== "Removed");
const superseded = (record, doc) => record.evidence.some(row => row.replacesId === doc.id);
export const documentQualifiers = (record, doc, at) => [doc.status === "Draft" && "Draft", isStale(doc.date, at) && "Stale", superseded(record, doc) && "Superseded"].filter(Boolean);
const usableCitation = (record, citation) => {
  const doc = record.evidence.find(row => row.id === citation.documentId);
  return doc?.review && citation.verified ? doc : null;
};

// E3: rule-derived control status. Qualifiers (draft/stale/superseded) are never proof; AI4 contradiction wins.
export function derivedControlStatus(record, controlId, at = new Date()) {
  const cites = (record.citations || []).filter(row => row.controlId === controlId && usableCitation(record, row));
  if (!cites.length) return { status: "Missing", why: "No verified citation from a reviewed document." };
  const comparison = [...(record.aiRuns || [])].reverse().find(run => run.task === "compare-claim" && run.controlId === controlId && run.status === "ok");
  if (comparison?.output.verdict === "Contradicts") return { status: "Contradicted", why: comparison.output.reasoning };
  const proof = cites.filter(row => !documentQualifiers(record, usableCitation(record, row), at).length);
  if (!proof.length) return { status: "Insufficient", why: "Only draft, stale or superseded sources are cited." };
  return { status: "Supported", why: `${proof.length} verified citation(s) from current final documents. The analyst judges whether they meet the expectation.` };
}

export const gapControls = record => activeControls(record).filter(row => GAP_CONCLUSIONS.includes(record.controlReviews?.[row.controlId]?.conclusion));
export const openFindings = record => (record.findings || []).filter(row => row.state === "Open");
export const uncoveredGaps = record => gapControls(record).filter(row => !openFindings(record).some(f => f.controlIds.includes(row.controlId)));
export const qaPassed = qa => !!qa?.outcome?.startsWith("Passed");
const followUpOpen = record => (record.decision?.condition && !record.conditionClosed) || openFindings(record).length > 0;

export function requestProgress(record) {
  const progress = (stage, label, nextOwner, step, action) => ({ stage, label, nextOwner, step, action });
  const asks = record.supplierAsks || [];
  if (record.decision && asks.some(ask => ask.status === "Open" && ask.condition) && !record.conditionClosed)
    return progress("Active", "Approved with conditions · waiting for supplier", "Supplier contact", 6, "monitoring");
  if (record.decision) {
    const label = record.decision.outcome === "Reject" ? "Rejected" : record.conditionClosed ? "Condition closed" : record.decision.outcome === "Approve with conditions" ? "Approved with conditions" : "Approved";
    return progress(record.decision.outcome === "Reject" ? "Rejected" : "Active", openFindings(record).length ? `${label} · ${openFindings(record).length} open finding(s)` : label,
      followUpOpen(record) ? "Assigned analyst" : "Customer Decision Owner", 6, "monitoring");
  }
  if (record.clarification && !record.clarification.answer)
    return progress("Scope", "Waiting for customer clarification", "Customer Decision Owner", 1, "clarification");
  if (!record.scope) return progress("Intake", "Awaiting analyst triage", "Assigned analyst", 0, "triage");
  if (asks.some(ask => ask.status === "Open" && !ask.condition)) return progress("Evidence", "Waiting for supplier evidence", "Supplier contact", 2, "evidence");
  if (!record.evidence.length || record.evidence.some(row => !row.review))
    return progress("Evidence", "Document review required", "Assigned analyst", 2, "evidence");
  if (activeControls(record).some(row => !record.controlReviews[row.controlId]))
    return progress("Evidence", "Control conclusions required", "Assigned analyst", 2, "evidence");
  if (uncoveredGaps(record).length) return progress("Findings", "Finding required for each gap", "Assigned analyst", 2, "evidence");
  if ((record.challenges || []).some(row => !row.response)) return progress("Recommendation", "QA challenges awaiting analyst answer", "Assigned analyst", 3, "recommendation");
  if (!record.recommendation || (record.qa && !qaPassed(record.qa)))
    return progress("Recommendation", record.qa || record.customerReturn ? "Analyst revision required" : "Recommendation required", "Assigned analyst", 3, "recommendation");
  if (!record.qa) return progress("QA", "Independent QA required", "Different authorised QA reviewer", 4, "qa");
  return progress("Decision", "Ready for customer decision", "Customer Decision Owner", 5, "decision");
}

export function transitionRequest(state, data, engagementId, action, values = {}) {
  const engagement = data.engagements.find(row => row.id === engagementId);
  if (!engagement?.receipt || data.activeEngagementId !== engagementId)
    throw new Error("Choose the submitted customer assessment before recording an action.");
  if (!labels[action]) throw new Error("Choose a valid assessment action.");
  const user = requireAction(data, ["respond", "decision"].includes(action) ? "decision" : action === "qa" ? "qa" : "recommendation");
  const current = requestAssessment(state, engagement);
  if (current.decision && !FOLLOW_UP_ACTIONS.includes(action))
    throw new Error("This assessment has a signed decision. Its scope, recommendation and decision are frozen.");
  if (current.decision && !followUpOpen(current) && action !== "withdrawAsk")
    throw new Error("There is no open condition or finding for this signed assessment.");
  if (action === "close" && current.conditionClosed) throw new Error("This approval condition is already closed.");
  const record = structuredClone({ ...requestAssessment({}, engagement), ...current });
  record.revision++;
  const rationale = text(values.rationale);
  const event = actionEntry(data, labels[action], rationale, {
    workflowAction: action, assessmentVersion: `${engagement.id}-review-v${record.revision}`,
    evidenceVersions: record.evidence.map(row => ({ id: row.id, file: row.name, version: row.version })),
  });
  const attribution = { actorId: user.actorId, actor: user.name, userId: user.id, role: user.role, at: event.at };
  const invalidate = () => { if (!record.decision) { record.recommendation = null; record.qa = null; } };
  const requireScope = () => { if (!record.scope) throw new Error("Confirm the service scope before continuing."); };
  const control = id => {
    const row = activeControls(record).find(item => item.controlId === id);
    if (!row) throw new Error("Choose a control applied to this assessment.");
    return row;
  };
  const requireReviews = () => {
    requireScope();
    if (!record.evidence.length || record.evidence.some(row => !row.review))
      throw new Error("Record and review every document version before recommending or passing QA.");
    if (activeControls(record).some(row => !record.controlReviews[row.controlId]))
      throw new Error("Conclude every applied control before recommending or passing QA.");
    if (uncoveredGaps(record).length)
      throw new Error(`Raise a finding for every insufficient, contradicted or missing control: ${uncoveredGaps(record).map(row => row.name).join(", ")}.`);
    if (record.clarification && !record.clarification.answer) throw new Error("Wait for the customer clarification before continuing.");
  };

  if (action === "clarify") {
    const question = text(values.question);
    if (!question) throw new Error("Enter the missing information to request from the customer.");
    if (record.clarification && !record.clarification.answer) throw new Error("A customer clarification is already awaiting an answer.");
    record.clarification = { question, answer: null, ...attribution };
    invalidate();
    event.rationale = question;
    event.clarification = structuredClone(record.clarification);
  }
  if (action === "respond") {
    const answer = text(values.answer);
    if (!record.clarification || record.clarification.answer) throw new Error("There is no unanswered clarification for this assessment.");
    if (!answer) throw new Error("Answer the analyst's clarification before submitting.");
    const facts = Object.fromEntries(Object.entries(values.facts || {}).filter(([key, value]) => engagement.answers?.[key] === "Unknown" && ["Yes", "No"].includes(value)));
    record.clarification = { ...record.clarification, answer, facts, response: attribution };
    record.factUpdates = { ...record.factUpdates, ...facts };
    event.rationale = answer;
    event.clarification = structuredClone(record.clarification);
  }
  if (action === "scope") {
    const calculated = calculateRisk(effectiveEngagement(engagement, record));
    const scope = { service: text(values.service), risk: text(values.risk), plan: text(values.plan), rationale, overrideReason: text(values.overrideReason) };
    if (!scope.service || !scope.plan || !rationale || !TIERS.includes(scope.risk))
      throw new Error("Confirm the service, CTP inherent-risk tier, review plan and classification rationale.");
    if (scope.risk !== calculated.tier && !scope.overrideReason)
      throw new Error(`The demo rules calculate ${calculated.tier}. Record why you are overriding it with ${scope.risk}.`);
    if (scope.service !== engagement.service)
      throw new Error("Keep the submitted service scope. A different service requires a new request and fresh business-impact answers.");
    if (record.clarification && !record.clarification.answer) throw new Error("Wait for the customer clarification before confirming scope.");
    if (current.scope && same(scope, Object.fromEntries(Object.keys(scope).map(key => [key, current.scope[key]]))))
      throw new Error("No scope changes to record.");
    record.scope = { ...scope, calculated, ...attribution };
    const manual = record.controls.filter(row => row.source === "manual");
    record.controls = [...deriveControls(effectiveEngagement(engagement, record), scope.risk).filter(row => !manual.some(m => m.controlId === row.controlId)).map(row => {
      const lib = controlById(row.controlId);
      return { id: `ac-${row.controlId}`, ...row, name: lib.name, family: lib.family, expectation: lib.expectation, status: "Applied", ...attribution };
    }), ...manual];
    record.controlReviews = Object.fromEntries(Object.entries(record.controlReviews).filter(([id]) => activeControls(record).some(row => row.controlId === id)));
    invalidate();
    event.scope = structuredClone(record.scope);
    event.controls = structuredClone(record.controls);
  }
  if (action === "addControl") {
    requireScope();
    const lib = controlById(values.controlId);
    if (!lib) throw new Error("Choose a control from the library.");
    if (!rationale) throw new Error("Record why this control applies.");
    const existing = record.controls.find(row => row.controlId === lib.id);
    if (existing && existing.status !== "Removed") throw new Error("This control already applies.");
    record.controls = [...record.controls.filter(row => row.controlId !== lib.id), { id: `ac-${lib.id}`, controlId: lib.id, name: lib.name, family: lib.family, expectation: lib.expectation, source: "manual", ruleId: null, reason: rationale, rulesVersion: RULES_VERSION, status: "Applied", ...attribution }];
    invalidate();
  }
  if (action === "removeControl") {
    const row = control(values.controlId);
    if (!rationale) throw new Error("Justify why the control is not applicable.");
    row.status = "Removed";
    row.removed = { rationale, ...attribution };
    delete record.controlReviews[row.controlId];
    invalidate();
  }
  if (action === "askSupplier") {
    requireScope();
    const ask = { ask: text(values.ask), due: text(values.due), controlIds: (values.controlIds || []).filter(id => activeControls(record).some(row => row.controlId === id)), consolidated: !!values.consolidated };
    if (!ask.ask || !isDate(ask.due)) throw new Error("Describe the evidence you need and set a due date.");
    record.supplierAsks.push({ id: crypto.randomUUID(), ...ask, status: "Open", response: null, ...attribution });
    event.rationale = ask.ask;
  }
  if (action === "withdrawAsk") {
    const ask = record.supplierAsks.find(row => row.id === values.askId && row.status === "Open");
    if (!ask) throw new Error("Choose an open supplier request.");
    if (!rationale) throw new Error("Say why the supplier request is withdrawn.");
    ask.status = "Withdrawn";
    ask.withdrawn = { rationale, ...attribution };
  }
  if (action === "evidence") {
    requireScope();
    const lib = documentFromLibrary(values.libraryId);
    const doc = lib ? { libraryId: lib.id, documentKey: lib.documentKey, name: lib.name, version: lib.version, date: lib.date, sourceType: lib.sourceType, status: lib.status, file: lib.file, pageCount: lib.pages.length }
      : { libraryId: null, documentKey: text(values.name).toLowerCase(), name: text(values.name), version: text(values.version), date: text(values.date), sourceType: text(values.sourceType), status: text(values.status), file: null, pageCount: 0 };
    doc.source = text(values.source) || (lib ? "Synthetic document pack" : "");
    doc.notes = text(values.notes);
    if (!doc.name || !doc.version || !isDate(doc.date) || !SOURCE_TYPES.includes(doc.sourceType) || !["Final", "Draft"].includes(doc.status) || !doc.source || !doc.notes)
      throw new Error("Enter the document, version, date, source type, final or draft status, source and service-coverage notes.");
    if (record.evidence.some(row => row.name === doc.name && row.version === doc.version))
      throw new Error("This document version is already recorded. Use a new version for changed evidence.");
    const replaced = record.evidence.find(row => row.id === values.replacesId) || [...record.evidence].reverse().find(row => row.documentKey === doc.documentKey && (lib?.replacesId ? row.libraryId === lib.replacesId : true));
    record.evidence.push({ ...doc, replacesId: replaced?.id || null, id: crypto.randomUUID(), ...attribution, revision: record.revision, review: values.doesNotProve ? { doesNotProve: text(values.doesNotProve), rationale: doc.notes, ...attribution } : null });
    invalidate();
    event.rationale = doc.notes;
    event.evidence = structuredClone(record.evidence.at(-1));
    event.evidenceVersions = record.evidence.map(row => ({ id: row.id, file: row.name, version: row.version }));
  }
  if (action === "reviewDocument") {
    requireScope();
    const doc = record.evidence.find(row => row.id === values.evidenceId);
    if (!doc) throw new Error("Choose a document version from this assessment.");
    const review = { doesNotProve: text(values.doesNotProve), rationale };
    if (!review.doesNotProve || !rationale) throw new Error("Record what this document does not prove and your review notes.");
    if (doc.review && same(review, { doesNotProve: doc.review.doesNotProve, rationale: doc.review.rationale })) throw new Error("No document review changes to record.");
    doc.review = { ...review, ...attribution };
    invalidate();
    event.review = structuredClone(doc.review);
  }
  if (action === "cite") {
    requireScope();
    const row = control(values.controlId);
    const doc = record.evidence.find(item => item.id === values.documentId);
    if (!doc?.review) throw new Error("Cite a reviewed document version from this assessment.");
    const page = Number(values.page);
    if (!Number.isInteger(page) || page < 1 || (doc.pageCount && page > doc.pageCount)) throw new Error("Enter a page within the document.");
    const citation = { controlId: row.controlId, documentId: doc.id, page, excerpt: text(values.excerpt), shows: text(values.shows) };
    if (!citation.excerpt || !citation.shows) throw new Error("Quote the excerpt and record what it shows.");
    // E2: unverifiable citations are flagged, never presented as verified.
    citation.verified = doc.libraryId ? excerptOnPage(doc.libraryId, page, citation.excerpt) : false;
    if (values.origin === "ai" && !citation.verified) throw new Error("The AI citation does not match the cited page. Edit the excerpt or reject the proposal.");
    record.citations.push({ id: crypto.randomUUID(), ...citation, origin: values.origin === "ai" ? "ai" : "human", runId: values.runId || null, proposal: values.proposal || null, revision: record.revision, ...attribution });
    invalidate();
    event.citation = structuredClone(record.citations.at(-1));
  }
  if (action === "claim") {
    requireScope();
    const row = control(values.controlId);
    const claimText = text(values.text);
    if (!claimText) throw new Error("Enter the supplier's claim.");
    const previous = [...record.claims].reverse().find(item => item.controlId === row.controlId);
    if (previous?.text === claimText) throw new Error("The claim is unchanged.");
    // E4: corrections append a new version; the original is never overwritten.
    record.claims.push({ id: crypto.randomUUID(), controlId: row.controlId, text: claimText, version: (previous?.version || 0) + 1, supersedesId: previous?.id || null, source: values.source === "supplier" ? "supplier" : "analyst-entered", reason: rationale || null, ...attribution });
    invalidate();
    event.claim = structuredClone(record.claims.at(-1));
  }
  if (action === "aiRun") {
    requireScope();
    const run = values.run;
    if (!run?.id || !["evidence-notes", "draft-findings", "compare-claim"].includes(run.task) || !["ok", "abstained", "failed"].includes(run.status)) throw new Error("Record a complete AI run.");
    record.aiRuns.push({ ...structuredClone(run), controlId: values.controlId || null, claimId: values.claimId || null, requestedBy: attribution });
    event.rationale = `${run.task} · ${run.model} · ${run.status}`;
    event.aiRun = { id: run.id, task: run.task, model: run.model, live: run.live, status: run.status };
  }
  if (action === "aiDecision") {
    const run = record.aiRuns.find(row => row.id === values.runId);
    if (!run) throw new Error("Choose a recorded AI run.");
    if (!["accepted", "edited", "rejected"].includes(values.decision)) throw new Error("Accept, edit or reject the proposal.");
    if (values.decision !== "accepted" && !rationale) throw new Error("Record why you edited or rejected the AI proposal.");
    record.aiDecisions.push({ id: crypto.randomUUID(), runId: run.id, index: values.index ?? null, decision: values.decision, original: structuredClone(values.original ?? null), final: structuredClone(values.final ?? null), reason: rationale || null, ...attribution });
    event.aiDecision = structuredClone(record.aiDecisions.at(-1));
  }
  if (action === "conclude") {
    requireScope();
    const row = control(values.controlId);
    if (!CONTROL_CONCLUSIONS.includes(values.conclusion) || !rationale) throw new Error("Select a control conclusion and record your reasoning.");
    const derived = derivedControlStatus(record, row.controlId);
    const aiRun = [...record.aiRuns].reverse().find(run => run.task === "evidence-notes" && run.controlId === row.controlId && run.status === "ok");
    const favourable = CONTROL_CONCLUSIONS.indexOf(values.conclusion) < CONTROL_CONCLUSIONS.indexOf(derived.status) && values.conclusion !== "Not applicable";
    const againstAi = aiRun && aiRun.output.conclusionHint !== values.conclusion;
    const overrideReason = text(values.overrideReason);
    // N1: concluding more favourably than the evidence, or against the AI proposal, needs a reason.
    if ((favourable || againstAi) && !overrideReason)
      throw new Error(`The evidence indicates ${favourable ? derived.status : aiRun.output.conclusionHint}. Record an override reason for ${values.conclusion}.`);
    const previous = record.controlReviews[row.controlId];
    if (previous?.conclusion === values.conclusion && previous?.rationale === rationale) throw new Error("No control conclusion changes to record.");
    record.controlReviews[row.controlId] = { controlId: row.controlId, conclusion: values.conclusion, rationale, derived: derived.status, aiHint: aiRun?.output.conclusionHint || null, aiRunId: aiRun?.id || null,
      overrideReason: overrideReason || null, citationIds: record.citations.filter(c => c.controlId === row.controlId).map(c => c.id), previous: previous || null, ...attribution };
    invalidate();
    event.controlReview = structuredClone(record.controlReviews[row.controlId]);
  }
  if (action === "finding") {
    requireScope();
    const controlIds = [...new Set(values.controlIds || [])];
    if (!controlIds.length) throw new Error("Link the finding to at least one applied control.");
    controlIds.forEach(control);
    const finding = { issue: text(values.issue), severity: text(values.severity), severityRationale: text(values.severityRationale), action: text(values.action), owner: text(values.owner), due: text(values.due),
      citationIds: (values.citationIds || []).filter(id => record.citations.some(c => c.id === id)), missingRequirement: text(values.missingRequirement) };
    if (!finding.issue || !SEVERITIES.includes(finding.severity) || !finding.severityRationale || !finding.action || !finding.owner || !isDate(finding.due))
      throw new Error("A finding needs the issue, severity and its rationale, recommended action, accountable owner and due date.");
    if (!finding.citationIds.length && !finding.missingRequirement) throw new Error("Cite the evidence or state the missing requirement.");
    record.findings.push({ id: `F-${crypto.randomUUID().slice(0, 8)}`, controlIds, ...finding, state: "Open", origin: values.runId ? "ai-draft" : "human", runId: values.runId || null, draft: values.draft || null, revision: record.revision, ...attribution });
    invalidate();
    event.rationale = finding.issue;
    event.finding = structuredClone(record.findings.at(-1));
  }
  if (action === "closeFinding") {
    const finding = record.findings.find(row => row.id === values.findingId && row.state === "Open");
    if (!finding) throw new Error("Choose an open finding.");
    const citation = record.citations.find(row => row.id === values.citationId);
    // F3: only new, verified, reviewed evidence on the finding's control closes it. Risk acceptance is not closure.
    if (!citation || !finding.controlIds.includes(citation.controlId) || !usableCitation(record, citation) || citation.revision <= finding.revision)
      throw new Error("Close a finding with a verified citation, recorded after the finding, from a reviewed document on its control.");
    if (!rationale) throw new Error("Record why the new evidence resolves the finding.");
    finding.state = "Closed";
    finding.closure = { citationId: citation.id, documentId: citation.documentId, rationale, ...attribution };
    event.closure = structuredClone(finding.closure);
  }
  if (action === "recommend") {
    requireReviews();
    if ((record.challenges || []).some(row => !row.response)) throw new Error("Answer every QA challenge before resubmitting.");
    if (!OUTCOMES.includes(values.outcome) || !rationale) throw new Error("Select a recommended outcome and record your reasoning.");
    const previous = record.recommendation || record.customerReturn?.recommendation;
    if (previous?.outcome === values.outcome && previous?.rationale === rationale)
      throw new Error("Revise the recommendation or reasoning before recording it again.");
    record.recommendation = { outcome: values.outcome, rationale, revision: record.revision, openFindingIds: openFindings(record).map(row => row.id), ...attribution };
    record.qa = null;
    event.recommendation = structuredClone(record.recommendation);
  }
  if (action === "qa") {
    requireReviews();
    if (!record.recommendation) throw new Error("Record an analyst recommendation before independent QA.");
    const authors = record.events.filter(row => AUTHOR_ACTIONS.includes(row.workflowAction)).map(row => row.actorId);
    if (authors.includes(user.actorId)) throw new Error("You cannot perform QA on your own analysis. Choose a different assigned reviewer.");
    if (!rationale || !QA_OUTCOMES.includes(values.outcome)) throw new Error("Select a QA outcome and record the independent challenge and rationale.");
    if (record.qa) throw new Error("An analyst must revise the recommendation before another QA review.");
    const condition = text(values.condition);
    if (values.outcome === "Passed with condition" && !condition) throw new Error("State the condition attached to this QA pass.");
    const challenge = text(values.challenge);
    if (!qaPassed({ outcome: values.outcome }) && !challenge) throw new Error("Record the challenge the analyst must answer.");
    if (qaPassed({ outcome: values.outcome }) && record.challenges.some(row => !row.resolved && !row.response)) throw new Error("Every challenge needs an analyst answer before QA can pass.");
    if (qaPassed({ outcome: values.outcome })) record.challenges.forEach(row => { if (!row.resolved) row.resolved = { ...attribution }; });
    if (challenge) record.challenges.push({ id: crypto.randomUUID(), controlId: values.challengeControlId || null, text: challenge, response: null, resolved: null, ...attribution });
    record.qa = { outcome: values.outcome, rationale, condition: condition || null, recommendationRevision: record.recommendation.revision, ...attribution };
    event.qa = structuredClone(record.qa);
  }
  if (action === "respondChallenge") {
    const challenge = record.challenges.find(row => row.id === values.challengeId && !row.response);
    if (!challenge) throw new Error("Choose an unanswered QA challenge.");
    if (!rationale) throw new Error("Answer the challenge with your correction, source and rationale.");
    challenge.response = { rationale, citationId: values.citationId || null, ...attribution };
    event.challenge = structuredClone(challenge);
  }
  if (action === "decision") {
    requireReviews();
    if (!record.recommendation || !qaPassed(record.qa) || record.qa.recommendationRevision !== record.recommendation.revision)
      throw new Error("Current independent QA must pass before the customer decision.");
    if (!OUTCOMES.includes(values.outcome) || !rationale) throw new Error("Select a customer outcome and record the decision rationale.");
    const condition = values.outcome === "Approve with conditions" ? {
      action: text(values.condition?.action) || text(values.condition?.evidence), owner: text(values.condition?.owner), due: text(values.condition?.due), evidence: text(values.condition?.evidence),
    } : null;
    if (condition && (!condition.owner || !condition.evidence || !isDate(condition.due)))
      throw new Error("An approval condition needs an owner, valid due date and required closure evidence.");
    const open = openFindings(record);
    const riskAcceptance = text(values.riskAcceptance);
    // D3: approving while findings are open needs an explicit, recorded risk acceptance.
    if (values.outcome.startsWith("Approve") && open.length && !riskAcceptance)
      throw new Error(`Approving with ${open.length} open finding(s) requires a recorded risk acceptance.`);
    const decision = { outcome: values.outcome, rationale, condition, riskAcceptance: values.outcome.startsWith("Approve") && open.length ? { rationale: riskAcceptance, findingIds: open.map(row => row.id) } : null, revision: record.revision, ...attribution };
    event.decision = structuredClone(decision);
    if (values.outcome === "Return for clarification") {
      record.customerReturn = { ...decision, recommendation: structuredClone(record.recommendation) };
      event.customerReturn = structuredClone(record.customerReturn);
      record.recommendation = null;
      record.qa = null;
    } else {
      record.decision = decision;
      if (condition) record.supplierAsks.push({ id: crypto.randomUUID(), ask: condition.evidence, due: condition.due, controlIds: [], condition: true, status: "Open", response: null, ...attribution });
      const submittedReceipt = (state.extraEngagements || []).find(row => row.id === engagement.id && row.workspaceId === engagement.workspaceId && row.receipt === engagement.receipt) || engagement;
      // D4: frozen snapshot of the actual assessment. Later follow-up never rewrites it.
      record.signedPack = structuredClone({
        version: 2, assessmentVersion: event.assessmentVersion, engagement, submittedReceipt, frozenAt: event.at,
        workspace: data.workspace, policy: data.workspace.policy, overlay: data.workspace.overlay, rulesVersion: RULES_VERSION,
        scope: record.scope, factUpdates: record.factUpdates, controls: record.controls, clarification: record.clarification, customerReturn: record.customerReturn,
        evidence: record.evidence, citations: record.citations, claims: record.claims, aiRuns: record.aiRuns, aiDecisions: record.aiDecisions,
        controlReviews: record.controlReviews, findings: record.findings, challenges: record.challenges,
        recommendation: record.recommendation, qa: record.qa, decision, events: [...record.events, event],
      });
    }
  }
  if (action === "close") {
    if (!record.decision?.condition) throw new Error("There is no signed approval condition to close.");
    if (!rationale) throw new Error("Record the reviewer reasoning before closing the condition.");
    const proof = record.citations.find(row => usableCitation(record, row) && row.revision > record.decision.revision);
    if (!proof) throw new Error("Record and cite reviewed evidence received after the signed decision before closing the condition.");
    record.conditionClosed = true;
    record.closure = { rationale, citationId: proof.id, evidenceId: proof.documentId, ...attribution };
    event.closure = structuredClone(record.closure);
  }
  record.events.push(event);
  return { requestAssessments: { ...state.requestAssessments, [engagementId]: record }, events: [event] };
}

// ponytail: supplier access is invitation-based in this demo, so the supplier response skips customer-assignment checks.
export function respondAsSupplier(state, engagementId, askId, values, supplier = { actorId: "supplier-contact", name: "Supplier contact" }) {
  const current = state.requestAssessments?.[engagementId];
  const ask = current?.supplierAsks?.find(row => row.id === askId);
  if (!ask || ask.status !== "Open") throw new Error("This evidence request is no longer open.");
  const lib = documentFromLibrary(values.libraryId);
  const evidence = lib ? { libraryId: lib.id, documentKey: lib.documentKey, name: lib.name, version: lib.version, date: lib.date, sourceType: lib.sourceType, status: lib.status, file: lib.file, pageCount: lib.pages.length }
    : { libraryId: null, documentKey: text(values.name).toLowerCase(), name: text(values.name), version: text(values.version), date: "", sourceType: "Supplier statement", status: "Final", file: null, pageCount: 0 };
  evidence.notes = text(values.notes);
  if (!evidence.name || !evidence.version || !evidence.notes) throw new Error("Attach a document (or name it and give its version) and say what it covers.");
  const record = structuredClone({ ...requestAssessment({}, { id: engagementId }), ...current });
  record.revision++;
  const at = new Date().toISOString();
  const attribution = { actorId: supplier.actorId, actor: supplier.name, userId: supplier.id || supplier.actorId, role: "supplier", at };
  const replaced = [...record.evidence].reverse().find(row => row.documentKey === evidence.documentKey);
  record.evidence.push({ ...evidence, source: `Supplier portal · ${supplier.name}`, replacesId: replaced?.id || null, review: null, id: crypto.randomUUID(), ...attribution, revision: record.revision, supplierAskId: askId });
  const claimText = text(values.claim);
  const controlId = ask.controlIds?.[0];
  if (claimText && controlId) {
    const previous = [...record.claims].reverse().find(item => item.controlId === controlId);
    record.claims.push({ id: crypto.randomUUID(), controlId, text: claimText, version: (previous?.version || 0) + 1, supersedesId: previous?.id || null, source: "supplier", reason: previous ? "Supplier correction" : null, ...attribution });
  }
  const target = record.supplierAsks.find(row => row.id === askId);
  target.status = "Responded";
  target.response = { ...evidence, claim: claimText || null, ...attribution };
  if (!record.decision) { record.recommendation = null; record.qa = null; }
  const event = { id: crypto.randomUUID(), action: "Supplier evidence submitted", message: "Supplier evidence submitted", rationale: evidence.notes, workflowAction: "supply", engagementId, ...attribution };
  record.events.push(event);
  return { requestAssessments: { ...state.requestAssessments, [engagementId]: record }, events: [event] };
}
