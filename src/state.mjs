import { requireAction, actionEntry } from "./access.mjs";

export function createState(data) {
  return {
    ...structuredClone(data.initialState),
    intake: structuredClone(data.intake),
    schemaVersion: data.schemaVersion,
    assessmentRevision: 1,
    requestReference: data.request.reference,
    qaReview: { actorId: data.workspace.qaReviewerId, actor: data.workspace.qaReviewer, role: "analyst", prepared: true, at: "2026-10-31T14:00:00Z", outcome: data.initialState.qa, rationale: data.initialState.qaNote },
  };
}

export function recordDecision(state, data, outcome, rationale, condition) {
  const user = requireAction(data, "decision");
  if (state.selected !== "cedar")
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
  if (!state.qa.startsWith("Passed"))
    throw new Error("Independent QA must pass before recording a decision.");
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
    (!condition.owner.trim() || !condition.due || !condition.evidence.trim())
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
    rationale,
    assessmentVersion: data.assessmentVersion || "cedar-review-v1",
    condition: outcome === "Approve with conditions" ? condition : null,
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
) {
  const draft = state.supplierDraft;
  if (!draft.fileName || !draft.answer.trim() || !draft.scope)
    throw new Error(
      "Attach evidence, describe the service scope and select supporting details.",
    );
  if (state.supplierReceipts?.[item]) return state;
  const receipt = {
    reference: `${state.requestReference || "CC-2026-104"}-R${String(Object.keys(state.supplierReceipts || {}).length + 1).padStart(2, "0")}`,
    at: new Date().toISOString(),
    item,
    ...draft,
  };
  return {
    ...state,
    supplierReceipts: { ...state.supplierReceipts, [item]: receipt },
    pendingReviews: {
      ...state.pendingReviews,
      [item === primaryItem ? "R-07" : "IAM-04"]: true,
    },
    qa: "Evidence re-review required",
    ...(item === primaryItem
      ? {
          supplierReceipt: receipt,
          conclusion: "Needs review",
          qa: "Evidence re-review required",
        }
      : {}),
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
  return {
    ...state,
    pendingReviews: { ...state.pendingReviews, [id]: false },
    reviews: { ...state.reviews, [id]: { ...review, actorId: user.actorId, actor: user.name, userId: user.id, at: new Date().toISOString() } },
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
  const reviewers = Object.values(state.reviews || {}).map(row => row.actorId);
  if (user.actorId === leadActorId || reviewers.includes(user.actorId))
    throw new Error("You cannot perform QA on your own analysis. Choose a different assigned reviewer.");
  if (!note.trim()) throw new Error("Record the QA challenge and rationale.");
  if (!["Passed", "Passed with condition", "Rework requested", "More evidence required"].includes(outcome)) throw new Error("Select a valid QA outcome.");
  if (outcome.startsWith("Passed") && (state.conclusion === "Needs review" || Object.values(state.pendingReviews || {}).some(Boolean)))
    throw new Error("Review the new evidence before passing QA.");
  const entry = actionEntry(data, "Independent QA recorded", note, { outcome });
  return { ...state, qa: outcome, qaNote: note, qaReview: { ...entry, prepared: false }, events: [...state.events, entry] };
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
