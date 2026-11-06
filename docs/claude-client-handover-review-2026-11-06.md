# Client handover review · live v2 demo · 6 November 2026

Reviewer: Claude (independent review sub-agent). Scope: review and suggestions only. No source edits, commits, pushes or deployments.

- Target: https://osura-v2.dev.fems.education/. Loaded assets `index-CK4hZvZo.js` and `index-Dw2nH0R3.css` match the stated deployed snapshot `e0450282f4de`.
- Browser: Ego CLI, one TaskSpace (**id 5**, page `p1`), closed at the end with `finish({ keep: [] })`.
- Evidence directory: `/tmp/osura-claude-handover/`. It contains route-scan JSON (`scan-*.json`), captured page text (`texts-1440.txt`), the audit script (`audit.js`) and interaction scripts (`_i*.mjs`).
- **Screenshot limitation.** `page.screenshot()` failed once with `CDP request timed out: Page.captureScreenshot` after 15 s. No screenshots were taken, and no native-window capture was used. All visual findings below come from computed DOM geometry, hit-testing and rendered text. Nothing here is a pixel-level visual check.

## Verdict

- **Deployed snapshot `e0450282f4de`, as it stands: not ready for client checking**, because of P1-1 and P1-2.
- **After the two P1 fixes are applied, manually redeployed to Coolify and re-checked at 390 px: ready with known demo limits.** Source changes do not update the v2 host automatically.

The core story holds up in real interaction:

- Customer authority, blank intent, independent QA, versioned supplier receipts and readiness invalidation all behaved correctly.
- The guided example covers all nine handoffs and never signs anything.
- Reset demo and the profile, billing and logout actions work.
- No page overflows horizontally at 390, 1024 or 1440 px.

Two problems would be visible to a careful client and should be fixed before handover:

1. **Scope leak on the analyst command centre.** QA reviewer 02 is assigned only to Northstar, yet sees a Ridgeway handoff. That handoff also makes a false "delivery confirmed" claim (P1-1).
2. **Crushed text columns on mobile.** On key readiness and QA screens, text shrinks to 32–88 px wide instead of wrapping (P1-2).

Both have one-line or few-line root-cause fixes. The leak is limited to the handoff fixture: QA reviewer 02's workspace search returns 0 results for "Kite", "Clearbridge" and "Ridgeway".

## Findings

### P1 — fix before client checking

**P1-1 · O01 "Delivery and handoffs" leaks Ridgeway to a Northstar-only analyst, makes a false delivery claim and does not track live state**
- Role/viewport: Analyst · QA reviewer 02 (assigned to Northstar only), and Analyst 01 with Customer filter = Northstar. Viewport 1440.
- Repro:
  1. In Demo user, select `analyst-02`. Open `#O01`. In the right rail, under Delivery and handoffs, the second row reads "Ridgeway · Kite Legal · Supplier response · delivery confirmed". QA reviewer 02's own Customer filter offers only "Northstar Payments".
  2. Click that row. Nothing happens (`O01` → `O01`); it is a dead CTA.
  3. As `analyst-01`, set Customer filter = Northstar. The Ridgeway row is still shown. Set Customer filter = Ridgeway. The rail is empty.
  4. As the supplier, submit an item on S02. As `analyst-01`, row 1 still reads "CedarCloud · Customer decision · waiting for sponsor". Meanwhile O02 and C09 correctly say "Customer decision is paused · Evidence re-review required · Next owner: Analyst".
- Observed:
  - A record for an unassigned customer is visible.
  - "Delivery confirmed" is shown for Kite Legal, but O14 has no Kite thread, and O01 lists Kite as "New request awaiting analyst triage".
  - The Cedar handoff contradicts the live readiness state.
- Why it matters: the demo's core claims are assigned-customer scope ("Delivery status you can trust") and "A queued message is never a delivery receipt". The first panel an analyst sees breaks both.
- Root cause (source): `public/data/presentation.json` → `operationsHandoffs[1]` is `["Ridgeway · Kite Legal", …, "northstar"]`, so it carries the wrong scope tag. `access.mjs:70` filters on that tag. `main.jsx:2276` renders the static fixture text.
- Minimal fix:
  - Retag that row as `"ridgeway"`.
  - Change its detail to something O14 can back up, such as "New request · awaiting analyst triage". Alternatively, add a matching O14 thread.
  - Derive row 1's detail and owner from `workflowStatus` for Cedar, or label the rail "Prepared examples".
- Evidence: `_i23.mjs` output (`a02handoffs`, `kiteClick`, `a01NorthstarHandoffs`, `a01RidgewayHandoffs`); `_i21b.mjs` (live Cedar state after the supplier response).

