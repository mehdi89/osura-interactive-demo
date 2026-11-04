import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

export function createModelValidator(schema, presentation) {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addKeyword({ keyword: "x-references", schemaType: "string" });
  ajv.addKeyword({ keyword: "x-unique", schemaType: "array" });
  const validate = ajv.compile(schema);
  return (data) => {
    if (!validate(data)) throw new Error(ajv.errorsText(validate.errors, { separator: "; " }));
    const lookup = {};
    for (const [table, definition] of Object.entries(schema.$defs)) {
      lookup[table] = new Map();
      for (const row of data[table]) {
        if (lookup[table].has(row.id)) throw new Error(`${table}: duplicate id ${row.id}`);
        lookup[table].set(row.id, row);
      }
      for (const fields of definition["x-unique"]) {
        const keys = data[table].map(row => JSON.stringify(fields.map(key => row[key])));
        if (new Set(keys).size !== keys.length) throw new Error(`${table}: ${fields.join(" + ")} must be unique`);
      }
    }
    for (const [table, definition] of Object.entries(schema.$defs)) {
      for (const row of data[table]) {
        for (const [field, property] of Object.entries(definition.properties)) {
          const target = property["x-references"];
          if (target && row[field] !== null && !lookup[target].has(row[field]))
            throw new Error(`${table}/${row.id}/${field}: ${target} record ${row[field]} is missing or still referenced`);
        }
      }
    }
    for (const row of data.engagements) {
      for (const [field, kind] of [["corePolicyVersionId", "core"], ["planVersionId", "plan"], ["overlayVersionId", "overlay"]]) {
        if (row[field] !== null && lookup.policyVersions.get(row[field]).kind !== kind)
          throw new Error(`${row.id}: ${field} must reference a ${kind} version`);
      }
      if (row.analystId && row.analystId === row.qaReviewerId) throw new Error(`${row.id}: QA reviewer must differ from analyst`);
    }
    for (const row of data.documentVersions) {
      if (row.page > row.pageCount) throw new Error(`${row.id}: page exceeds pageCount`);
    }
    for (const row of data.evidenceCitations) {
      const review = lookup.requirementReviews.get(row.reviewId);
      const document = lookup.documentVersions.get(row.documentVersionId);
      if (review.engagementId !== document.engagementId || review.requirementId !== document.requirementId)
        throw new Error(`${row.id}: evidence must belong to the same engagement and requirement`);
      if (row.pageStart > row.pageEnd || row.pageEnd > document.pageCount)
        throw new Error(`${row.id}: citation pages are outside the document`);
    }
    for (const row of data.requirementReviews) {
      if (lookup.requirements.get(row.requirementId).policyVersionId !== lookup.engagements.get(row.engagementId).corePolicyVersionId)
        throw new Error(`${row.id}: requirement must match the pinned core policy version`);
    }
    // The existing walkthrough has fixed control/packet slots; protect those until it is generalized.
    const s = presentation.scenario;
    const pinned = (table, id) => {
      if (!lookup[table].has(id)) throw new Error(`${table}/${id} is required by the demo walkthrough`);
      return lookup[table].get(id);
    };
    const walkthrough = pinned("engagements", s.walkthroughEngagementId);
    pinned("workspaces", s.workspaceId);
    if (walkthrough.workspaceId !== s.workspaceId || !walkthrough.analystId || !walkthrough.qaReviewerId || !walkthrough.decisionOwnerId || !walkthrough.overlayVersionId)
      throw new Error("The walkthrough needs its original workspace, review actors and overlay");
    const request = pinned("supplierRequests", s.requestId);
    if (request.engagementId !== walkthrough.id) throw new Error("The walkthrough request must stay in its engagement");
    for (const id of ["R-07", "INC-03", "DATA-02", "IAM-04"])
      if (!data.requirementReviews.some(row => row.engagementId === walkthrough.id && row.requirementId === id))
        throw new Error(`The walkthrough requires a review for ${id}`);
    const items = data.requestItems.filter(row => row.requestId === request.id).sort((a,b) => a.position-b.position);
    if (items.length !== 2 || items[0].requirementId !== "R-07" || items[1].requirementId !== "IAM-04")
      throw new Error("The walkthrough requires two ordered items: R-07 and IAM-04");
    return data;
  };
}

export function changeRecord(data, table, action, record, validate) {
  if (!Array.isArray(data[table])) throw new Error("Unknown collection");
  if (!["create", "update", "delete"].includes(action)) throw new Error("Unknown data action");
  const exists = data[table].some(row => row.id === record.id);
  if (action === "create" && exists) throw new Error(`Duplicate id: ${record.id}`);
  if (action !== "create" && !exists) throw new Error(`Record not found: ${record.id}`);
  const rows = action === "create" ? [...data[table], structuredClone(record)]
    : action === "delete" ? data[table].filter(row => row.id !== record.id)
    : data[table].map(row => row.id === record.id ? structuredClone(record) : row);
  const next = { ...data, [table]: rows };
  validate(next);
  return next;
}

