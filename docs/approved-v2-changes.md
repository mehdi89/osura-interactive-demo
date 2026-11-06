# Approved demo improvements

On 6 November 2026 the owner approved all recommendations in the final call sheet embedded in `Osura Decision Call.html`. This approval supersedes the pending status in the earlier review export and project instructions. The final call sheet overrides the earlier concept proposals.

Source SHA-256: `ad98674d98838af586c01757e1eb8106204e312724457cff5fce7da4d19b0359`.

The demo remains presenter-led, synthetic and session-only. Milestone acceptance belongs to the actual V2 application with stored data. Customer decisions start blank and require confirmation. Submitted supplier answers become read-only. The governed label remains **CTP inherent risk**, with a plain explanation.

## Implemented scope

### D01: A row can open the wrong supplier

A row action selects its own record before opening. Records without a full walkthrough open their scoped preview, never a CedarCloud screen.

Deferred: Record search, new navigation, production authorization, back-link to filtered lists.

### D02: Screens say Ready when work is blocked

One derived status drives badges, steps and next owner. Every evidence change counts, QA rework clears only after an analyst revision, and QA independence looks at everyone who authored the review.

Deferred: A workflow engine, notifications, stored state, new timeline.

### D03: The approval is already filled in

No outcome selected, blank customer rationale, analyst advice kept separate, one confirmation showing scope, actor, outcome and obligation before recording. One Record button.

Deferred: A dedicated review page, executive workspace redesign, live identity.

### D04: A rejected supplier still looks active

Rejected cases leave open lists and lose the active-assurance link. The assurance page title follows the outcome. Prepared examples say so in print and JSON. Frozen pack uses its own snapshot of the workspace name.

Deferred: A new example mode, separate outcome dashboards. Clarification already avoids a signed pack.

### D05: First screen does not say what Osura does

Purpose sentence and responsibility split above the existing dashboard, one truthful next task, separately labelled example entry.

Deferred: Guided tour, onboarding preferences, metric drill-downs, comprehension study, commercial claims.

### D06: New request ends by pointing at another supplier

Reuse the receipt details, lead with Request received, name analyst triage as next, make the example a secondary action, say the receipt lasts until refresh.

Deferred: Reload persistence, backend storage, notifications, any response-time promise.

### D07: Form errors stay after they are fixed

Clear errors on edit, identify and focus missing questions, explain Unknown before failure, keep unresolved facts in the review summary.

Deferred: Intake redesign, autosave, automatic answers, renaming Unknown, copy claiming anyone is notified.

### D08: Reviewer notes vanish; refresh loses everything

Keep analyst, QA and decision drafts through navigation and item changes in session memory. Warn on refresh when work exists and keep the refresh-loss note visible. Rename to View source excerpt and show the real file, date and version for new evidence.

Deferred: Saving across refresh, PDF viewing or extraction, new evidence layout.

### D09: Editing a sent supplier response falsely says received

Submitted items open read-only against their own receipt and say corrections are unavailable in this prototype. Remove the false success. Link to the exact remaining item.

Deferred: Corrections with version history and a cannot-provide path, unless decision 4 says otherwise. No help messaging or real upload.

### D10: Blank values save; selection is colour only

Trim and reject blank required text in shared forms. Give tabs and choices programmatic selected state. Protect CedarCloud's service link in the data editor.

Deferred: A new design system, universal confirmation modals, screen-reader sign-off.

### D11: Search promises suppliers but finds only screens

Rename to Find a demo screen with a no-results message that repeats the query.

Deferred: Supplier and service record search, grouping, highlighting.

### D12: Approved filter hides a supplier with mixed services

Match services before grouping and name the matching service. Directory filters apply to each tab or are removed there.

Deferred: Expandable supplier rows, global search, new approval states.

### D13: Three screens overflow on a phone

Contain page overflow on the Overview, Suppliers and Assessments pages at phone width, keep table scrolling, add a visible menu close and focus return.

Deferred: Service cards, bottom navigation, separate mobile experience.

### D14: A new finding invents its severity and owner

Finding form shows and saves requirement, severity and owner, and stops labelling every finding Conditional approval. Add an empty-queue message and one session-only retry status.

Deferred: Delivery workers, fake receipts, loading-state framework, new treatment taxonomy.

### D15: A condition can close on old proof; View commitments opens a create form

A condition cannot close on evidence received before the decision; until newer evidence exists, closure shows as a preview. Rename Calendar view to Schedule a review, send View all conditions to the real conditions, use one date format.

Deferred: A calendar, due-next dashboard, backend scheduling, the full evidence lifecycle.

### D16: Risk, evidence and decision labels blur; text too small

Label CTP inherent risk, evidence support, QA readiness and customer outcome separately. Darken and enlarge small text. Correct overview copy that says risk is calculated when the values are fixtures.

Deferred: Renaming CTP inherent risk, changing thresholds, new scores, hiding analyst IDs, a full component specimen.

## Deployment

V2 review URL: https://osura-v2.dev.fems.education. The original https://osura.dev.fems.education remains on its previous snapshot.

Deploy this branch as a separate Coolify service on the recovered control-plane/dev host `172.30.18.16`, with a locally built `osura-interactive-demo:<commit>` nginx image and no published host port. Static artifacts and the image build recipe are retained under `/data/osura-demo/releases/<commit>/`; Coolify stores the service Compose definition. Deployments are manual; Git pushes do not update this host. No source credentials or environment secrets are required.

Validation: `npm test`, `npm run build`, browser interaction checks and public HTTPS/asset comparison.

## Final verification

The follow-up audit gaps are closed: both assurance links accept ordinary click events; register stages, step indicators, customer-action counts and readiness share `workflowStatus`; QA send-back returns ownership to the analyst; displayed dates use `dd MMM yyyy`; risk captions consistently identify CTP inherent risk. Direct navigation to intake review returns to the first missing field or business question.

All 37 automated checks and the production build pass. Browser checks exercised QA send-back, the resulting register and customer views, blank customer intent, scoped decision confirmation, signed-pack continuation, monitoring navigation and direct intake validation. The earlier 390px containment and supplier-receipt checks remain applicable. No schema or seed records changed.

## Follow-up acceptance

The seven live-review findings and related scope omissions are resolved. See [the decision-file completion crosswalk](decision-file-completion.md) for D01–D16 evidence, the matching `(1).html` source hash, and the final call sheet’s explicit deferrals. The latest suite has 49 tests.