**P1-2 · Flex rows shrink text instead of wrapping (mobile readiness, QA and outbox)**
- Measured with the Ego computed-layout audit (`audit.js` "squeezed" check) plus ancestor-chain probes:

| Page · role · width | Element | Measured |
| --- | --- | --- |
| C09 · A. Morgan · 390 | `.case-blocker` text column "Choose your organisation's outcome / Read the recommendation…" beside the 217 px "Make your customer decision" button | **88 px wide, 155 px tall** |
| O08 · analyst 01/02 · 390 | `.case-readiness.ready` banner text "Ready for customer decision / Next owner: … Record your independent challenge…" | **32 px wide, 647 px tall** (about one word per line) |
| O14 · analyst 01 · 390 | `.op-thread-row` text "AI-2026-117 · Risk contact · 1 requested item" | **21 px wide**, thread row 501 px tall |
| O08 · analyst · 390 and 1024 | `.list-row` "Material claim / Payment service recovery exercise coverage" beside a 256 px no-wrap badge | 53–59 px wide |
| O02 · analyst · 1024 | "Connected records" `dl.fields` row, "Control coverage" value in the 220 px right column | 88 px wide, 129 px tall |
| O02 / O03 / C09 · 390 | "BCP v2 · p8 + Test v1 · pp2–4" table cell | 83 px wide (inside a scrollable table; minor) |

- Repro: select the role, open the hash route, set the viewport to 390×844 (or 1024×768), then read the rects in the evidence files. With screenshots unavailable, these are the shape of the defect, not a visual image.
- Why it matters: C09 is the customer's "your decision is ready" page. On a phone the explanation beside the primary CTA becomes a narrow sliver. The O08 QA banner becomes a 650 px column of single words. The defect shows immediately on any mobile check.
- Root cause (CSS): `case-layouts.css:20/36` and `operations-layouts.css:153` give the text child `flex: 1; min-width: 0`, which is a basis of 0. Their siblings, `.button` and `.badge`, are `flex-shrink: 0`. With `flex-wrap: wrap`, a 0-basis item never forces a wrap, so it shrinks to almost nothing. `.list-row` is `nowrap` with a fixed-width badge.
- Minimal fix: give the text child a real basis, for example `flex: 1 1 14rem` on `.case-readiness > div`, `.case-blocker > div` and `.op-thread-row > span:nth-child(2)`. At ≤640px, let `.list-row` wrap and allow `.badge` `white-space: normal`. Re-run a "text width < 120px" assertion at 390/768/1024. The earlier 544-case matrix checked overflow and gates but not this.
- Evidence: `scan-c390.json`, `scan-a390.json`, `scan-a1024.json`; `_sq.mjs`, `_sq2.mjs` and `_sq3.mjs` outputs.

### P2 — polish (visible wording, scope or status inconsistencies)

**P2-1 · O02 and O11 headers say "Northstar Payments" for Ridgeway records.** As `analyst-01`, set Customer filter = Ridgeway.
- `#O02` shows h1 "Clearbridge Data · assessment" with the subtitle **"Northstar Payments · File transfer"**, while the body says Customer = Ridgeway Finance.
- `#O11` shows the eyebrow "NORTHSTAR PAYMENTS SERVICE HEALTH" and the subtitle "Northstar Payments · delivery health…" while listing only Ridgeway rows. It shows the same header under "All assigned customers".
- Cause: `screens.json` hard-codes `O02.subtitle = "Northstar Payments · {service}"` and the O11 subtitle.
- Fix: show the selected engagement's customer in the O02 subtitle and the current filter (or "Assigned customers") in O11. Use either a `{customer}` placeholder, if the title resolver supports one (not verified), or a title override in `main.jsx` like the existing O06/C08 overrides at lines 350/632.
- Evidence: `_i2.mjs`, `_i3.mjs`.

**P2-2 · C08 contradicts itself before any decision.** As Morgan, open `#C08`. The h1 is "Assurance preview · no customer decision", but the hero says "The signed decision stays frozen". The hero card's "Required proof" for Atlas is an action ("Review the scoped source and record the next step"), not proof. One destination also has three names: sidebar "Monitoring", breadcrumb "Active supplier assurance" and the h1. Fix: make the hero sentence conditional on `state.decision`, for example "Once signed, the decision stays frozen…". Evidence: `texts-1440.txt` (C08 block).

