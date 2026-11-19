// Synthetic supplier document pack. One source for the generated PDFs (scripts/generate-pdfs.mjs)
// and for the page text that citations and the simulated AI read, so every excerpt is verifiable.
// ponytail: fixed synthetic pack; replace with uploaded files + server-side text extraction in the real build.

export const DOCUMENT_LIBRARY = [
  {
    id: "doc-soc2-2026", documentKey: "soc2", file: "soc2-type2-2026.pdf", name: "SOC 2 Type II report", version: "2026-09",
    date: "2026-09-30", sourceType: "Independent audit report", status: "Final",
    pages: [
      "SOC 2 Type II report. Period 1 October 2025 to 30 September 2026. Auditor: Synthetic Assurance LLP. The service in scope is the contracted tracking platform and its customer data processing. Hosting on the public cloud provider is carved out of this report.",
      "Controls tested. Multi-factor authentication is enforced for all administrative access. Privileged access reviews are performed quarterly and evidenced for all four quarters. Security incidents are logged and triaged within 24 hours.",
      "Exceptions noted. One exception: the annual data deletion test was not performed during the period. Management response: a deletion test is scheduled for the next quarter.",
    ],
  },
  {
    id: "doc-bcp-2024", documentKey: "bcp", file: "bcp-plan-2024.pdf", name: "Business continuity plan", version: "v1 2024-03",
    date: "2024-03-12", sourceType: "Supplier policy", status: "Draft",
    pages: [
      "Business continuity plan, draft v1. The recovery time objective (RTO) is 4 hours and the recovery point objective (RPO) is 1 hour for the tracking platform.",
      "Testing. The last continuity exercise was a tabletop walkthrough in 2024. No technical failover test has been performed.",
    ],
  },
  {
    id: "doc-bcp-2026", documentKey: "bcp", file: "recovery-exercise-2026.pdf", name: "Business continuity plan", version: "v2 2026-12",
    date: "2026-12-05", sourceType: "Supplier test report", status: "Final", replacesId: "doc-bcp-2024",
    pages: [
      "Business continuity plan v2 with recovery exercise report. A full technical failover test of the tracking platform was performed on 3 December 2026.",
      "Results. Service was restored in 2 hours, within the 4 hour RTO. Data loss was 15 minutes, within the 1 hour RPO. No open actions remain from the exercise.",
    ],
  },
  {
    id: "doc-pentest-2026", documentKey: "pentest", file: "pentest-summary-2026.pdf", name: "Penetration test summary", version: "2026-06",
    date: "2026-06-18", sourceType: "Independent test report", status: "Final",
    pages: [
      "Penetration test summary. Tester: Synthetic Offensive Security Ltd. Scope: external web application and API of the tracking platform. Two high severity issues were identified.",
      "Remediation status. One high severity issue was remediated and retested on 2 July 2026. One high severity issue remains open with a target date of 31 January 2027.",
    ],
  },
  {
    id: "doc-dpa-v3", documentKey: "dpa", file: "data-processing-addendum-v3.pdf", name: "Data processing addendum", version: "v3",
    date: "2026-02-01", sourceType: "Contract", status: "Final",
    pages: [
      "Data processing addendum v3. Customer personal data is deleted within 30 days of contract termination. Deletion is confirmed in writing on request.",
      "Subprocessors. The supplier uses two subprocessors: a public cloud hosting provider and an email delivery provider. Security obligations are flowed down by written contract.",
    ],
  },
  {
    id: "doc-ir-v1", documentKey: "ir", file: "incident-response-plan.pdf", name: "Incident response plan", version: "v1",
    date: "2026-05-20", sourceType: "Supplier policy", status: "Final",
    pages: [
      "Incident response plan. Customers are notified of a confirmed security incident affecting their data within 72 hours.",
      "Roles. The security lead coordinates response. A post-incident review is completed within 10 business days.",
    ],
  },
];

export const documentFromLibrary = id => DOCUMENT_LIBRARY.find(row => row.id === id) || null;
export const documentUrl = (doc, page = 1) => doc?.file ? `${import.meta.env?.BASE_URL || "/"}documents/${doc.file}#page=${page}` : null;
export const pageText = (libraryId, page) => documentFromLibrary(libraryId)?.pages[page - 1] || "";
// E2: a citation is verifiable only when its excerpt is on the cited page.
export const excerptOnPage = (libraryId, page, excerpt) => !!excerpt?.trim() && pageText(libraryId, page).includes(excerpt.trim());
// Evidence older than this at review time is stale (document qualifier, not proof).
export const STALE_AFTER_DAYS = 365;
export const isStale = (date, at = new Date()) => !!date && (new Date(at) - new Date(date)) / 86400000 > STALE_AFTER_DAYS;
