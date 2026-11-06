import { requireAction, actionEntry } from "./access.mjs";

export function createState(data) {
  return {
    ...structuredClone(data.initialState),
    intake: structuredClone(data.intake),
    schemaVersion: data.schemaVersion,
    assessmentRevision: 1,
    analysisRevision: 0,
    analysisAuthors: [],
    qaReworkRevision: null,
    requestReference: data.request.reference,
    qaReview: { actorId: data.workspace.qaReviewerId, actor: data.workspace.qaReviewer, role: "analyst", prepared: true, at: "2026-10-31T14:00:00Z", outcome: data.initialState.qa, rationale: data.initialState.qaNote },
  };
}

export function recordDecision(state, data, outcome, rationale, condition) {
  const user = requireAction(data, "decision");
  if (state.selected !== "cedar" || data.activeEngagementId !== "cedar")
    throw new Error(
      "The full decision walkthrough is scoped to the CedarCloud reference case.",
    );
  if (
    state.conclusion === "Needs review" ||
    Object.values(state.pendingReviews || {}).some(Boolean)
  )
    throw new Error(
      "Review the new supplier evidence before recording a decision.",
    );
  if (!state.qa.startsWith("Passed") || (state.qaReworkRevision != null && (state.analysisRevision || 0) <= state.qaReworkRevision))
    throw new Error("Independent QA must pass after any required analyst revision before recording a decision.");
  if (!rationale.trim()) throw new Error("Enter a decision rationale.");
  if (
    ![
      "Approve",
      "Approve with conditions",
      "Reject",
      "Return for clarification",
    ].includes(outcome)
  )
    throw new Error("Select a valid decision.");
  if (
    outcome === "Approve with conditions" &&
    (!condition?.owner?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(condition?.due || "") || !condition?.evidence?.trim())
  )
    throw new Error(
      "A condition needs an owner, due date and required evidence.",
    );
  if (state.decision)
    throw new Error(
      "This review already has a recorded decision. Create a reassessment to record a new one.",
    );
  const engagement = data.engagements.find((e) => e.id === state.selected);
  const decision = {
    outcome,
    rationale: rationale.trim(),
    assessmentVersion: data.assessmentVersion || "cedar-review-v1",
    condition: outcome === "Approve with conditions" ? { owner: condition.owner.trim(), due: condition.due, evidence: condition.evidence.trim() } : null,
    actor: user.name,
    actorId: user.actorId,
    userId: user.id,
    role: user.role,
    at: new Date().toISOString(),
  };
  if (outcome === "Return for clarification")
    return {
      ...state,
      qa: "Rework requested",
      qaReworkRevision: state.analysisRevision || 0,
      decision: null,
      clarification: decision,
      events: [...state.events, actionEntry(data, "Customer clarification requested", rationale, { outcome })],
    };
  return {
    ...state,
    decision,
    events: [...state.events, actionEntry(data, "Customer decision recorded", rationale, { outcome, condition: decision.condition })],
    signedPack: {
      version: 1,
      assessmentVersion: decision.assessmentVersion,
      engagement: structuredClone(engagement),
      workspace: structuredClone(data.workspace),
      policy: data.workspace.policy,
      overlay: data.workspace.overlay,
      decision,
      requirements: structuredClone(data.requirements),
      qa: state.qa,
      qaNote: state.qaNote,
      qaReview: structuredClone(state.qaReview),
      reviews: structuredClone(state.reviews || {}),
      judgement: state.judgement,
      conclusion: state.conclusion,
      documents: structuredClone(data.documents),
    },
  };
}

