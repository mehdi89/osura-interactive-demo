// Generated from the supplied Cedarline evidence PDFs (pdftotext, whitespace normalised). Do not edit by hand.
// Source files: public/data/scenarios/cedarline-assets/ (unmodified, hashed in cedarline.json source.assets).
export const CEDARLINE_DOCUMENTS = [
 {
  "id": "cl-e01",
  "documentKey": "cl-e01",
  "path": "data/scenarios/cedarline-assets/E01_Penetration_Test_Summary_2024.pdf",
  "file": "E01_Penetration_Test_Summary_2024.pdf",
  "name": "2024 pen test executive summary",
  "version": "E01",
  "date": "2024-09-20",
  "sourceType": "External test excerpt (synthetic)",
  "status": "Final",
  "supports": "2024 external test and historic Medium finding",
  "doesNotProve": "That a 2026 test happened; that old finding is now fixed",
  "anchor": "p1 sections 1-3",
  "pages": [
   "OSURA / SUPPLIER ASSESSMENT TRAINING CASE Penetration Testing - Executive Summary Document ID: E01 / PT-2024-09 | Supplier: Cedarline Analytics Ltd | Issued: 20 September 2024 FICTIONAL training material. All organisations, statements, evidence and dates in this case are simulated. 1. Scope and testing dates External penetration test of Cedarline Portal API and web console; fieldwork 9-13 September 2024. This executive summary covers the 2024 release only. 2. Summary of observations Finding Rating Status as at report Excessive login attempts not rate-limited on legacy admin endpoint Medium Open - target October 2024 Information disclosure through verbose API errors Low Remediated during fieldwork 3. Limitations This document is not a statement about testing in 2025 or 2026. No 2026 test report, retest letter or current vulnerability status is included. Observations may no longer reflect the current production environment. 4. Evidence citation anchor E01 page 1, sections 1-3. Comparing dates is the first analyst step: the supplier questionnaire claims a July 2026 penetration test, but the supplied file is explicitly dated 2024. SYNTHETIC - NOT REAL SUPPLIER EVIDENCE Page 1"
  ]
 },
 {
  "id": "cl-e02",
  "documentKey": "cl-e02",
  "path": "data/scenarios/cedarline-assets/E02_Business_Continuity_Recovery_Plan.pdf",
  "file": "E02_Business_Continuity_Recovery_Plan.pdf",
  "name": "BCP and recovery objectives",
  "version": "E02",
  "date": "2026-02-12",
  "sourceType": "Supplier plan (synthetic)",
  "status": "Final",
  "supports": "Stated 12h RTO and 4h RPO; tabletop in 2025",
  "doesNotProve": "Guaranteed 4h/1h recovery or a production failover test",
  "anchor": "p1 section 2",
  "pages": [
   "OSURA / SUPPLIER ASSESSMENT TRAINING CASE Business Continuity & Disaster Recovery - Extract Document ID: E02 / BCP-2026-02 | Supplier: Cedarline Analytics Ltd | Issued: 12 February 2026 FICTIONAL training material. All organisations, statements, evidence and dates in this case are simulated. 1. Covered service Cedarline Analytics SaaS invoice-reconciliation portal and related API. The plan applies to the main EU production tenant. 2. Approved recovery objectives Metric Documented target Basis Recovery Time Objective (RTO) 12 hours Failover plus data validation Recovery Point Objective (RPO) 4 hours Scheduled backup snapshots Last tabletop exercise 18 November 2025 Manual exercise; no production failover 3. Constraints The 12-hour RTO and four-hour RPO are current internal targets. Faster recovery may occur but is not guaranteed or documented as a contractual commitment. 4. Evidence citation anchor E02 page 1, section 2. Buyer requires RTO four hours and RPO one hour; questionnaire claims those are already met. SYNTHETIC - NOT REAL SUPPLIER EVIDENCE Page 1"
  ]
 },
 {
  "id": "cl-e03",
  "documentKey": "cl-e03",
  "path": "data/scenarios/cedarline-assets/E03_Proposed_Data_Processing_Addendum.pdf",
  "file": "E03_Proposed_Data_Processing_Addendum.pdf",
  "name": "Proposed DPA extract",
  "version": "E03",
  "date": "2026-10-03",
  "sourceType": "Draft legal text (synthetic)",
  "status": "Draft",
  "supports": "Draft 72h notice and 90-day retention wording",
  "doesNotProve": "An executed contract or acceptable buyer terms",
  "anchor": "p1 clauses 6, 9, 11",
  "pages": [
   "OSURA / SUPPLIER ASSESSMENT TRAINING CASE Proposed Data Processing Addendum - Extract Document ID: E03 / DPA-REV-C | Supplier: Cedarline Analytics Ltd | Issued: 3 October 2026 FICTIONAL training material. All organisations, statements, evidence and dates in this case are simulated. Clause 6 - Security incident notice Supplier will notify Customer without undue delay and in any event no later than seventy-two (72) hours after Supplier confirms a Personal Data Breach involving Customer Personal Data. Clause 9 - Return and deletion Following termination, Supplier will retain Customer Personal Data for up to ninety (90) days for backup retirement, unless otherwise required by law; deletion confirmation may be provided after that period. Clause 11 - Status Draft terms, not executed. Internal Legal review required before onboarding. The operating questionnaire is not a substitute for agreed contract language. Evidence citation anchor E03 page 1, clauses 6 and 9. Questionnaire claims 24-hour notice and 30-day deletion. The buyer requests 24-hour notice and 30-day deletion. SYNTHETIC - NOT REAL SUPPLIER EVIDENCE Page 1"
  ]
 },
 {
  "id": "cl-e04",
  "documentKey": "cl-e04",
  "path": "data/scenarios/cedarline-assets/E04_Access_Control_Standard.pdf",
  "file": "E04_Access_Control_Standard.pdf",
  "name": "Identity and access standard",
  "version": "E04",
  "date": "2026-03-08",
  "sourceType": "Supplier policy (synthetic)",
  "status": "Final",
  "supports": "Admin MFA; broader rollout incomplete; exception open",
  "doesNotProve": "MFA for every account",
  "anchor": "p1 sections 4.1-4.3",
  "pages": [
   "OSURA / SUPPLIER ASSESSMENT TRAINING CASE Identity and Access Control Standard - Extract Document ID: E04 / IAS-2026-03 | Supplier: Cedarline Analytics Ltd | Issued: 8 March 2026 FICTIONAL training material. All organisations, statements, evidence and dates in this case are simulated. 4.1 Administrative access Multi-factor authentication (MFA) is mandatory for privileged administrative accounts accessing production services. 4.2 Non-privileged workforce and service accounts Non-privileged workforce accounts are subject to phased MFA rollout. Shared service accounts are permitted by exception until retirement of the legacy invoicing connector, subject to compensating monitoring. 4.3 Exceptions register Exception ID Description Target close IAM-EX-17 Legacy reconciliation integration account; password authentication 31 December 2026 Evidence citation anchor E04 page 1, sections 4.1-4.3. Questionnaire says MFA is enforced for every workforce and privileged account. SYNTHETIC - NOT REAL SUPPLIER EVIDENCE Page 1"
  ]
 },
 {
  "id": "cl-e05",
  "documentKey": "cl-e05",
  "path": "data/scenarios/cedarline-assets/E05_Security_Assurance_Statement.pdf",
  "file": "E05_Security_Assurance_Statement.pdf",
  "name": "Security and processing statement",
  "version": "E05",
  "date": "2026-10-20",
  "sourceType": "Self-attestation (synthetic)",
  "status": "Final",
  "supports": "Supplier assertions, two named subprocessors, audit not supplied",
  "doesNotProve": "Independent attestation or independently validated encryption",
  "anchor": "p1 sections 1-4",
  "pages": [
   "OSURA / SUPPLIER ASSESSMENT TRAINING CASE Supplier Security & Processing Statement Document ID: E05 / ASSURANCE-2026-10 | Supplier: Cedarline Analytics Ltd | Issued: 20 October 2026 FICTIONAL training material. All organisations, statements, evidence and dates in this case are simulated. 1. Hosting and encryption Production workloads run in EU cloud infrastructure. Storage encryption at rest is enabled and TLS 1.2 or higher is required for external application connections. Operational configuration snapshots were checked by the supplier security team on 15 October 2026. 2. Subprocessors Provider (fictional) Service Location Aster Cloud Services Infrastructure hosting Ireland Northstar Messaging Transactional email Germany 3. Certifications and external audit The supplier has not provided an ISO 27001 certificate or a SOC 2 Type II report for this review. A planned 2027 certification programme must not be interpreted as completed certification. 4. Evidence boundaries This is supplier self-attestation, not an independent audit. Detailed configuration evidence was not enclosed; the analyst should distinguish a supplier statement from independently verified control effectiveness. Evidence citation anchor E05 page 1, sections 1-4. Questionnaire states there are no subprocessors and ISO 27001 certification is current. SYNTHETIC - NOT REAL SUPPLIER EVIDENCE Page 1"
  ]
 },
 {
  "id": "cl-e06",
  "documentKey": "cl-e06",
  "path": "data/scenarios/cedarline-assets/E06_Incident_Response_Exercise_Record.pdf",
  "file": "E06_Incident_Response_Exercise_Record.pdf",
  "name": "Incident tabletop exercise",
  "version": "E06",
  "date": "2026-09-18",
  "sourceType": "Exercise record (synthetic)",
  "status": "Final",
  "supports": "36-minute security-lead escalation in one exercise",
  "doesNotProve": "Timely customer notice; production incident performance",
  "anchor": "p1 sections 1-3",
  "pages": [
   "OSURA / SUPPLIER ASSESSMENT TRAINING CASE Incident Response Exercise - Record Document ID: E06 / IR-EX-2026-09 | Supplier: Cedarline Analytics Ltd | Issued: 18 September 2026 FICTIONAL training material. All organisations, statements, evidence and dates in this case are simulated. 1. Exercise scenario Simulated credential compromise affecting a staging environment. This was a tabletop exercise and did not involve a live breach. 2. Measured outcomes Measure Outcome Notes Initial triage 12 minutes SOC acknowledged inject Security lead escalation 36 minutes Within internal 60-minute target Regulator/customer notification Not exercised Customer notices were out of scope 3. Actions Action IR-22: rehearse customer notification obligations within 90 days. Assigned to Head of Security; not yet evidenced as completed. Evidence citation anchor E06 page 1, sections 1-3. Demonstrates some internal response capability but does not prove a 24-hour contractual notification obligation. SYNTHETIC - NOT REAL SUPPLIER EVIDENCE Page 1"
  ]
 },
 {
  "id": "cl-e07",
  "documentKey": "cl-e07",
  "path": "data/scenarios/cedarline-assets/E07_Supplier_Followup_Response.pdf",
  "file": "E07_Supplier_Followup_Response.pdf",
  "name": "Follow-up response",
  "version": "E07",
  "date": "2026-11-03",
  "sourceType": "Supplier correspondence (synthetic)",
  "status": "Final",
  "supports": "Supplier corrections and inability to provide current report",
  "doesNotProve": "Resolution of open gaps, approval, or certification",
  "anchor": "p1 reply text",
  "pages": [
   "OSURA / SUPPLIER ASSESSMENT TRAINING CASE Supplier Follow-Up Response - 3 November Document ID: E07 / REPLY-2026-11-03 | Supplier: Cedarline Analytics Ltd | Issued: 3 November 2026 FICTIONAL training material. All organisations, statements, evidence and dates in this case are simulated. Supplier reply to analyst evidence request Q: Can you share the July 2026 penetration-test report? A: We are checking whether a final report can be released; only the 2024 executive summary is currently available. Q: Can you commit to the four-hour RTO? A: The current documented objective remains twelve hours. We cannot confirm a four-hour recovery commitment. Q: Is there a current ISO 27001 certificate? A: No certificate has been made available for this review. The questionnaire answer was entered in error. Q: Will all accounts have enforced MFA before go-live? A: Not yet confirmed; the exception in IAS-2026-03 is still recorded as open. Evidence citation anchor E07 page 1. This is a simulated supplier response, not proof that the outstanding controls have been remediated. SYNTHETIC - NOT REAL SUPPLIER EVIDENCE Page 1"
  ]
 }
];
