# Cedarline scenario data-pack review

Reviewed 8 November 2026. This is a feasibility review and proposed implementation approach. No application code, data pack, loader or deployment was changed.

## Recommendation

Create a versioned Cedarline scenario JSON and retain the supplied evidence PDFs as associated, versioned assets. Load one active scenario at a time into our existing Osura UI. Keep CedarCloud available as the default scenario. The colleague's prototype is a useful manual-workflow reference; the original handover files should govern what the historical case actually contains.

This is more useful than copying the other prototype's UI. The case demonstrates substantive assurance work: claims conflict with documents, later supplier corrections do not prove remediation, a supported exercise has a limited scope, and the buyer defers onboarding without accepting risk. These records can exercise our existing intake, supplier, analyst, QA, findings, decision and reporting surfaces.

It cannot currently be achieved by replacing `workspace.json` alone. The app needs a validated import path and a limited set of scenario bindings in place of CedarCloud-specific assumptions.

## Material reviewed

- [Original supplied handover ZIP](/Users/mehdi/.t3/userdata/attachments/0ef6ed89-dece-474e-a0f3-0c8214648f2d-986b564d-c38c-4b0d-b510-9c782715c781-zip.zip): all **17** files, listed below.
- All **12** populated workbook sheets, comprising **147** populated rows, including formulas and cached results. The four overview counts were independently reconciled. Workbooks were read without modification or Excel recalculation.
- All **nine** one-page PDFs: full text extracted and pages rendered for inspection. The supplied overview PNG and both HTML files were inspected.
- [Colleague's live prototype](https://osura-demo.pages.dev): all **10** stages visited using Ego Browser. A separate synthetic browser session ran the provided examples through initial intake, 14-question request, E01–E06 response, evidence review, targeted follow-up, E07 response, findings, Hold recommendation, simulated QA, Defer decision, frozen Decision Pack and monitoring. The optional AI button was not run.
- The prototype's public bundle `assets/index-BUSKShNG.js` was inspected to distinguish case literals from added policy/CTP/example behaviour.
- Current demo schema, validator/projection, editor/bootstrap, access/session rules, supplier responses, QA, decision and pack implementation.

The Scottish Government/GitLab templates are external links in the handover, not files inside it. Their original Excel binaries were not downloaded or adopted as our framework. This review does not validate a real supplier, a regulatory standard or a production risk methodology.

### ZIP inventory

| Area | Files read |
| --- | --- |
| Entry point | `START_HERE.html` |
| Public references | `01_REAL_PUBLIC_TEMPLATES/OPEN_REAL_SOURCES.html`; `SOURCE_LINKS_AND_ATTRIBUTION.txt` |
| Buyer input | `Buyer_Intake_and_Requirements.xlsx` |
| Supplier input | `Supplier_Completed_Questionnaire.xlsx` |
| Evidence | `E01_Penetration_Test_Summary_2024.pdf`; `E02_Business_Continuity_Recovery_Plan.pdf`; `E03_Proposed_Data_Processing_Addendum.pdf`; `E04_Access_Control_Standard.pdf`; `E05_Security_Assurance_Statement.pdf`; `E06_Incident_Response_Exercise_Record.pdf`; `E07_Supplier_Followup_Response.pdf` |
| Analyst output | `Analyst_Assessment_Traceability.xlsx`; `Buyer_Decision_Record.pdf` |
| Developer guide | `CASE_LIMITATIONS_AND_QUESTIONS.txt`; `Manual_Assessment_Walkthrough.pdf`; `Overview_Preview.png` |

Workbook source locators: buyer `Supplier Intake!A1:D14`, `Buyer Requirements!A1:E14`; supplier `Completed Questionnaire!A1:F18`, `Supplier Notes!A1:C8`; analyst tabs `01_OVERVIEW` through `08_REAL_SOURCES`. Detailed source notes and cell extraction are retained in `/tmp/osura-cedarline-review-2026-11-08/` with an inventory/hash manifest.

## What the pack can faithfully contain

The buyer is **Northbridge Commerce Ltd**, supplier **Cedarline Analytics Ltd**, service **invoice reconciliation SaaS portal**. Scope includes commercially confidential invoices, limited personal contact data and an internal ERP API. The source review date is **5 November 2026**, with evidence current as of 3 November.

| Record group | Source content |
| --- | --- |
| Buyer intake | I01–I10 and 10 buyer-specific requirements R01–R10 |
| Supplier questionnaire | 14 questions Q01–Q14, original response text and claimed evidence |
| Supplied evidence | Seven PDFs E01–E07, issue dates, scope, limitations and page/section anchors |
| Missing evidence | M01 current 2026 test/retest; M02 current certification/alternative assurance; M03 signed subprocessor terms |
| Analyst assessment | 14 separate conclusions: 8 Contradicted, 1 Insufficient, 1 Missing, 2 Supported by documents and 2 Supported with a self-attestation basis |
| Findings/actions | F01–F07, all open: 4 High and 3 Medium, functional owners, proposed follow-up dates |
| Supplier correction | E07 and corrected Q03/Q04/Q08/Q09 responses, retained alongside the originals |
| Recommendation | HOLD; outstanding issues need further work |
| Buyer event | Morgan Vale deferred onboarding; NOT APPROVED; no risk accepted |
| Developer checks | T01–T12 are proposed acceptance tests, not already verified results |

Representative trace chains:

- R01/R02 → Q04/Q05 → E02 section 2 and E07 → documented RTO/RPO **12h/4h**, against buyer requirements **4h/1h** → F02 → Hold/Defer.
- R03 → Q06 → E03 clause 6 → **72h** notice in a draft DPA, against **24h** buyer requirement → F03.
- R04 → Q07 → E03 clause 9 → **90-day** retention, against **30-day** deletion requirement → F04.
- R05 → Q03/Q12 → E01/E07 → 2024 report, no current test/retest available → F01. A historical open finding is not proof of its current status.
- R06 → Q08 → E04/E07 → privileged MFA plus workforce rollout and an open exception, rather than universal MFA → F05.

The buyer requirements are illustrative for this case. They must not become global thresholds. The requirement-to-question joins above are an explicit import mapping inferred from source labels; the workbook does not supply a formal join table.

## Differences and unresolved facts

1. **Historical QA is absent.** The ZIP has no completed independent QA record. D06 says `Not yet` for cross-functional sign-off; it is a pending prerequisite, not an occurred event. The prototype adds a playable QA step. Importing the case must not fabricate a past QA pass or attribute it to the current user.
2. **Defer has a specific meaning.** Preserve the source buyer deferral as a labelled historical negative decision, distinct from Reject, Return for clarification and conditional approval. Our current live decision actions do not include Defer. An interactive Defer outcome needs explicit behaviour: no approval, no accepted risk, findings remain open and re-review follows updated evidence. Imported history must not bypass our live independent-QA gate.
3. **CTP answers are not in the handover.** The prototype explicitly attributes its nine triage and 17 BIA example answers to its own reading of the case. Its C3/I3/A5, score 5, High/Significant result is a prototype assumption, not supplied buyer answers or a verified full CTP calculation. Our official 17 questions remain intact and separate from supplier Q01–Q14. Offer these example answers only with that attribution; a source-only view leaves them unanswered.
4. **Some source headings are stale.** The intake note says no decision issued and one decision-trail heading says the case stops at recommendation, while D05 and the buyer PDF record deferral. Show the actual recorded deferral, preserve the caveat and state that no approval or risk acceptance occurred.
5. **Policy additions need attribution.** The prototype adds policy version 1.0.0, a 12-month interpretation of current testing, review cadence, an encryption control area and configurable overlays. These are useful proposals, not automatically accepted Osura defaults. Its nine triage facts do not alter the fixture's score or control coverage.
6. **Avoid copying behavioural regressions.** The prototype's customer outcome starts at Approve and unresolved Unknown intake answers block submission. Preserve our approved blank outcome default and current Unknown-for-clarification behaviour unless separately changed. Its simulated AI, including a deliberately wrong MFA suggestion, is training behaviour; no AI implementation is needed for this pack.
7. **Dates and people need provenance.** The original owner decision is 09:00 on 5 November, without timezone. The browser replay generated an 08:05 UTC decision from its own clock. Keep original timestamps at their supplied precision, and keep new session events separate. Most source actors are role labels; any added named demo analysts or supplier contacts must be labelled demo configuration.
8. **A Yes is not a pass.** Q10 asks whether there are *no* subprocessors, and E05 lists two. Preserve question wording, original response, evidence basis and conclusion separately. E05 self-attestation must remain distinct from independent assurance; absence of a file must remain explicit.

## Proposed pack contract

Use a data-only envelope, for example `cedarline-manual-v1.json`, with these sections. This is a design sketch, not a file that the current app accepts.

| Section | Purpose |
| --- | --- |
| `packVersion`, `id`, `title`, `synthetic`, `asOfDate` | Version the format and identify the historical case |
| `sources` | Archive/site provenance, original filenames, hashes, mapping notes and explicit assumptions |
| `workspace` | Existing normalized schema records: customer, supplier, service, engagement, policy/questionnaire, answers, document versions, citations, findings/actions and assignments |
| `scenario` | Active engagement, identities, request-to-control links, guided stops and display/as-of date; validated data, without executable code |
| `presentation` | Scenario-specific labels/excerpts supported by existing UI components |
| `examples` | Read-only source history, Hold recommendation, historical deferral and prepared pack; prototype-only assumptions labelled separately |
| `assets` | Original evidence/decision files, safe relative or approved hosted URLs, MIME types, SHA-256, versions and page/section references |

Reuse the installed workspace schema and validator. Do not allow a pack to replace schemas, load arbitrary remote code, supply renderer components or inject arbitrary internal React state.

A single JSON can carry all structured data and excerpts. PDFs should remain binary assets rather than base64 blobs. For the first implementation, publish this pack's assets with the demo and let the imported JSON reference them. A JSON selected from disk cannot automatically access neighbouring local PDFs; a fully offline portable package would need a ZIP importer later. Do not promise local JSON alone can open unspecified local attachments.

### Two modes using the same case

- **Historical example:** preserves the supplied assessment, open findings, missing evidence, absent historical QA and buyer deferral. Its Decision Pack is a prepared source record, clearly labelled, not a decision signed by the current demo user.
- **Interactive walkthrough:** starts from the case inputs and runs fresh demo actions through intake, request, original response, review, follow-up/correction, findings, recommendation, independent QA and customer decision. Original historical data remains immutable. Any QA or named actors introduced for this mode are explicitly new demo activity.

These should be named entry points within one scenario, not two contradictory copies of the underlying case. Preserve the existing customer isolation model. A scenario selector belongs in labelled presenter/admin Demo tools, not in an individual customer's workspace switcher.

## App changes actually needed

The existing DataEditor downloads normalized records but does not import files (`src/DataEditor.jsx:7`). Bootstrap loads fixed JSON resources (`src/main.jsx:3855`). Detailed routes/state/access and validation still contain `cedar` and fixed primary-control/request assumptions (`src/main.jsx:1112`, `src/state.mjs:17`, `src/data-model.mjs:69`, `src/access.mjs:36`). A portfolio-only engagement does not become a second full walkthrough automatically.

Generalize only the required scenario bindings: active engagement/customer/supplier, actors, control IDs, request-item relationships, findings and initial prepared state. Keep one active workflow instance; this milestone does not need a production multi-assessment engine or backend.

Evidence also needs a small relationship correction: the current schema binds a document version to one requirement and the validator checks citations against it. Cedarline uses E02 for Q04/Q05, E03 for Q06/Q07 and E05 for several controls. Keep one canonical file/version and allow explicit per-control citations to it. Do not duplicate the same PDF into invented versions to satisfy the existing constraint. Feed those citations into the viewer and add safe links to original PDFs; current uploads/viewers use metadata/excerpts only (`src/main.jsx:1610`, `1996`).

Import must validate the entire pack before changing anything, show its title/source date/counts/errors, protect unsaved drafts and apply model/presentation/examples/scenario together. Rebuild derived state atomically so CedarCloud reviews or QA cannot leak into Cedarline. Failed imports leave the current session untouched. Preserve appearance preferences. Provide separate **Reset current scenario** and **Restore default demo** actions.

## Suggested implementation order

1. **Reconcile and freeze the source mapping.** Resolve the listed deferral/QA/CTP distinctions with the above source-faithful defaults. Record inferred joins and optional prototype additions explicitly.
2. **Create and validate the pack and asset manifest.** Preserve original IDs as source IDs, namespace app IDs, retain original bytes and hashes, and represent M01–M03 as missing requests rather than invented files.
3. **Enable Cedarline in the existing UI.** Replace the necessary fixed case bindings, support shared evidence citations and original PDF links, and add labelled historical Defer plus the agreed interactive Defer semantics. Keep the current theme and approved layouts.
4. **Add scenario load/reset controls.** Start with the built-in CedarCloud/Cedarline choices and validated JSON import in Demo tools; one active scenario at a time. No real email, AI, backend or production authentication is required.
5. **Verify both scenarios before publishing.** Run the supplied T01–T12 checks where applicable, existing tests and desktop/mobile Light/Dark checks. Verify invalid-import atomicity, cross-customer scope, all 14 answers/7 findings, shared citations, missing files, E07 revision history, named independent QA, blank customer outcome, no risk acceptance on Defer, historical/session separation, frozen packs and reset/restore.

The first useful delivery is a loadable, source-faithful Cedarline scenario in our current UI. Fresh interactive replay follows the same data and must not imply that the original archive contains QA or approvals it never supplied.

## Review limits

The prototype run was a synthetic, in-memory example; its generated QA/decision events are review activity, not imported historical evidence. Optional AI, QA challenge/return branches, policy overlay publication, print output, expiry simulations and production security were not exhaustively tested. The app was not modified, a loadable pack was not created, and nothing was redeployed in this review.