export function submitSupplier(
  state,
  item = "Recovery exercise evidence",
  primaryItem = "Recovery exercise evidence",
  { revision = false } = {},
) {
  const previous = state.supplierReceipts?.[item];
  if (previous && !revision) return state;
  if (revision && !previous) throw new Error("Submit the original response before creating a revision.");
  const draft = state.supplierDraft;
  const responseType = draft.responseType || "evidence";
  if (!["evidence", "alternative", "cannot-provide"].includes(responseType)) throw new Error("Choose a valid response type.");
  const scope = responseType === "cannot-provide" ? "" : draft.scope;
  const fileName = responseType === "cannot-provide" ? "" : (draft.fileName || "").trim();
  if (!draft.answer.trim()) throw new Error("Describe the service coverage, alternative or reason evidence is unavailable.");
  if (responseType !== "cannot-provide" && !scope) throw new Error("Tell us whether the response covers the contracted service.");
  if (responseType === "evidence" && !fileName) throw new Error("Attach evidence before submitting this item.");
  const normalize = value => (value || "").trim().replace(/\s+/g, " ");
  if (previous && normalize(previous.fileName) === normalize(fileName) && normalize(previous.answer) === normalize(draft.answer) && previous.scope === scope && (previous.responseType || "evidence") === responseType) return state;
  if (revision && !draft.changeReason?.trim()) throw new Error("Explain what changed before submitting a revised response.");
  const history = { ...(state.supplierReceiptHistory || {}) };
  const priorVersions = history[item] || (previous ? [previous] : []);
  const allReceipts = Object.values(history).flat();
  for (const receipt of Object.values(state.supplierReceipts || {})) if (!allReceipts.some(row => row.reference === receipt.reference)) allReceipts.push(receipt);
  const receipt = {
    ...draft,
    reference: `${state.requestReference || "CC-2026-104"}-R${String(allReceipts.length + 1).padStart(2, "0")}`,
    at: new Date().toISOString(), item,
    answer: draft.answer.trim(), fileName, scope, responseType,
    version: priorVersions.length + 1,
    ...(revision ? { supersedes: previous.reference, changeReason: draft.changeReason.trim() } : {}),
  };
  return {
    ...state,
    supplierReceipts: { ...state.supplierReceipts, [item]: receipt },
    supplierReceiptHistory: { ...history, [item]: [...priorVersions, receipt] },
    pendingReviews: { ...state.pendingReviews, [item === primaryItem ? "R-07" : "IAM-04"]: true },
    qa: "Evidence re-review required",
    ...(item === primaryItem ? { supplierReceipt: receipt, conclusion: "Needs review" } : {}),
    requestStatus: "Response received",
  };
}

export function filterEngagements(rows, search = "", filter = "All") {
  return rows.filter(
    (row) =>
      Object.values(row)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "All" ||
        row.risk === filter ||
        row.risks?.includes(filter) ||
        row.stage === filter ||
        row.client === filter),
  );
}

export function saveRequirementReview(state, data, id, review) {
  const user = requireAction(data, "recommendation");
  if (state.selected !== "cedar" || data.activeEngagementId !== "cedar") throw new Error("Evidence review is scoped to the CedarCloud walkthrough.");
  const requirement = data.requirements.find((r) => r.id === id);
  if (!requirement) throw new Error("Unknown requirement.");
  if (!review.judgement.trim())
    throw new Error("Record your independent judgement before saving.");
  if (
    ![
      "Supported",
      "Partially supported",
      "Unknown",
      "Contradictory",
      "Out of scope",
    ].includes(review.conclusion)
  )
    throw new Error("Select a reviewed evidence conclusion.");
  if (!["Approve", "Approve with conditions", "Reject", "Return for clarification"].includes(review.recommendation))
    throw new Error("Select a suggested customer outcome.");
  const previous = state.pendingReviews?.[id]
    ? "Needs review"
    : id === "R-07"
      ? state.conclusion
      : state.reviews?.[id]?.conclusion || requirement.conclusion;
  if (review.conclusion !== previous && !review.reason.trim())
    throw new Error("Explain why the conclusion changed.");
  const documents = data.documents.filter(row => row.requirement === id);
  const evidenceVersions = [...new Set(documents.map(row => row.version))].sort();
  const evidenceBasis = [...new Set(documents.map(row => JSON.stringify([row.name, row.version, row.date])))].sort();
  const saved = state.reviews?.[id];
  const normalize = text => (text || "").trim().replace(/\s+/g, " ");
  if (saved && normalize(review.judgement) === normalize(saved.judgement) &&
    review.conclusion === saved.conclusion && review.recommendation === saved.recommendation &&
    (!normalize(review.reason) || normalize(review.reason) === normalize(saved.reason)) &&
    JSON.stringify(evidenceBasis) === JSON.stringify(saved.evidenceBasis))
    throw new Error("No review changes to save. Revise your judgement or explain how the QA challenge was resolved.");
  return {
    ...state,
    analysisRevision: (state.analysisRevision || 0) + 1,
    analysisAuthors: [...new Set([...(state.analysisAuthors || []), user.actorId])],
    pendingReviews: { ...state.pendingReviews, [id]: false },
    reviews: { ...state.reviews, [id]: { ...review, judgement: review.judgement.trim(), reason: review.reason.trim(), evidenceVersions, evidenceBasis, actorId: user.actorId, actor: user.name, userId: user.id, at: new Date().toISOString() } },
    ...(id === "R-07"
      ? {
          judgement: review.judgement,
          conclusion: review.conclusion,
          judgementReason: review.reason,
        }
      : {}),
    qa: "Rework requested",
    events: [...state.events, actionEntry(data, "Analyst recommendation recorded", review.judgement, {
      requirementId: id, previousConclusion: previous, conclusion: review.conclusion, changeReason: review.reason, recommendation: review.recommendation,
    })],
  };
}


