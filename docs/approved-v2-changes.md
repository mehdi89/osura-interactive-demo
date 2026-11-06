# Approved demo improvements

On 6 November 2026 the owner explicitly approved the original **CONCEPT-01 through CONCEPT-16 layouts and interactions** in `Osura Decision Call.html`, as well as the D01–D16 correctness fixes. The original concepts are implementation scope. The final call sheet's smaller recommendations and deferral list do not exclude the larger UI work now requested.

Source SHA-256: `ad98674d98838af586c01757e1eb8106204e312724457cff5fce7da4d19b0359`. The supplied `Osura Decision Call (1).html` has the same hash. The concept specifications and images are retained in the parent workspace's `ui-improvement-review/` directory.

## Scope now included

The implementation includes the purpose-led overview and guided example, focused intake and receipts, four-gate review readiness, larger source/assessment panes, explicit customer review and confirmation, supplier item progress and versioned corrections, persistent session feedback and unsaved-work safeguards, grouped supplier/service/page search, service cards and mobile navigation, outcome-aware monitoring, readable semantic statuses, reviewed finding creation, truthful retry history and mixed-service supplier filtering.

These are working layouts and interactions on synthetic records, rather than static copies of the proposal images. The [completion crosswalk](decision-file-completion.md) maps each original concept to its screen functions, styles and checks.

The five earlier client decisions still protect the product contract: the demo uses synthetic session state; customer intent starts blank; analyst advice is separate from the customer's decision; CTP inherent risk keeps its governed meaning; and the actual application with durable records remains the milestone-acceptance system. The later approval expands the demo UI, including supplier corrections, without authorizing a change to the CTP method or a production backend.

## Preserved correctness rules

- Row actions and search results retain customer, supplier and service scope. Portfolio previews cannot borrow CedarCloud's evidence or create findings against its requirements.
- Evidence identity includes its version and received time. Equal filenames cannot mix an upload with a supplier response. Receipt revisions retain the original record and invalidate only the affected requirement.
- Independent QA needs an authorised different analyst. All review authors count toward independence. Rework requires changed analysis, a changed evidence basis or an explicit substantive response; an unchanged save cannot clear it.
- The customer Decision Owner chooses an outcome, writes a rationale, reviews the exact scope/conditions and confirms. Analyst, supplier and superadmin perspectives cannot sign for the customer.
- Signed packs freeze workspace, evidence, QA, attribution and outcome. Rejection and clarification have their own continuations. Prepared examples remain visibly separate in the page, print and JSON.
- A condition can close only on supported, reviewed evidence received after its signed customer decision. Closure displays the exact evidence used by that gate.
- Required text rejects whitespace, choices expose selected state, Unknown remains an unresolved fact, and in-session drafts survive navigation unless explicitly discarded.

## Intentional limits

The concepts make a calendar optional. This implementation offers **Schedule a review**, which opens the scheduling form; it does not display a fake Calendar control.

All data remains synthetic and changes reset on refresh. The demo-user selector simulates access rather than providing real authentication or tenant security. Search operates over the accessible in-memory dataset. File inputs store metadata and supplied answers, not document contents; PDF extraction/viewing, AI analysis, email delivery, worker execution, backend scheduling and shared persistent storage are not live integrations. Cannot-provide and alternative supplier responses request independent review and never automatically satisfy a requirement. CTP values remain labelled fixtures; the scoring method and thresholds are unchanged.

## Deployment and verification

Target URL: `https://osura-v2.dev.fems.education`. The original `https://osura.dev.fems.education` retains its separate previous snapshot.

Deployment uses a separate Coolify service on the recovered control-plane/dev host `172.30.18.16`, a static nginx image named `osura-interactive-demo:<commit>` and no published host port. Static artifacts and the build recipe are retained under `/data/osura-demo/releases/<commit>/`; Coolify retains the service Compose definition. Deployments are manual, so a Git push does not update this host. No source credentials or environment secrets are needed.

The original-concept visual revision has source-level, automated and representative live browser coverage recorded in the completion crosswalk. Earlier live-review results describe preceding releases; current publishing acceptance is recorded separately after deployment.
