# Original decision-file implementation crosswalk

The owner approved the original **CONCEPT-01–CONCEPT-16 layouts and interactions**, together with the D01–D16 correctness requirements, on 6 November 2026. The earlier final call sheet described a smaller implementation; its deferrals no longer exclude UI work explicitly requested in this approval.

Source: `/Users/mehdi/Downloads/Osura Decision Call (1).html`, SHA-256 `ad98674d98838af586c01757e1eb8106204e312724457cff5fce7da4d19b0359`, identical to `Osura Decision Call.html`. The parent workspace retains the original concept JSON and PNG references in `ui-improvement-review/`.

## Original-concept crosswalk

This table records the current source implementation. It does not certify pixel-identical reproduction or a deployed release.

| Concept | Implemented surface and interaction | Code and styles |
| --- | --- | --- |
| 01 · Purpose and next action | Purpose-led overview, responsibility strip, scoped next-action hero, quieter programme metrics, separate own-request and guided-example entries. The guide explains handoffs without performing workflow actions. | `Overview`, `App` guided example; `customer-layouts.css`, `visual-system.css` |
| 02 · Focused intake | Four named steps, pinned request-summary rail, explicit answer choices and help, focused missing-field feedback, Back/Continue actions and visible session-draft status. Unknown remains unresolved. | `Intake`; `operations-layouts.css` |
| 03 · Honest receipt | Submitted request details and reference, awaiting-triage next owner, downloaded receipt, submitted facts and attachments, and a separate prepared-example action. Supplier receipts distinguish response delivery from evidence verification. | `SecondaryCase`, `Intake`, `SupplierPortal`; `operations-layouts.css` |
| 04 · Truthful readiness | Prominent status banner, four gate cards, exact outstanding requirement links, next owner and actions derived from the current review, substantive-revision QA barrier and no false customer-ready ticks. | `Assessment`, `Quality`, `Decision`, `workflowStatus`; `case-layouts.css` |
| 05 · Source and assessment | Large source pane with current file/version/page context, support/gap cards, pinned service and requirement picker, independent assessment and conclusion definition, saved/draft state, proposal comparison after saving, Save and next. | `EvidenceReview`, `projectRequirementEvidence`; `case-layouts.css` |
| 06 · Deliberate decision | Concise recommendation and proposed obligation beside unselected customer choices; blank rationale; explicit adoption of advice; conditional owner/date/proof fields; Review my decision and scoped confirmation; recorded receipt and next obligation. | `Decision`, `Pack`; `case-layouts.css` |
| 07 · Supplier progress | Scoped request and item-progress rail, file metadata, service-description/scope validation, review-before-submit, exact remaining-item action and item-specific receipt/history. | `SupplierPortal`; `operations-layouts.css` |
| 08 · Feedback and safeguards | Persistent draft/saved feedback, specific errors, contextual empty-state recovery, session refresh warning, Keep editing/Discard navigation safeguard and same-screen requirement-switch safeguard. | `App`, `EvidenceReview`, `Quality`, `Closure`, `Intake`; `visual-system.css`, `case-layouts.css`, `operations-layouts.css` |
| 09 · Search and scope | Grouped supplier, service-review and page results; query highlighting, customer-scope hint, exact record selection and useful empty state. Register views retain their filters, and detail destinations retain supplier/service identity. | `WorkspaceSearch.jsx`, `search.mjs`, `Registers`, `SupplierRecord`, `FollowUp`; `visual-system.css`, `customer-layouts.css` |
| 10 · Mobile workspace | Readable service cards, responsive review/decision panes, visible close and focus handling for navigation, touch-sized controls and presenter tools kept separate from primary tasks. | `App`, `EngagementTable`, `Registers`, `DirectoryDetails`; all layout styles |
| 11 · Clear obligations | Due-next hero, overdue/due/upcoming/closed/proposed views, owner/date/proof and exact next action; outcome-aware rejected/clarification continuations and prepared-pack entry. Schedule opens a scheduling form. | `Monitoring`, `Findings`, `Pack`, `Closure`; `operations-layouts.css`, `case-layouts.css` |
| 12 · Semantic components | Larger body/table/helper text, explicit semantic badge families with icons and labels, clear action hierarchy, native checked/pressed state, keyboard focus and contextual conclusion/help text. | Shared `Badge`, `Tabs`, `Label` and task controls; `visual-system.css`, `case-layouts.css` |
| 13 · Accountable finding | Pinned customer/supplier/service, no material defaults, applicable requirement and severity, accountable owner/due date, issue, exact source, rationale and closure proof; review before recording. Portfolio previews without scoped requirements cannot create findings. | `FindingForm`, `Findings`; `visual-system.css`, `operations-layouts.css` |
| 14 · Retry and empty work | Selected outbox thread, retained failed-attempt history, one persistent simulated retry state, no delivery claim, and filtered work queues with clear filters/recovery actions. | `Communications`, `Operations`; `operations-layouts.css` |
| 15 · Mixed-service directory | Expandable supplier entities, matching and other service scopes kept distinct, supplier/service/identity views with scope-consistent query/customer/status filters, counts and empty states. An approved service remains discoverable beside another service under review. | `Registers`, `DirectoryDetails`, `filterSupplierServices`; `customer-layouts.css` |
| 16 · Supplier revisions | Read-only original receipt, explicit revised-response entry, required change reason, new receipt/version with retained inspectable history, idempotent unchanged submissions and affected-control re-review. Alternative/unavailable responses remain claims requiring review. | `SupplierPortal`, `Response`, `submitSupplier` revision handling; `operations-layouts.css` |