export function recordQA(state, data, outcome, note) {
  const user = requireAction(data, "qa");
  if (state.selected !== "cedar" || data.activeEngagementId !== "cedar") throw new Error("QA is scoped to the CedarCloud walkthrough.");
  const leadActorId = data.engagements.find(row => row.id === data.activeEngagementId)?.analystId;
  const reviewers = [...(state.analysisAuthors || []), ...Object.values(state.reviews || {}).map(row => row.actorId),
    ...(state.events || []).filter(row => row.action === "Analyst recommendation recorded").map(row => row.actorId)];
  if (user.actorId === leadActorId || reviewers.includes(user.actorId))
    throw new Error("You cannot perform QA on your own analysis. Choose a different assigned reviewer.");
  if (!note.trim()) throw new Error("Record the QA challenge and rationale.");
  if (!["Passed", "Passed with condition", "Rework requested", "More evidence required"].includes(outcome)) throw new Error("Select a valid QA outcome.");
  if (outcome.startsWith("Passed") && (state.conclusion === "Needs review" || Object.values(state.pendingReviews || {}).some(Boolean)))
    throw new Error("Review the new evidence before passing QA.");
  if (outcome.startsWith("Passed") && state.qaReworkRevision != null && (state.analysisRevision || 0) <= state.qaReworkRevision)
    throw new Error("An analyst must revise the recommendation after QA requests rework.");
  const entry = actionEntry(data, "Independent QA recorded", note.trim(), { outcome });
  return { ...state, qa: outcome, qaReworkRevision: outcome.startsWith("Passed") ? null : state.analysisRevision || 0, qaNote: note.trim(), qaReview: { ...entry, prepared: false }, events: [...state.events, entry] };
}

// A filtered view must not replace records belonging to another assigned customer.
export function mergeWorkflowPatch(state, patch) {
  const next = { ...state, ...patch };
  for (const key of ["events", "scheduledReviews", "extraFindings"]) {
    if (!patch[key]) continue;
    const rows = new Map((state[key] || []).map(row => [row.id, row]));
    for (const row of patch[key]) if (key !== "events" || !rows.has(row.id)) rows.set(row.id, row);
    next[key] = [...rows.values()];
  }
  return next;
}


export function workflowStatus(state) {
  if (state.decision) return {
    label: state.decision.outcome === "Reject" ? "Rejected" : state.decision.outcome === "Approve" ? "Approved" : "Approved with conditions",
    nextOwner: state.conditionClosed ? "Customer" : state.decision.condition?.owner || "Customer",
    stage: state.decision.outcome === "Reject" ? "Rejected" : "Active",
    step: 5,
    ready: false,
  };
  if (state.conclusion === "Needs review" || Object.values(state.pendingReviews || {}).some(Boolean))
    return { label: "Evidence re-review required", nextOwner: "Analyst", stage: "Evidence", step: 2, ready: false };
  if (state.qaReworkRevision != null && (state.analysisRevision || 0) <= state.qaReworkRevision)
    return { label: "Analyst revision required", nextOwner: "Analyst", stage: "Findings", step: 2, ready: false };
  if (!state.qa.startsWith("Passed"))
    return { label: "Independent QA required", nextOwner: "Independent QA reviewer", stage: "QA", step: 3, ready: false };
  return { label: "Ready for customer decision", nextOwner: "Customer Decision Owner", stage: "Decision", step: 4, ready: true };
}

