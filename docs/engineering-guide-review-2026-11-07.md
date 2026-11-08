# Engineering guide review · 7 November 2026

Reviewed attachment: `Osura engineering guide.pdf`, 58 pages, dated 7 November 2026. Page references below are the PDF's printed page numbers.

The guide is useful as a screen-by-screen visual and regression reference. Correct its scope conflicts before treating it as the implementation contract. Its historical findings are not proof that those defects remain in the current application.

## Review coverage

- Read all 58 pages of extracted text; inspected rendered contact sheets for all pages and enlarged pages 4, 37 and 57.
- Compared requirements with the current approval crosswalk, role contract, handover fixes, appearance implementation and relevant source.
- Confirmed that the 35 original screen inventories total 435 control entries. A01 is additional, as the guide states. The original 36-screen comparison breakdown is 17 workflow matches, 14 component matches and five reference gaps; pages 57–58 add two component supplements.
- This review did not execute current application journeys, independently inspect live Coverbase documentation, or perform a pixel comparison. Application code and the supplied PDF were not changed.

## Findings

### R1 · P1 · Historical scope exclusions conflict with later approval

**Pages:** 37, 40, 42–48.

The decision appendix repeatedly says the HTML's final scope takes precedence over its concept images. That reverses the owner's later approval of CONCEPT-01–16. Examples include:

| Guide instruction | Current approved requirement | Required correction |
| --- | --- | --- |
| D03, p42: executive workspace redesign is later work | Deliberate executive decision layout is included | Preserve the implemented recommendation/form/confirmation structure |
| D05, p43: guided tour is later work | The guided role-handoff example is included | Retain the guide without automatically recording decisions |
| S02 p37 and D09 p44: corrections unavailable in the demo; defer alternative/cannot-provide routes | Versioned supplier corrections and alternative/unavailable responses are included | Retain read-only original receipts and an explicit new-revision action |
| Shared search p40 and D11 p44: record search is future work; use a screen finder | Scoped supplier/service/page search is included | Preserve grouped record search and exact destination scope |
| D12 p44 and D13 p45: defer expandable rows and service cards | Expandable mixed-service records and mobile cards are included | Preserve both, with service-specific status and accessible mobile actions |

Page 37 also contradicts itself: its comparison limit says to retain versioned corrections explicitly, but its behavior instruction says corrections are unavailable.

**Fix:** retain the historical appendix for traceability, clearly mark superseded exclusions, and add this precedence rule near the front:

> The owner's later approval of CONCEPT-01–16 and subsequent role, profile and appearance instructions takes precedence over historical deferrals reproduced here. Preserve approved working features unless an explicit new decision replaces them.

For supplier responses, use: “Original receipts remain read only. An explicit revised response records a change reason and a new immutable receipt, retains prior versions, and invalidates the affected review gates. Alternative and cannot-provide responses require independent review and do not automatically satisfy requirements.”

**Project evidence:** [approved scope](approved-v2-changes.md), especially the approval and preserved correctness rules; [concept crosswalk](decision-file-completion.md), concepts 01, 06, 09, 10, 15 and 16.

### R2 · P2 · The screenshot baseline and legacy control inventory need current status

**Pages:** 1, 20, 30, 35, 49–53, 57.

The guide identifies screenshots as current and gives a capture date, but no source URL or starting build SHA. The enlarged p57 image still contains the removed customer sidebar card and top-right badge/account controls. P35 lists the old second customer selector; p20 lists old handoff text such as “waiting for sponsor” and “delivery confirmed.” The guide correctly calls its inventory original, but it does not say which entries were replaced or retired.

**Fix:** pin each screenshot set to its URL, source build, role, customer scope, theme and viewport. Refresh obsolete screenshots or mark them as historical. Add per-task status: new change, already fixed, verified unchanged, superseded, or production-only. Record the verification build and evidence rather than assigning already corrected defects as new work.

The latest deployment record in this checkout identifies code snapshot `31997efb8411`; that is documentary evidence, not a fresh live-deployment check in this review.

**Project evidence:** [handover corrections](client-handover-fixes-2026-11-07.md), including handoffs and the duplicate directory filter; [current role and profile contract](roles-and-accountability.md); [latest recorded appearance release](dark-mode-2026-11-07.md).

### R3 · P2 · The shared-shell checklist omits the latest account and appearance decisions

**Pages:** 3, 40–41, 53, 57.

The guide does not cover Light/Dark/System appearance, Account, Change password, Billing, Log out or Resume. General role/client visibility is insufficient to preserve the explicitly approved placement of these controls during a shared-shell redesign.

**Fix:** add these shared requirements and acceptance checks:

- Customer, Analyst and Superadmin have no sidebar workspace card. Individual customer users have no cross-customer selector; analysts filter assigned customers in the topbar only.
- Notifications and account actions live in the bottom-left profile menu. Do not restore the removed top-right badge, bell or avatar. Supplier invitation navigation remains separate.
- Appearance is available in the profile menu and Settings, and in the supplier header. Test Light, Dark and System, a live operating-system preference change, explicit override, reload, unavailable storage and mobile containment.
- Theme changes preserve unsaved workflow drafts and customer scope. Only the appearance preference persists; workflow data remains session-only. Print uses Light without changing the saved preference.
- Account/password/billing remain truthfully labelled demo surfaces. Log out guards unsaved drafts; Resume preserves session records and identity.

**Project evidence:** [role contract](roles-and-accountability.md) and [appearance contract and checks](dark-mode-2026-11-07.md).

### R4 · P2 · “V2” needs two explicit delivery definitions

**Pages:** 2–3, 39–41, 53.

Demo scope correctly excludes backend persistence and production authentication. “V2 acceptance” separately requires actual stored data, durable history and enforced access. Since the deployed interactive demo itself is named osura-v2, the same term can mean two different deliverables.

**Fix:** name them consistently as “Osura v2 interactive demo” and “production application milestone.” Tag requirements as session simulation, production enforcement, or future integration. Passing a demo interaction must not certify server-side access control, durable storage, real transport or document processing. Conversely, a UI handover should not silently authorize a production backend.

If this is intended as a complete production engineering specification, it needs a separate specification for authentication, tenant enforcement, persistent records and files, API boundaries, reliable jobs/delivery, recovery and deployment. Define the permitted methodology author/publisher as well: p29's “appropriate role” does not specify that permission, and Superadmin does not automatically own methodology or customer decision authority.

**Project evidence:** [approved scope and intentional limits](approved-v2-changes.md) and [role powers](roles-and-accountability.md).

### R5 · P2 · Review-HTML maintenance should have a separate completion gate

**Pages:** 51–53.

Pages 51–52 correctly identify the Decision Call HTML as a different tool with its own storage and export behavior. Page 53 then makes repairing that tool a required product delivery item. The distinction is clear technically but unresolved operationally.

**Fix:** assign it a separate owner, artifact/version and acceptance list. Retain the synchronization/export tests, but state whether that maintenance is part of this delivery. It should not silently block product acceptance or rewrite the already approved decisions.

### R6 · P2 · Preserve the acceptance scenarios but make them executable and traceable

**Pages:** 3, 40–41, 53.

The journey coverage is strong. It needs a repeatable record connecting each scenario to a starting state, actor, record, expected result and evidence. Scope tests should include denied actions and direct routes, not only hidden navigation. The guide already calls for several of these checks; make their completion unambiguous.

**Fix:** use one status table with screen/scenario ID, delivery target, owner, starting fixture, role/customer/service, action, expected result, actual result, build, viewport/theme and evidence. Include the 1280px viewport requested on p3, plus 390px and 1440px, both appearance modes and representative keyboard/print checks. Associate historical findings with existing regression tests and rerun them where relevant.

This does not require an entirely new test framework. Reuse the current state/access/render tests and focused browser checks.

### R7 · P3 · Supply full-size visual assets alongside the A3 guide

**Pages:** screen comparisons throughout, especially 4–39 and 57–58.

The side-by-side comparison format is useful, but small UI labels are difficult to inspect at normal document zoom. Blue A identifies the intended region well; it is not a detailed target layout.

**Fix:** provide the original screenshots by screen ID and viewport. Where exact implementation alignment matters, specify shared sidebar/gutter, table density and responsive behavior rather than asking engineers to infer dimensions from scaled screenshots. Preserve task-specific evidence and decision layouts instead of forcing every screen into an identical grid.

## Requirements to keep

- The workflow/component/reference-gap distinction, and the warnings against inferring hidden behavior from screenshots.
- Osura branding and governed CTP labels, thresholds and pinned versions; no copied universal score.
- Blank customer intent, required rationale, independent QA and final customer authority.
- Immutable signed packs and response versions, exact source provenance, substantive QA rework and closure-proof suitability.
- Supplier isolation from internal findings and customer decisions.
- Real interaction and state-transition evidence rather than screenshot-only completion.

## Recommended sequence

1. Correct scope precedence and the S02/search instructions before assigning work.
2. Pin the baseline, refresh obsolete shell screenshots, and annotate already fixed or retired entries.
3. Add current profile/appearance rules and separate demo, production and review-tool deliverables.
4. Turn remaining screen differences into tasks against the current build, then verify the stated workflow branches and viewports.

No application changes, deployment or fresh live-workflow certification were performed for this document review.