const displayDate = (value, long = false) => new Intl.DateTimeFormat("en-GB", {
  day: "2-digit", month: long ? "long" : "short", year: "numeric", timeZone: "UTC",
}).format(new Date(`${value}T00:00:00Z`));

// Project relational records into the existing screen contract; screen components stay unchanged.
export function projectWorkspace(model, presentation, examples) {
  const { scenario: s, ...copy } = structuredClone(presentation);
  const get = (table, id) => model[table].find(row => row.id === id);
  const name = (table, id) => get(table, id)?.name || "Unassigned";
  const engagementRow = (row) => {
    const service = get("services", row.serviceId);
    return { id: row.id, supplier: name("suppliers", service.supplierId), service: service.name,
      risk: row.risk, stage: row.stage, owner: name("actors", row.ownerId), due: displayDate(row.due),
      plan: name("policyVersions", row.planVersionId), client: name("workspaces", row.workspaceId) };
  };
  const walkthrough = get("engagements", s.walkthroughEngagementId);
  const request = get("supplierRequests", s.requestId);
  const requirements = model.requirementReviews.filter(row => row.engagementId === walkthrough.id).map(row => {
    const requirement = get("requirements", row.requirementId);
    return { id: requirement.id, family: requirement.family, name: requirement.name,
      conclusion: row.conclusion, source: row.sourceLabel, expectation: requirement.expectation,
      next: row.next, passage: row.passage, proves: row.proves, doesNotProve: row.doesNotProve, proposal: row.preparedProposal };
  });
  const directory = model.engagements.filter(row => s.directoryIds.includes(row.id) || row.workspaceId !== s.workspaceId).sort((a, b) => {
    const rank = id => s.directoryIds.includes(id) ? s.directoryIds.indexOf(id) : s.directoryIds.length;
    return rank(a.id) - rank(b.id);
  }).map(row => {
    const result = engagementRow(row);
    const scopes = model.engagements.filter(other => get("services", other.serviceId).supplierId === get("services", row.serviceId).supplierId && other.workspaceId === row.workspaceId);
    return scopes.length > 1 ? { ...result, service: `${scopes.length} engagement scopes`, risk: "Varies" } : result;
  });
  return { ...copy, ...structuredClone(examples),
    workspace: { name: name("workspaces", s.workspaceId), initials: "NP", date: displayDate(s.displayDate, true),
      analyst: name("actors", walkthrough.analystId), qaReviewer: name("actors", walkthrough.qaReviewerId),
      decisionOwner: name("actors", walkthrough.decisionOwnerId), policy: name("policyVersions", walkthrough.corePolicyVersionId),
      overlay: name("policyVersions", walkthrough.overlayVersionId) },
    engagements: model.engagements.filter(row => row.workspaceId === s.workspaceId).map(engagementRow), directory, requirements,
    suppliers: model.suppliers.filter(row => row.intakeEnabled).map(row => ({ name: row.name, domain: row.domain || "", country: row.country || "",
      uses: model.services.filter(service => service.supplierId === row.id && service.suggestionOrder !== null).sort((a,b) => a.suggestionOrder-b.suggestionOrder).map(service => service.name) })),
    documents: model.documentVersions.filter(row => row.engagementId === walkthrough.id).map(row => ({ name: row.fileName, status: row.status, version: `v${row.version}`,
      page: `${row.page} of ${row.pageCount}`, date: displayDate(row.receivedOn), requirement: row.requirementId })),
    findings: model.findings.map(row => { const engagement = engagementRow(get("engagements", row.engagementId));
      return { id: row.id, supplier: engagement.supplier, service: s.findingServiceLabels[row.id] || engagement.service, issue: row.issue,
        control: row.requirementId, severity: row.severity, owner: name("actors", row.ownerId), state: row.state, due: displayDate(row.due), evidence: row.evidence }; }),
    triage: model.triageAnswers.filter(row => row.engagementId === walkthrough.id).map(row => ({ id: row.questionId, label: get("triageQuestions", row.questionId).label, value: row.value ? "Yes" : "No" })),
    bia: Object.fromEntries(["Confidentiality", "Integrity", "Availability"].map(dimension => [dimension,
      model.biaAnswers.filter(row => row.engagementId === walkthrough.id && get("biaQuestions", row.questionId).dimension === dimension).map(row => [get("biaQuestions", row.questionId).label, row.impact])])),
    request: { reference: request.id, recipient: request.recipient, due: request.due, message: request.message,
      items: model.requestItems.filter(row => row.requestId === request.id).sort((a,b) => a.position-b.position).map(row => row.label) },
    initialState: { ...copy.initialState, requestStatus: request.status, conclusion: requirements.find(row => row.id === "R-07").conclusion },
  };
}