export function addEvidence(state, data, document) {
  requireAction(data, "recommendation");
  if (state.selected !== "cedar" || data.activeEngagementId !== "cedar") throw new Error("Evidence upload is scoped to the CedarCloud walkthrough.");
  if (!document.name?.trim()) throw new Error("Choose an evidence file.");
  const requirements = document.requirement ? [document.requirement] : data.requirements.map(row => row.id);
  if (requirements.some(id => !data.requirements.some(row => row.id === id))) throw new Error("Choose a valid evidence requirement.");
  const receivedAt = new Date().toISOString();
  const upload = { ...document, name: document.name.trim(), receivedAt, date: receivedAt.slice(0, 10),
    version: document.version || `upload-${crypto.randomUUID()}`, status: "Needs review", page: "Metadata only · no extraction" };
  return { ...state, uploads: [...(state.uploads || []), upload],
    pendingReviews: { ...state.pendingReviews, ...Object.fromEntries(requirements.map(id => [id, true])) },
    ...(requirements.includes("R-07") ? { conclusion: "Needs review" } : {}), qa: "Evidence re-review required",
    events: [...state.events, actionEntry(data, "Evidence metadata uploaded", upload.name, { requirementIds: requirements, evidenceVersion: upload.version })] };
}

export function closureEvidence(state) {
  const decision = state.signedPack?.decision;
  const review = state.reviews?.["R-07"];
  if (!decision?.condition || state.pendingReviews?.["R-07"] || review?.conclusion !== "Supported") return null;
  const evidence = [state.supplierReceipt, ...(state.uploads || []).filter(row => row.requirement === "R-07")].filter(Boolean)
    .filter(row => Date.parse(row.at || row.receivedAt) > Date.parse(decision.at))
    .sort((a, b) => Date.parse(b.at || b.receivedAt) - Date.parse(a.at || a.receivedAt))[0];
  return evidence && Date.parse(review.at) >= Date.parse(evidence.at || evidence.receivedAt) &&
    review.evidenceVersions?.includes(evidence.reference || evidence.version) ? evidence : null;
}

export function canCloseCondition(state) {
  return Boolean(closureEvidence(state));
}

export function closeCondition(state, data, reason) {
  requireAction(data, "recommendation");
  if (state.selected !== "cedar" || data.activeEngagementId !== "cedar") throw new Error("Condition closure is scoped to the CedarCloud walkthrough.");
  if (!reason.trim()) throw new Error("Enter reviewer reasoning.");
  if (!canCloseCondition(state)) throw new Error("Review supported evidence received after the customer decision before closing the condition.");
  return { ...state, conditionClosed: true, closureReason: reason.trim(),
    events: [...state.events, actionEntry(data, "Condition closed", reason.trim())] };
}

export function filterSupplierServices(rows, search = "", filter = "All", tab = "All", stageFilter = "All") {
  const matches = filterEngagements(rows, search, filter).filter(row =>
    (stageFilter === "All" || row.stage === stageFilter) &&
    (tab !== "Approved" || row.stage === "Active") &&
    (tab !== "Needs attention" || !["Active", "Rejected"].includes(row.stage)));
  const groups = new Map();
  for (const row of matches) {
    const key = `${row.workspaceId}:${row.supplier}`;
    const group = groups.get(key);
    if (!group) groups.set(key, { ...row, serviceCount: 1, risks: [row.risk] });
    else {
      group.serviceCount++;
      group.service += ` · ${row.service}`;
      group.risks.push(row.risk);
      if (new Set(group.risks).size > 1) group.risk = "Varies";
    }
  }
  return [...groups.values()];
}
