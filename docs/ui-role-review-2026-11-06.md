# Role UI review · 6 November 2026

Review requested after the wide-desktop O02 screenshot. Review first, record findings, then implement and recheck.

Browser: Ego Browser task space 3. Live baseline: cf1f47c48949. Reviewed customer routes C01–C16, analyst routes O01–O16, QA reviewer O02/O04/O08, A01 administration and S01–S03 supplier screens at wide desktop; targeted desktop/mobile role checks follow the fixes. Ego CDP screenshot capture timed out; the same Ego window was also captured through native app screenshot support.

| ID | Reproduced issue | Cause and planned fix | Status |
| --- | --- | --- | --- |
| UI-01 | Analyst assessment is split into narrow columns with gates, scope and title misplaced. | Legacy desktop `main:has(.analyst-assessment)` grid and explicit child placement conflict with the new sections. Remove the obsolete layout block and keep grids local to assessment content. | Verified |
| UI-02 | Analyst/QA assignment count overlaps the workspace heading; lower sidebar tools fall outside short windows. | The fixed flex sidebar squeezes the workspace and cannot scroll. Prevent shrinking of its sections and allow vertical sidebar scrolling. | Verified |
| UI-03 | Customer outcome radios, supplier choices and administration checkboxes have oversized input boxes. | Shared text-input styling gives radio/checkbox/file inputs a 44px minimum height and padding. Limit text-field sizing to appropriate inputs and preserve touch-sized labels. | Verified |
| UI-04 | An unsubmitted supplier receipt screen still says the team can review submitted evidence. | Static S03 subtitle contradicts the missing-receipt state. Derive the heading/subtitle from the actual selected item receipt. | Verified |
| UI-05 | Only one customer identity is selectable from the customer workspace card. | Add Ridgeway Finance / T. Singh, expose a sidebar customer selector, retain single-customer access and separate drafts/receipts/filters; prevent Cedar workflow data appearing in Ridgeway. | Verified |

| UI-06 | Supplier-review tables escape the page at 1024px; overview, risk and Client 360 tables escape at 768px. | Shared table containment only existed below 640px. Give table wrappers width limits and internal horizontal scrolling at every breakpoint; bound tab widths. | Verified |

| UI-07 | Floating presenter toolbar covers the intake action and intercepts clicks. | Reserve a bottom dock for demo controls and scroll the workspace above it; reset workspace scroll on navigation. | Verified |

Verification must check useful section widths and stacking, sidebar content containment, input bounds, scoped customer switching and real interactions. A page with no horizontal overflow alone does not establish correct layout. Automated checks and browser evidence will be recorded after fixes, before publishing the replacement v2 build.

Interaction checks already completed in Ego: actual intake button hit-test and click; independent Northstar/Ridgeway committed service drafts restored after switching; Ridgeway intake with Unknown facts submitted to its own durable session receipt; Ridgeway request visible in its register and absent from Northstar. New request activity is attributed to its actual new engagement and named customer actor. Final viewport and publish verification are recorded after completion.

## Verification

- `npm test`: 66 checks pass. Production build and database-reference validation pass.
- Ego computed-layout assertions: 544 cases across customer A. Morgan, customer T. Singh, analyst01, QA reviewer02, Superadmin and Supplier. Widths: 390, 768, 900, 901, 1024, 1280, 1500 and 1920px.
- Assertions include normal page stacking, full-width readiness gates, workspace text containment, document AND inner-workspace horizontal overflow, radio/checkbox bounds, intended role access and separation between workspace and presenter dock. The 1024/768px table regressions were reproduced before the correction and pass afterwards.
- Native screenshots of the Ego window confirmed wide assessment, QA, administration, supplier request and both customer overviews. The original page-wide grid and overlapping assignment count are corrected.
- Customer switching was also exercised through the native customer selector. Per-customer committed intake drafts restore independently; an actual Ridgeway request retains Unknown business facts, gets its own receipt, appears in Ridgeway and stays absent from Northstar.
- This is representative visual inspection plus a broad layout/interaction matrix. It does not establish pixel-perfect parity with every concept PNG or production tenant security.

## Published replacement

- Target: https://osura-v2.dev.fems.education/
- Code snapshot `929cf44f5b50`, branch `feat/osura-v2-decisions`. Coolify service `ebmzph9q24sckudcsrr8y0eh`, activity 44 finished successfully (exit 0), image `osura-interactive-demo:929cf44f5b50` healthy.
- All eight public HTML/JS/CSS/data/schema files match the local verified build by SHA-256. Assets: `index-CSaULzs4.js`, `index-DJc10K48.css`.
- Live Ego checks confirm both sidebar customer choices, only Clearbridge/Kite in Ridgeway's portfolio, a normal block assessment page with 1200px gates at a 1480px viewport, assignment text fitting its workspace card and a separate presenter dock.
- The original demo still runs its unchanged healthy `osura-interactive-demo:72b26d3` image.

Additional live verification completed all remaining QA-role routes at the same eight widths (96 additional cases, bringing the total to 544). Print emulation restores an unbounded, visible-overflow workspace, hides the presenter dock and retains the prepared-reference label. Final activity verification confirms the new Ridgeway request is attributed to T. Singh, Ridgeway Finance and its actual submitted service, rather than Clearbridge's existing engagement.
