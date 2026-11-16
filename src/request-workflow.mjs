import { actionEntry, requireAction } from "./access.mjs";

const outcomes = ["Approve", "Approve with conditions", "Reject", "Return for clarification"];
const conclusions = ["Supported", "Partially supported", "Unknown", "Contradictory", "Out of scope"];
const labels = {
  clarify: "Assessment clarification requested", respond: "Customer clarification answered", scope: "Assessment scope confirmed",
  evidence: "Assessment evidence version recorded", review: "Assessment evidence reviewed", recommend: "Assessment recommendation recorded",
  qa: "Assessment QA review recorded", decision: "Assessment customer decision recorded", close: "Assessment condition closed", askSupplier: "Supplier evidence requested", withdrawAsk: "Supplier evidence request withdrawn", finding: "Assessment finding raised",
};
const text = value => typeof value === "string" ? value.trim() : "";
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export function requestAssessment(state, engagement) {
  return state.requestAssessments?.[engagement.id] || {
    scope: null, clarification: null, customerReturn: null, evidence: [], reviews: {}, recommendation: null, qa: null,
    decision: null, signedPack: null, conditionClosed: false, revision: 0, events: [], supplierAsks: [], findings: [],
  };
}

export function requestProgress(record) {
  const progress = (stage, label, nextOwner, step, action) => ({ stage, label, nextOwner, step, action });
  const supplierWaiting = (record.supplierAsks || []).some(ask => ask.status === "Open" && !ask.condition);
  if (record.decision && (record.supplierAsks || []).some(ask => ask.status === "Open" && ask.condition) && !record.conditionClosed)
    return progress("Active", "Approved with conditions · waiting for supplier", "Supplier contact", 6, "monitoring");
  if (record.decision) return progress(record.decision.outcome === "Reject" ? "Rejected" : "Active",
    record.decision.outcome === "Reject" ? "Rejected" : record.conditionClosed ? "Condition closed" : record.decision.outcome === "Approve with conditions" ? "Approved with conditions" : "Approved",
    record.conditionClosed || !record.decision.condition ? "Customer Decision Owner" : "Assigned analyst", 6, "monitoring");
  if (record.clarification && !record.clarification.answer)
    return progress("Scope", "Waiting for customer clarification", "Customer Decision Owner", 1, "clarification");
  if (!record.scope) return progress("Intake", "Awaiting analyst triage", "Assigned analyst", 0, "triage");
  if (supplierWaiting) return progress("Evidence", "Waiting for supplier evidence", "Supplier contact", 2, "evidence");
  if (!record.evidence.length || record.evidence.some(row => !record.reviews[row.id]))
    return progress("Evidence", "Evidence review required", "Assigned analyst", 2, "evidence");
  if (!record.recommendation || (record.qa && record.qa.outcome !== "Passed"))
    return progress("Recommendation", record.qa || record.customerReturn ? "Analyst revision required" : "Recommendation required", "Assigned analyst", 3, "recommendation");
  if (!record.qa) return progress("QA", "QA review required", "Assigned analyst", 4, "qa");
  return progress("Decision", "Ready for customer decision", "Customer Decision Owner", 5, "decision");
}