## D01–D16 correctness coverage

The larger layouts retain the existing fixes: scoped navigation (D01), derived readiness and substantive independent QA (D02), explicit customer authority (D03), outcome-aware frozen/example records (D04), purpose and responsibility (D05), own-request receipts (D06), resolved validation errors and Unknown facts (D07), coherent version provenance and session drafts (D08), honest supplier receipts/revisions (D09), validation and selected semantics (D10), actual scoped search (D11), service-first filters (D12), contained mobile tasks (D13), explicit finding/retry state (D14), post-decision closure proof and honest schedule actions (D15), and governed risk/evidence/QA/outcome language (D16).

The old list deferring guided tours, real in-memory record search, mobile cards, supplier correction history, expandable supplier rows and the executive decision layout is superseded. The optional calendar is omitted as allowed by CONCEPT-11; no Calendar action pretends to implement one.

## Automated evidence and live-check status

The regression suite exercises the actual state functions and rendered screens. Coverage includes unchanged-save QA rejection; all-author independence; same-name source collisions; post-decision closure proof and displayed file/version/reviewer; blank customer intent; current-vs-prepared packs; signed workspace snapshots; exact Atlas selection; current support counts; four readiness gates and linked blockers; source support/gap meaning; outcome receipts; and finding forms with blank material attributes, scoped requirement options and no portfolio-to-Cedar creation path.

The original concept revision passed 66 checks; later role and profile verification is recorded in the [role review](ui-role-review-2026-11-06.md). Run `npm test` and `npm run build` for subsequent revisions. The finding-form checks are in `scripts/review-screens.test.mjs`; other regressions cover state, access, model/schema, evidence projection and search.

On 6 November 2026 the larger revision was checked in the shared browser at desktop and 390px widths. All 35 original routes rendered under their intended demo identities with no horizontal page overflow at 390px. Rendered overview, evidence and decision layouts were visually inspected against the concept references. Live interaction checks covered service-scoped search and return navigation; mixed HubSpot approved/unapproved scopes; deliberate conditional decision review, confirmation and receipt; unsaved-draft protection including search Keep editing retaining the original supplier and Discard applying the selected destination; a fully reviewed finding; supplier cannot-provide submission, required revision reason and retained R01/R02 history; failed delivery retry history; mobile navigation focus/scroll restoration; and all nine guided handoffs without automatic customer signing. These are representative visual and workflow checks, not an assertion of pixel identity for every proposal image. Deployment acceptance is recorded below.

The demo remains synthetic and session-only. It does not add production authentication, durable/shared records, real messages, document-content storage/extraction, live AI, a CTP scoring engine or a complete production evidence lifecycle. Those limits are detailed in [the approval scope](approved-v2-changes.md).

## Published build verification · 6 November 2026

- Live target: https://osura-v2.dev.fems.education/
- Code snapshot: `cf1f47c48949`, branch `feat/osura-v2-decisions`.
- Coolify service `ebmzph9q24sckudcsrr8y0eh`; activity 43 finished with exit code 0. Container `web-ebmzph9q24sckudcsrr8y0eh` runs `osura-interactive-demo:cf1f47c48949` and reports healthy.
- Public HTTPS HTML, JavaScript, CSS, all four data JSON files and workspace schema match the local build by SHA-256 (eight files). Loaded assets: `index-C64A2p7T.js`, `index-Cg-RNHIE.css`.
- Final live build: all 35 original routes plus A01 render for their intended demo roles at 390px without horizontal page overflow or an access-denied fallback. A supplier-directory return link remains available to the analyst and is hidden after switching to a customer role.
- Representative desktop/mobile screenshots and interactive checks are described above. Pixel-perfect parity with every concept PNG was not audited.
- The separate original demo remains healthy on `osura-interactive-demo:72b26d3`; its public JavaScript is still `index-C_93SKYu.js`.

Only the v2 demo service was deployed. The optional calendar remains omitted; synthetic data, in-memory persistence, metadata-only uploads and simulated delivery limits remain explicit.

## Role-layout repair and customer-switching follow-up

The role-layout repair was published as snapshot `929cf44f5b50`. The earlier concept deployment exposed desktop and tablet layout defects that mobile overflow checks did not catch. The owner requested a review-first repair of every demo role. The [role review and fix list](ui-role-review-2026-11-06.md) records seven reproduced issues, their remedies, interaction checks, viewport coverage and subsequent sidebar/profile follow-ups with deployment verification.

Northstar Payments and Ridgeway Finance have separate customer identities selectable only through the bottom **Demo user** selector. Each individual customer sees only their own company. Per the owner's latest sidebar simplification, Customer, Analyst and Superadmin workspace cards are removed; analysts retain the topbar Customer filter for assigned customers. Each customer retains separate intake drafts, receipts and list filters; Ridgeway uses T. Singh and its own Clearbridge/Kite portfolio. The full signed-decision walkthrough remains CedarCloud. Customer selection is simulated demo identity switching, not production tenant authentication.
