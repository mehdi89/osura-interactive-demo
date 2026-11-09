const uiKeys = ["intake", "intakeSubmitted", "intakeReceipt", "intakeIssue", "registerViews"];

export function customerView(state, data, user) {
  if (user?.role !== "customer") {
    if (!state.requestAssessments && !state.requestDrafts) return state;
    const allowedWorkspace = id => user?.workspaceIds?.includes(id) && (!data.workspaceProfiles || Object.hasOwn(data.workspaceProfiles, id));
    const ids = new Set([...data.engagements, ...(state.extraEngagements || [])].filter(row => allowedWorkspace(row.workspaceId)).map(row => row.id));
    return { ...state, ...requestMaps(state, ids) };
  }
  const workspaceId = user.workspaceId;
  const extraEngagements = (state.extraEngagements || []).filter(row => row.workspaceId === workspaceId);
  const engagements = [...data.engagements.filter(row => row.workspaceId === workspaceId), ...extraEngagements];
  const ids = new Set(engagements.map(row => row.id));
  const scoped = row => row.workspaceId === workspaceId && (!row.engagementId || ids.has(row.engagementId));
  const { customerViews, ...source } = ids.has("cedar") ? state : data.initialState;
  const saved = state.customerViews?.[workspaceId] || {};
  const defaults = { intake: structuredClone(data.intake), intakeSubmitted: false, intakeReceipt: null, intakeIssue: null, registerViews: {} };
  return {
    ...source,
    ...Object.fromEntries(uiKeys.map(key => [key, Object.hasOwn(saved, key) ? saved[key] : defaults[key]])),
    schemaVersion: state.schemaVersion ?? data.schemaVersion,
    selected: ids.has(state.selected) ? state.selected : engagements[0]?.id || null,
    extraEngagements,
    events: (state.events || []).filter(scoped),
    extraFindings: (state.extraFindings || []).filter(scoped),
    scheduledReviews: (state.scheduledReviews || []).filter(scoped),
    owners: Object.fromEntries(Object.entries(state.owners || {}).filter(([id]) => ids.has(id))),
    ...requestMaps(state, ids),
  };
}

function requestMaps(state, ids) {
  return Object.fromEntries(["requestAssessments", "requestDrafts"].map(key => [key, Object.fromEntries(Object.entries(state[key] || {}).filter(([id]) => ids.has(id)))]));
}

export function patchCustomerView(state, patch, user) {
  if (Object.hasOwn(patch, "owners")) patch = { ...patch, owners: { ...state.owners, ...patch.owners } };
  for (const key of ["requestAssessments", "requestDrafts"]) {
    if (Object.hasOwn(patch, key)) patch = { ...patch, [key]: { ...state[key], ...patch[key] } };
  }
  if (user?.role !== "customer") return patch;
  const values = Object.fromEntries(uiKeys.filter(key => Object.hasOwn(patch, key)).map(key => [key, patch[key]]));
  if (!Object.keys(values).length) return patch;
  return { ...patch, customerViews: { ...state.customerViews, [user.workspaceId]: { ...state.customerViews?.[user.workspaceId], ...values } } };
}
