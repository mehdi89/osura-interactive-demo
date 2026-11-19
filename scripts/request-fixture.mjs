// Shared test helper: drives a submitted request through the full evidence model with the synthetic pack.
import { DOCUMENT_LIBRARY } from "../src/document-library.mjs";
import { activeControls, requestAssessment } from "../src/request-workflow.mjs";

const lib = id => DOCUMENT_LIBRARY.find(row => row.id === id);
// control → [library document, page, excerpt sentence, conclusion]
export const PLAN = {
  "CTL-SEC": ["doc-soc2-2026", 1, "The service in scope is the contracted service and its customer data processing.", "Supported"],
  "CTL-ACC": ["doc-soc2-2026", 2, "Privileged access reviews are performed quarterly and evidenced for all four quarters.", "Supported"],
  "CTL-DATA": ["doc-soc2-2026", 3, "One exception: the annual data deletion test was not performed during the period.", "Insufficient"],
  "CTL-SUB": ["doc-dpa-v3", 2, "Security obligations are flowed down by written contract.", "Supported"],
  "CTL-IR": ["doc-ir-v1", 1, "Customers are notified of a confirmed security incident affecting their data within 72 hours.", "Supported"],
  "CTL-VUL": ["doc-pentest-2026", 2, "One high severity issue remains open with a target date of 31 January 2027.", "Insufficient"],
  "CTL-BCP": ["doc-bcp-2024", 2, "No technical failover test has been performed.", "Insufficient"],
};

export function addDocuments(act, state, ids = ["doc-soc2-2026", "doc-dpa-v3", "doc-ir-v1", "doc-pentest-2026", "doc-bcp-2024"]) {
  for (const id of ids) state = act(state, "evidence", { libraryId: id, notes: `${lib(id).name} covers the contracted service.`, doesNotProve: "Operating effectiveness outside the stated period." });
  return state;
}

export function docId(state, engagement, libraryId) {
  return requestAssessment(state, engagement).evidence.findLast(row => row.libraryId === libraryId)?.id;
}

// Cite, conclude and raise one finding per gap so the request is ready for a recommendation.
export function concludeAll(act, state, engagement, { findings = true } = {}) {
  for (const row of activeControls(requestAssessment(state, engagement))) {
    const [libraryId, page, excerpt, conclusion] = PLAN[row.controlId];
    state = act(state, "cite", { controlId: row.controlId, documentId: docId(state, engagement, libraryId), page, excerpt, shows: `Evidence for ${row.name}.` });
    state = act(state, "conclude", { controlId: row.controlId, conclusion, rationale: `Reviewed the cited page for ${row.name}.`, overrideReason: "Checked against the cited current evidence." });
    if (findings && conclusion !== "Supported")
      state = act(state, "finding", { controlIds: [row.controlId], issue: `${row.name} gap`, severity: "Medium", severityRationale: "Material control with partial evidence.",
        action: "Provide the missing evidence.", owner: "Supplier security lead", due: "2027-02-01", citationIds: requestAssessment(state, engagement).citations.slice(-1).map(c => c.id) });
  }
  return state;
}