**P2-3 · Ridgeway C08, C06 and C09 headings claim states that do not exist.** As T. Singh:
- `#C08` reads "Clearbridge Data · assurance after the customer decision", but there is no decision and Clearbridge is at the Evidence stage.
- `#C06` is titled "Make your customer decision", and the crumb reads "Ready for customer decision", for a record in Evidence.
- C06 is reachable through workspace search: "decision" returns "Decision ready · C06 · Customer decision".

Fix: for portfolio previews, use neutral titles such as "Service preview · {stage}". Evidence: `texts-1440.txt` (customer-singh blocks), `_i1.mjs` (`search_decision`), `_i22.mjs`.

**P2-4 · Ridgeway's in-page guided-example hint points to an impossible action.** As T. Singh on `#C01`, "Explore the prepared example" is disabled with the text "Select Northstar Payments for the full guided example." The customer selector no longer exists. Meanwhile the dock's **Guided example** button works and silently switches to A. Morgan (verified: `customer-singh` → `customer-morgan`). Fix: change the text to "Use **Guided example** in the demo bar (switches to A. Morgan · Northstar)". Alternatively, wire the button to the same `startTour`. Evidence: `_i8.mjs` (`singhGuide`).

**P2-5 · Past due date with no overdue signal.** Clearbridge's due/next date is **05 Nov 2026**, one day before the review date and the session receipt date, which is shown as "06 Nov 2026". It appears without an overdue marker on O01 ("Due 05 Nov 2026"), C15, C09 and C08. Separately, O01 cards label the engagement's business owner as "Next owner" for every non-Cedar row (L. Reed, J. Patel, E. Wright, S. Clarke, T. Singh). Only Cedar's next owner is derived from workflow state. This is most visible on Ridgeway: "New request awaiting analyst triage · Next owner: T. Singh", although triage is the analyst's job. Fix: move the fixture date forward, or flag it as overdue. Either relabel non-Cedar rows "Business owner", or derive the next owner from the stage, for example "Osura analyst" for triage or evidence. Evidence: `texts-1440.txt` (analyst-01 O01), `_i22.mjs`.

**P2-6 · O08 for the lead analyst reads as both done and actionable.** As `analyst-01` on `#O08`, the banner says "Ready for customer decision. Next owner: Customer Decision Owner. **Record your independent challenge and a reasoned QA outcome.**" The rail says "QA permission: Not granted", and the page names the decision-maker "Northstar sponsor" (also used in O01 "waiting for sponsor"). Every other page uses "A. Morgan · Customer Decision Owner". The block itself works: "Record QA outcome" shows "Independent QA permission is required." Fix: when QA is already recorded or the viewer lacks permission, drop the imperative sentence. Replace "Northstar sponsor" with the Decision Owner name. Evidence: `texts-1440.txt`, `_i5b.mjs`.

**P2-7 · O06 preview subtitle claims something is queued when nothing is.** With no supplier response, h1 "Supplier response preview · no session response" sits above the subtitle "Only the affected control **is queued** for targeted re-verification." Fix: make the subtitle conditional. Evidence: `texts-1440.txt` (O06).

### P3 — optional

- **S03 receipt wording.** It says "Northstar Payments' assurance team can now review the submitted evidence", but the response was cannot-provide, and the same page later says "Osura reviews this exact version". O06 then calls it "The new document…" although no document exists. Use "Osura's assurance team can now review your response."
- **S02 cannot-provide form.** The helper text under "Why is the evidence unavailable?" still says "Describe the exact service, date, data and known limits". The coverage question ("Does this cover the contracted service?") is still required for an unavailable response, which is confusing. The S01/S02 rail also shows a "Draft" badge and "Draft saved in this session" before anything has been typed.
- **C06 validation.** With an outcome selected and a whitespace-only rationale, the error says "Choose an outcome **and** enter your own decision rationale." Focus stays on the submit button instead of the rationale field. Whitespace is correctly rejected.
- **O01 CTA label.** "Open decision →" opens the analyst assessment (O02), not a decision. "Open case →" would be more accurate.
- **O16 "Directory customer" select.** With the topbar filter on Ridgeway, this in-page filter offers only "All customers / Ridgeway Finance", and choosing "All customers" still shows only Ridgeway suppliers. It respects the topbar scope and belongs to approved CONCEPT-15. It is still a second customer control, so the owner should confirm it is wanted, given the "top-right only" instruction (`_i27.mjs`).
- **Small labels.** Eyebrows, entity icons and badges are 11px throughout (typically 3–60 instances per page). This is acceptable for labels; just keep body text at 12px or above.

## Verified as working (real interaction)

