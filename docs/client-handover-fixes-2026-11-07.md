# Client handover review fixes · 7 November 2026

This follows [Claude's review of snapshot e0450282f4de](claude-client-handover-review-2026-11-06.md). The owner approved fixing the findings and deploying the replacement to the separate v2 demo.

| Finding | Implemented correction |
| --- | --- |
| P1-1 · Handoff scope and truthfulness | Corrected Kite's Ridgeway tag, linked each fixture to an engagement ID, and require both accessible engagement and matching workspace before exposing a handoff. Cedar's status and next owner derive from the current workflow. Kite describes analyst triage, with no delivery claim. Each handoff opens its actual case. |
| P1-2 · Squeezed text | Readiness, blocker, outbox and list-row text have a real flex basis. Buttons and badges wrap into another row before squeezing the text; narrow Connected records fields stack. |
| P2-1 · Customer headers | O02 uses the selected engagement's customer; O11 uses the topbar customer scope or Assigned customers. |
| P2-2 · Unsigned monitoring | Monitoring naming is consistent; unsigned copy says the decision stays frozen once signed. Required proof describes a review record. |
| P2-3 · Portfolio preview states | Non-Cedar C06/C08/C09 headings show the service's actual stage and preview status. Scoped search offers a decision preview without claiming readiness. |
| P2-4 · Guided example hint | Ridgeway's hint names the demo-bar Guided example and explicitly explains its switch to A. Morgan and Northstar. |
| P2-5 · Due dates and owners | Past engagement dates carry an Overdue label. Non-Cedar queue/card owners are labelled Business owner. Intake receipts name the assigned Osura analyst as the next triage owner. |
| P2-6 · QA instructions | Recorded QA has inspection copy; unauthorized or non-independent viewers are directed to a different permitted reviewer. The customer decision-maker is named from the workspace. Mutation permissions remain enforced independently. |
| P2-7 · Response preview | An empty O06 describes a prepared example without claiming a queued supplier re-review. |
| P3 · Supplier response wording | Osura reviews the response. Unavailable evidence is not described as a document. Cannot-provide requires a reason, not a coverage answer; stale file/scope values are not retained in its receipt. Evidence/alternative coverage validation and immutable revision history remain enforced. |
| P3 · Draft feedback | Untouched supplier forms show Response not started / Required, with no saved-draft claim. |
| P3 · Decision validation | Missing outcome, blank rationale and incomplete obligation fields receive specific feedback and focus. |
| P3 · Case CTA and duplicate filter | O01 says Open case. O16 uses the topbar Customer filter and no longer has a second customer selector or stored hidden customer subfilter. |
| P3 · Small labels | Retained intentional 11px eyebrows/badges; body text was not reduced to mask layout defects. |
| Live-check follow-up · Cached metadata | Existing browser sessions could combine the new JavaScript with older unversioned JSON. Bootstrap requests now bypass the HTTP cache, and the v2 Nginx metadata responses use Cache-Control: no-store. |

## Verification

- `npm test`: 76 checks pass, including malformed handoff scope, unavailable-response validation/history, live handoff readiness, scoped preview/header copy, QA/monitoring language and overdue-date boundaries.
- `npm run generate:db` completed; generated database references remain current.
- Production build passes.
- Ego layout verification passed 80 cases: all 36 routes at 390px and 1440px, plus C09/O02/O08/O14 at 768px and 1024px. Checks cover document/workspace overflow, unresolved template tokens and text columns narrower than 120px. At 390px, O08's readiness text is now 279px wide (previously about 32px), C09's blocker text 320px, and O14 thread text 234px.
- Interaction checks passed Northstar-only QA handoff scope, both topbar customer filters, the real Kite handoff click, Ridgeway O02/O11 headers, topbar-only directory scope, stage-aware Ridgeway previews/overdue date, and the explicit guided-example identity hint.
- A cannot-provide response submitted with no coverage answer produced R01, invalidated readiness and immediately changed Cedar's handoff to Evidence re-review required / Analyst. A revised response produced R02 while retaining R01. After reset, whitespace decision rationale showed the specific error and focused the rationale field. No customer decision was recorded.
- Native screenshot capture remains unavailable in Ego; these are DOM geometry, rendered-text and interaction checks, not pixel comparison. The earlier review's unchanged print/full-keyboard and other workflow coverage limits remain explicit.
- Live deployment: snapshot `1c503816d7b7`, branch `feat/osura-v2-decisions`, target https://osura-v2.dev.fems.education/. Coolify service `ebmzph9q24sckudcsrr8y0eh`, activity 50 finished with exit 0; container `web-ebmzph9q24sckudcsrr8y0eh` is healthy on `osura-interactive-demo:1c503816d7b7`.
- All 10 public HTML/JS/CSS/font/data/schema files match the verified local build by SHA-256. Assets: `index-D3r2vyz2.js`, `index-oFTsz9gI.css`. All five unversioned JSON/schema responses carry `Cache-Control: no-store`.
- Live Ego checks in the same browser that previously held the older JSON confirm Northstar-only QA sees two Northstar handoffs, the Ridgeway filter shows Kite's triage handoff, and C09/O08/O14 retain readable 320/279/234px text columns at 390px with no document or workspace overflow. The TaskSpace was closed after successful verification.
- The separate original demo remains healthy on unchanged `osura-interactive-demo:72b26d3`. Source snapshot `ba34f0dabd7c` was the first handover fix release; `1c503816d7b7` adds the verified metadata cache correction.

The demo remains synthetic and session-only. The fixes do not add authentication, live billing, durable records, external messages or real uploads.
