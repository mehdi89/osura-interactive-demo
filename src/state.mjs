export function createState(data) {
  return {
    ...structuredClone(data.initialState),
    intake: structuredClone(data.intake),
    schemaVersion: data.schemaVersion,
    requestReference: data.request.reference,
  };
}

export function recordDecision(state, data, outcome, rationale, condition) {
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
    condition: outcome === "Approve with conditions" ? condition : null,
    actor: data.workspace.decisionOwner,
    at: new Date().toISOString(),
  };
  if (outcome === "Return for clarification")
    return {
      ...state,
      qa: "Rework requested",
      decision: null,
      clarification: decision,
    };
  return {
    ...state,
    decision,
    signedPack: {
      version: 1,
      engagement: structuredClone(engagement),
      policy: data.workspace.policy,
      overlay: data.workspace.overlay,
      decision,
      requirements: structuredClone(data.requirements),
      qa: state.qa,
      qaNote: state.qaNote,
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
    reviews: { ...state.reviews, [id]: { ...review } },
    ...(id === "R-07"
      ? {
          judgement: review.judgement,
          conclusion: review.conclusion,
          judgementReason: review.reason,
        }
      : {}),
    ...(review.conclusion !== previous ||
    (id === "R-07" && state.supplierReceipt)
      ? { qa: "Rework requested" }
      : {}),
    events: [
      ...state.events,
      {
        message: `Analyst judgement recorded for ${id}`,
        at: new Date().toISOString(),
      },
    ],
  };
}