- **Customer decision (C06).** Nothing is preselected. Review with no choice is blocked. Approve-with-conditions reveals obligation fields, which are blank until "Use proposed obligation" is clicked. A whitespace-only rationale is rejected. The unsaved-draft guard ("Leave with unsaved changes?") appears; Keep editing retains the choice and rationale, and Discard continues. No decision was recorded.
- **Independent QA.** Lead analyst 01 is blocked ("Independent QA permission is required."). QA reviewer 02 shows "QA permission Enabled".
- **Supplier (S01→S02→S03).** There is no sidebar and no profile menu. The supplier submitted a cannot-provide response after review and confirm. Receipt `CC-2026-104-R01` v1 is "Pending review · not marked verified", 1 item remains, and the page offers "Create a revised response". Analyst O02, C09 and O06 then correctly switch to "Customer decision is paused · Evidence re-review required · Next owner: Analyst". The customer C01 hero no longer asks for a decision. The A01 activity log shows the supplier action.
- **Reset demo.** It has a confirmation dialog. After reset, Cedar returns to "CedarCloud needs your decision" and S01 to 0/2.
- **Guided example (Morgan).** It covers 9 steps: C01 → O04 → O05 → S01 → O04 → O08 (analyst-02) → C06 → C07 → C08. It switches perspective only, never signs, ends as Morgan on C08 and does not overlap the page heading.
- **Customer scope.** T. Singh's search for "Cedar" or "Northstar" returns 0 results ("Ridgeway Finance · authorised records only"); "Kite" returns only Ridgeway records.
- **Analyst Customer filter.** It is top-right only, with no sidebar card for any role. The O11 "Filter customers" button focuses the topbar filter.
- **Profile menu.** It sits inside the viewport above the profile and contains Notifications, Account, Change password, Billing and Log out. Billing reads "No subscription connected · None connected · No invoices". Log out shows a confirm dialog, then "Demo session ended … Resume as A. Morgan"; resume returns to C01 with the same identity.
- **Mobile.** "Open navigation" moves focus to Close navigation, and Escape returns focus to the opener. "Demo tools" exposes Demo user, the route button, Guided example and Reset inside the viewport. The 0.2 s drawer animation took about 1–2 s in the Ego tab, likely background-tab throttling; I am not reporting that as an app defect.
- **No horizontal overflow** (document or app pane) on any route scanned at 390, 1024 or 1440. No raw template tokens (`{supplier}`, `undefined`, `NaN`) were found. Hit-testing found no action covered by the presenter dock, using the pane-clipped audit. That audit covered the 1024/390 scans, plus a 1440 re-check of O01, O05, O15 and C08, where the first unclipped audit had false positives (`_i27.mjs`).

## Coverage

| Role | 1440×900 | 1024×768 | 390×844 |
| --- | --- | --- | --- |
| Customer A. Morgan | C01–C16 (16) | C01–C16 | C01–C16 |
| Customer T. Singh | C01, C06, C08, C09, C15, C16 (text) | — | C01, C14, C15, C16, C08 |
| Analyst 01 | O01–O16 (16), plus all 16 under Customer filter = Ridgeway | O01–O16 | O01–O16 |
| QA reviewer 02 | O02, O04, O08, O01 | — | — |
| Superadmin | A01 | A01 | A01 |
| Supplier | S01–S03 | — | S01–S03 |

The automated audit checked each route for document/pane horizontal overflow, unclipped off-viewport elements, ellipsis/clipped text, squeezed text columns, sub-12px text, unresolved tokens, dock/overlay hit-tests and unnamed controls. All 35 original routes plus A01 were scanned under their intended roles at least at 1440 and 390.

**Not checked:**

- Actual screenshots or pixel comparison with the concept PNGs (CDP capture times out).
- 768/900/1280/1920 widths, except as covered by the earlier 544-case matrix.
- Print output.
- Keyboard-only traversal of every page; focus was checked only for the mobile drawer, the decision form and the profile menu.
- Intake C02–C05 submission, finding creation (O07), condition closure (O09), O14 retry action, superadmin add/edit analyst, and supplier revision R02. These were not re-run here; earlier docs record them as verified.
- Recording a customer decision and the signed C07 pack. I deliberately did not record a decision.

The supplier cannot-provide submission was session-only and its workflow state was cleared by Reset demo. As the Reset dialog states, its accountability-history entry stays in that tab until refresh. The tab was closed with the TaskSpace.

**Unclassified observation:** the `/tmp/osura-review/` directory already contained unrelated files from another session (panel PNGs and PDFs). I did not use or modify them; my evidence is in `/tmp/osura-claude-handover/`.
