export function sessionUser(model, id) {
  const user = model.users.find(row => row.id === id);
  if (!user) return null;
  return { ...user, workspaceName: model.workspaces.find(row=>row.id === user.workspaceId)?.name || null, name: model.actors.find(row => row.id === user.actorId)?.name || user.id,
    workspaceIds: !user.active ? [] : user.role === "superadmin" ? model.workspaces.map(row => row.id)
      : user.role === "customer" ? [user.workspaceId]
      : model.customerAssignments.filter(row => row.userId === user.id).map(row => row.workspaceId) };
}

export function requireAction(data, action) {
  const user = data.access;
  const engagement = data.engagements.find(row => row.id === data.activeEngagementId);
  if (!user?.active || !engagement || !user.workspaceIds.includes(engagement.workspaceId))
    throw new Error("You do not have access to this customer assessment.");
  if (action === "decision") {
    if (user.role !== "customer" || user.actorId !== engagement.decisionOwnerId)
      throw new Error("Only the designated customer Decision Owner can record a decision.");
  } else if (user.role !== "analyst" || (action === "qa" && !user.canQA)) {
    throw new Error(action === "qa" ? "Independent QA permission is required." : "An assigned analyst must record this recommendation.");
  }
  return user;
}

export function actionEntry(data, action, rationale, details = {}) {
  const engagement = data.engagements.find(row => row.id === data.activeEngagementId);
  return { id: crypto.randomUUID(), action, message: action, rationale, at: new Date().toISOString(),
    actorId: data.access?.actorId || "supplier-invitation", userId: data.access?.id || "supplier-invitation",
    actor: data.access?.name || "Supplier contact", role: data.access?.role || "supplier",
    workspaceId: engagement?.workspaceId || "northstar", customer: engagement?.client || data.workspace.name,
    engagementId: engagement?.id || "cedar", service: engagement?.service || "Payment event processing",
    assessmentVersion: data.assessmentVersion || "cedar-review-v1", policy: data.workspace.policy, overlay: data.workspace.overlay,
    evidenceVersions: engagement?.id === "cedar" ? data.documents.map(row => ({ file: row.name, version: row.version, requirement: row.requirement })) : [],
    ...structuredClone(details) };
}

export function scopeWorkspace(base, user, customerFilter = "all") {
  const workspaceIds = user?.workspaceIds || [];
  const rows = base.allEngagements.filter(row => workspaceIds.includes(row.workspaceId) && (customerFilter === "all" || row.workspaceId === customerFilter));
  const ids = new Set(rows.map(row => row.id));
  const suppliers = new Set(rows.map(row => row.supplier));
  const cedarVisible = ids.has("cedar");
  const inWorkspace = id => workspaceIds.includes(id) && (customerFilter === "all" || id === customerFilter);
  const customerName = id => base.allEngagements.find(row=>row.workspaceId === id)?.client || id;
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.workspaceId}:${row.supplier}`;
    const current = groups.get(key);
    if (!current) groups.set(key, { ...row, serviceCount: 1, risks: [row.risk] });
    else { current.serviceCount++; current.service = `${current.serviceCount} engagement scopes`; current.risk = "Varies"; current.risks.push(row.risk); }
  }
  return { ...base, workspace: { ...base.workspace, name: user?.role === "customer" ? user.workspaceName || base.workspace.name : base.workspace.name }, access: user, activeEngagementId: "cedar", engagements: rows,
    directory: [...groups.values()], findings: base.findings.filter(row => ids.has(row.engagementId)),
    documents: cedarVisible ? base.documents : [], requirements: cedarVisible ? base.requirements : [],
    suppliers: base.suppliers.filter(row => suppliers.has(row.name)),
    monitoring: base.monitoring.filter(row => inWorkspace(row.workspaceId)).map(row=>({...row,client:customerName(row.workspaceId)})),
    directoryIdentity: base.directoryIdentity.filter(row => suppliers.has(row.supplier)),
    historicalReports: base.historicalReports.filter(row => inWorkspace(row.workspaceId)),
    overviewActions: base.overviewActions.filter(row => ids.has(row.engagement)),
    communications: base.communications.filter(row => inWorkspace(row[6])).map(row=>user?.role === "analyst" ? [row[0], `${customerName(row[6])} / ${row[1]}`, ...row.slice(2)] : row),
    operationsHandoffs: base.operationsHandoffs.filter(row => inWorkspace(row[3])),
    upcomingAssurance: base.upcomingAssurance.filter(row => inWorkspace(row[3])),
    notifications: base.notifications.filter(row => inWorkspace(row[3])),
  };
}

export function visibleAudit(entries, user) {
  if (!user?.active) return [];
  return entries.filter(row => user.role === "superadmin" || (row.role !== "superadmin" && user.workspaceIds.includes(row.workspaceId)));
}

export function saveAnalyst(model, actingUser, values, validate) {
  if (actingUser?.role !== "superadmin" || !actingUser.active) throw new Error("Superadmin access is required.");
  if (!values.name.trim() || !values.email.trim()) throw new Error("Enter a name and email.");
  if (new Set(values.workspaceIds).size !== values.workspaceIds.length || values.workspaceIds.some(id => !model.workspaces.some(row => row.id === id)))
    throw new Error("Choose valid customer assignments.");
  const existing = values.id ? model.users.find(row => row.id === values.id && row.role === "analyst") : null;
  if (values.id && !existing) throw new Error("Analyst not found.");
  const id = existing?.id || `analyst-${crypto.randomUUID()}`;
  const actorId = existing?.actorId || `actor-${crypto.randomUUID()}`;
  const next = { ...model,
    actors: existing ? model.actors.map(row => row.id === actorId ? { ...row, name: values.name.trim() } : row) : [...model.actors, { id: actorId, name: values.name.trim() }],
    users: [...model.users.filter(row => row.id !== id), { id, actorId, email: values.email.trim().toLowerCase(), role: "analyst", workspaceId: null, active: values.active, canQA: values.canQA }],
    customerAssignments: [...model.customerAssignments.filter(row => row.userId !== id), ...values.workspaceIds.map(workspaceId => ({ id: `assignment-${crypto.randomUUID()}`, userId: id, workspaceId }))] };
  validate(next);
  return { model: next, userId: id, before: existing ? { ...existing, name: model.actors.find(row => row.id === actorId).name, workspaceIds: model.customerAssignments.filter(row => row.userId === id).map(row => row.workspaceId) } : null,
    after: { ...next.users.find(row => row.id === id), name: values.name.trim(), workspaceIds: [...values.workspaceIds] } };
}