export function transitionRequest(state, data, engagementId, action, values = {}) {
  const engagement = data.engagements.find(row => row.id === engagementId);
  if (!engagement?.receipt || data.activeEngagementId !== engagementId)
    throw new Error("Choose the submitted customer assessment before recording an action.");
  if (!labels[action]) throw new Error("Choose a valid assessment action.");
  const user = requireAction(data, ["respond", "decision"].includes(action) ? "decision" : "recommendation");
  const current = requestAssessment(state, engagement);
  if (current.decision && !["evidence", "review", "close", "askSupplier", "withdrawAsk"].includes(action))
    throw new Error("This assessment has a signed decision. Its scope, recommendation and decision are frozen.");
  if (current.decision && !current.decision.condition && ["evidence", "review", "close", "askSupplier"].includes(action))
    throw new Error("There is no open approval condition for this signed assessment.");
  if (current.conditionClosed) throw new Error("This approval condition is already closed.");
  const record = structuredClone(current);
  record.supplierAsks ||= [];
  record.findings ||= [];
  record.revision++;
  const rationale = text(values.rationale);
  const event = actionEntry(data, labels[action], rationale, {
    workflowAction: action, assessmentVersion: `${engagement.id}-review-v${record.revision}`,
    evidenceVersions: record.evidence.map(row => ({ id: row.id, file: row.name, version: row.version })),
  });
  const attribution = { actorId: user.actorId, actor: user.name, userId: user.id, role: user.role, at: event.at };
  const invalidate = () => { if (!record.decision) { record.recommendation = null; record.qa = null; } };
  const requireScope = () => { if (!record.scope) throw new Error("Confirm the service scope before continuing."); };
  const requireReviews = () => {
    requireScope();
    if (!record.evidence.length || record.evidence.some(row => !record.reviews[row.id]))
      throw new Error("Record and review every evidence version before recommending or passing QA.");
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
    record.clarification = { ...record.clarification, answer, response: attribution };
    event.rationale = answer;
    event.clarification = structuredClone(record.clarification);
  }
  if (action === "scope") {
    const scope = { service: text(values.service), risk: text(values.risk), plan: text(values.plan), rationale };
    if (!scope.service || !scope.plan || !rationale || !["Critical", "High", "Medium", "Low"].includes(scope.risk))
      throw new Error("Confirm the service, approved CTP inherent-risk tier, review plan and classification rationale.");
    if (scope.service !== engagement.service)
      throw new Error("Keep the submitted service scope. A different service requires a new request and fresh business-impact answers.");
    if (record.clarification && !record.clarification.answer) throw new Error("Wait for the customer clarification before confirming scope.");
    if (current.scope && same(scope, Object.fromEntries(Object.keys(scope).map(key => [key, current.scope[key]]))))
      throw new Error("No scope changes to record.");
    record.scope = { ...scope, ...attribution };
    record.reviews = {};
    invalidate();
    event.scope = structuredClone(record.scope);
  }
  if (action === "askSupplier") {
    requireScope();
    const ask = { ask: text(values.ask), due: text(values.due) };
    if (!ask.ask || !/^\d{4}-\d{2}-\d{2}$/.test(ask.due)) throw new Error("Describe the evidence you need and set a due date.");
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
  if (action === "finding") {
    requireScope();
    const evidence = record.evidence.find(row => row.id === values.evidenceId);
    if (!evidence || !["Partially supported", "Contradictory"].includes(record.reviews[evidence.id]?.conclusion))
      throw new Error("Raise a finding from a source reviewed as Partially supported or Contradictory.");
    const finding = { issue: text(values.issue), severity: text(values.severity), owner: text(values.owner), due: text(values.due), closure: text(values.closure) };
    if (!finding.issue || !finding.owner || !finding.closure || !["High", "Medium", "Low"].includes(finding.severity) || !/^\d{4}-\d{2}-\d{2}$/.test(finding.due))
      throw new Error("A finding needs the unresolved issue, severity, accountable owner, due date and closure evidence.");
    record.findings.push({ id: `F-${crypto.randomUUID().slice(0, 8)}`, evidenceId: evidence.id, source: `${evidence.name} · ${evidence.version}`, conclusion: record.reviews[evidence.id].conclusion, ...finding, state: "Open", ...attribution });
    invalidate();
    event.rationale = finding.issue;
    event.finding = structuredClone(record.findings.at(-1));
  }
  if (action === "evidence") {
    requireScope();
    const evidence = { name: text(values.name), source: text(values.source), version: text(values.version), notes: text(values.notes) };
    if (!evidence.name || !evidence.source || !evidence.version || !evidence.notes)
      throw new Error("Enter the evidence name, source, version and service-coverage notes.");
    if (record.evidence.some(row => row.name === evidence.name && row.version === evidence.version))
      throw new Error("This evidence version is already recorded. Use a new version for changed evidence.");
    record.evidence.push({ ...evidence, id: crypto.randomUUID(), ...attribution, revision: record.revision });
    invalidate();
    event.rationale = evidence.notes;
    event.evidence = structuredClone(record.evidence.at(-1));
    event.evidenceVersions = record.evidence.map(row => ({ id: row.id, file: row.name, version: row.version }));
  }
  if (action === "review") {
    requireScope();
    const evidence = record.evidence.find(row => row.id === values.evidenceId);
    if (!evidence) throw new Error("Choose an evidence version from this assessment.");
    if (!conclusions.includes(values.conclusion) || !rationale) throw new Error("Select an evidence conclusion and record your reasoning.");
    if (record.reviews[evidence.id]?.conclusion === values.conclusion && record.reviews[evidence.id]?.rationale === rationale)
      throw new Error("No evidence review changes to record.");
    record.reviews[evidence.id] = { evidenceId: evidence.id, version: evidence.version, conclusion: values.conclusion, rationale, ...attribution };
    invalidate();
    event.review = structuredClone(record.reviews[evidence.id]);
  }
  if (action === "recommend") {
    requireReviews();
    if (!outcomes.includes(values.outcome) || !rationale) throw new Error("Select a recommended outcome and record your reasoning.");
    const previous = record.recommendation || record.customerReturn?.recommendation;
    if (previous?.outcome === values.outcome && previous?.rationale === rationale)
      throw new Error("Revise the recommendation or reasoning before recording it again.");
    record.recommendation = { outcome: values.outcome, rationale, revision: record.revision, ...attribution };
    record.qa = null;
    event.recommendation = structuredClone(record.recommendation);
  }
  if (action === "qa") {
    requireReviews();
    if (!record.recommendation) throw new Error("Record an analyst recommendation before QA review.");
    // ponytail: same-analyst QA allowed for now (client call); restore the author check for independent QA.
    if (!rationale || !["Passed", "Rework requested", "More evidence required"].includes(values.outcome))
      throw new Error("Select a QA outcome and record what you checked.");
    if (record.qa) throw new Error("An analyst must revise the recommendation before another QA review.");
    record.qa = { outcome: values.outcome, rationale, recommendationRevision: record.recommendation.revision, ...attribution };
    event.qa = structuredClone(record.qa);
  }
  if (action === "decision") {
    requireReviews();
    if (!record.recommendation || record.qa?.outcome !== "Passed" || record.qa.recommendationRevision !== record.recommendation.revision)
      throw new Error("Current QA must pass before the customer decision.");
    if (!outcomes.includes(values.outcome) || !rationale) throw new Error("Select a customer outcome and record the decision rationale.");
    const condition = values.outcome === "Approve with conditions" ? {
      owner: text(values.condition?.owner), due: text(values.condition?.due), evidence: text(values.condition?.evidence),
    } : null;
    if (condition && (!condition.owner || !condition.evidence || !/^\d{4}-\d{2}-\d{2}$/.test(condition.due) || Number.isNaN(Date.parse(condition.due)) || new Date(condition.due).toISOString().slice(0, 10) !== condition.due))
      throw new Error("An approval condition needs an owner, valid due date and required closure evidence.");
    const decision = { outcome: values.outcome, rationale, condition, revision: record.revision, ...attribution };
    event.decision = structuredClone(decision);
    if (values.outcome === "Return for clarification") {
      record.customerReturn = { ...decision, recommendation: structuredClone(record.recommendation) };
      event.customerReturn = structuredClone(record.customerReturn);
      record.recommendation = null;
      record.qa = null;
    } else {
      record.decision = decision;
      if (condition) record.supplierAsks.push({ id: crypto.randomUUID(), ask: condition.evidence, due: condition.due, condition: true, status: "Open", response: null, ...attribution });
      const submittedReceipt = (state.extraEngagements || []).find(row => row.id === engagement.id && row.workspaceId === engagement.workspaceId && row.receipt === engagement.receipt) || engagement;
      record.signedPack = structuredClone({
        version: 1, assessmentVersion: event.assessmentVersion, engagement, submittedReceipt,
        workspace: data.workspace, policy: data.workspace.policy, overlay: data.workspace.overlay,
        scope: record.scope, clarification: record.clarification, customerReturn: record.customerReturn, evidence: record.evidence, reviews: record.reviews, findings: record.findings,
        recommendation: record.recommendation, qa: record.qa, decision, events: [...record.events, event],
      });
    }
  }
  if (action === "close") {
    if (!record.decision?.condition) throw new Error("There is no signed approval condition to close.");
    if (!rationale) throw new Error("Record the reviewer reasoning before closing the condition.");
    const latest = [...new Map(record.evidence.map(row => [row.name, row])).values()];
    const proof = latest.find(row => row.revision > record.decision.revision && record.reviews[row.id]?.conclusion === "Supported");
    if (!proof) throw new Error("Record and review supported evidence received after the signed decision before closing the condition.");
    record.conditionClosed = true;
    record.closure = { rationale, evidenceId: proof.id, version: proof.version, ...attribution };
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
  const evidence = { name: text(values.name), version: text(values.version), notes: text(values.notes) };
  if (!evidence.name || !evidence.version || !evidence.notes) throw new Error("Enter the document name, its version and what it covers.");
  const record = structuredClone(current);
  record.revision++;
  const at = new Date().toISOString();
  const attribution = { actorId: supplier.actorId, actor: supplier.name, userId: supplier.id || supplier.actorId, role: "supplier", at };
  record.evidence.push({ ...evidence, source: `Supplier portal · ${supplier.name}`, id: crypto.randomUUID(), ...attribution, revision: record.revision, supplierAskId: askId });
  const target = record.supplierAsks.find(row => row.id === askId);
  target.status = "Responded";
  target.response = { ...evidence, ...attribution };
  if (!record.decision) { record.recommendation = null; record.qa = null; }
  const event = { id: crypto.randomUUID(), action: "Supplier evidence submitted", message: "Supplier evidence submitted", rationale: evidence.notes, workflowAction: "supply", engagementId, ...attribution };
  record.events.push(event);
  return { requestAssessments: { ...state.requestAssessments, [engagementId]: record }, events: [event] };
}
