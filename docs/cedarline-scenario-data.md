# Cedarline scenario data

`public/data/scenarios/cedarline.json` is a data-only scenario adapted to the existing demo contract. It does not change the installed schema, CTP methodology, workflow gates, decision choices, layouts or default CedarCloud JSON files.

## Contents and provenance

The supplied synthetic case is Northbridge Commerce Ltd assessing Cedarline Analytics Ltd's invoice reconciliation portal. Its source date is 5 November 2026. The pack preserves:

- All 14 supplier questions and original answers, 14 source analyst reviews, 10 buyer requirements, seven evidence records, three explicit missing-evidence records and seven unresolved findings.
- E07 corrections to Q03/Q04/Q08/Q09 alongside the original answers. Original response wording is never overwritten.
- Source history D01–D06 with its supplied timestamp precision. D06 `Not yet` is a pending prerequisite, not an occurred audit event.
- Source HOLD recommendation and Morgan Vale's historical **Deferred — NOT APPROVED** decision, with no risk accepted.
- All populated cells from the three source workbooks, including original source state strings, proposed developer tests and the stale heading that says no decision issued. These remain provenance, not implemented test results or current-session actions.

Eleven unmodified source assets are in `public/data/scenarios/cedarline-assets/`: seven evidence PDFs, the buyer decision PDF and three XLSX workbooks. `source.assets` records their URLs, MIME types, byte lengths, SHA-256 hashes and original archive paths. The ZIP itself is identified and hashed in `source.archive`. The colleague's prototype URL is retained as an interpretation reference, rather than the authority for original case facts.

The pack uses the agreed envelope: `format`, `version`, `id`, `name`, `description`, `workspace`, `presentation`, `examples` and `source`. It supplies no schema, screen catalog or executable code.

## Compatibility mapping

Stable internal IDs retain existing application bindings. They are aliases, not source identifiers:

| Application ID | Scenario meaning |
| --- | --- |
| `northstar` | Northbridge Commerce Ltd |
| `cedarcloud` | Cedarline Analytics Ltd |
| `cedarcloud-payment-event-processing` | Invoice reconciliation portal |
| `cedar` | Cedarline walkthrough engagement |
| `a-morgan` / `customer-morgan` | Morgan Vale / the corresponding demo customer identity |
| `R-07` | Source Q04, recovery time |
| `INC-03` | Source Q06, incident notice |
| `DATA-02` | Source Q07, deletion |
| `IAM-04` | Source Q08, universal MFA |
| `CL-Q01`, `CL-Q02`, `CL-Q03`, `CL-Q05`, `CL-Q09`–`CL-Q14` | The other 10 source questions, each with its own requirement/review row |

All 14 questions therefore remain distinct. Q05 RPO is not collapsed into the Q04 primary recovery slot. The full mapping is in `source.idMappings.requirements`.

Findings keep source IDs `F01`–`F07`, deliberately avoiding the app's special `F-01` recovery-condition slot. All remain `Awaiting evidence`, with the more precise source states, functional owners, related questions and proposed actions retained. No accepted customer condition or closure is manufactured.

The existing schema binds each document metadata row to one requirement. Consequently, seven original evidence files have **19 requirement-specific metadata projections**, identified in `source.documentProjections`. Repeated filenames and demo `v1` refer to the same supplied original bytes; they are not extra source files or invented supplier revisions. Page counts remain one and all source citations retain their page/section anchors.

## Current demo state versus source history

The current session has no decision, signed pack, supplier receipt or imported audit actions. QA starts at **More evidence required** with an explicit note that no source QA completion was supplied. Existing analyst, QA, administrator and supplier-contact accounts are demo assignments, not invented historical reviewers.

All 17 official CTP impact questions remain present and unanswered. No triage or BIA answers are inferred from the narrative; risk is **Pending triage**. The prototype's added High/Significant result is not imported.

The optional current-demo recommendation preset is **Return for clarification**, an already supported action suitable for unresolved gaps. It is an adapted preset, not a conversion of the source HOLD recommendation or historical deferral. Proposed condition input remains optional demonstration data, without approval or an obligation being created.

The existing prepared reference-pack view preserves **Deferred — NOT APPROVED** as historical text only. It has no condition and explicitly reports QA **Not recorded in source**, with no QA actor or timestamp. This does not add Defer as a live decision choice or bypass independent QA. The original owner timestamp is retained as `2026-11-05 09:00` without inventing a timezone; its prepared display uses the date only.

The active request uses exactly two existing slots, recovery and MFA, under demonstration ID `CL-DEMO-001`. It is labelled an adapted, unsent follow-up; it does not pretend to be the source's original 14-question packet. The demonstration email/domain and request due date are identified as added configuration. Original answers, follow-up and missing files remain readable in source-history data.

Unrelated Northstar portfolio records are removed. Ridgeway Finance and its two original demo services/customer assignments remain separate previews; presentation labels identify them as such, without attributing their data to Cedarline.

## Validation and limits

The fixture passes the existing `createModelValidator` using the unchanged workspace schema and projects successfully through `projectWorkspace`: 14 requirement/review rows, seven findings, 19 document projections and 11 source assets. Every copied asset's byte length and SHA-256 matches its manifest. The default workspace, presentation and examples JSON files are unchanged.

This fixture relies on the existing excerpt/metadata viewer; adding original-PDF viewing, live Defer, historical QA, an AI engine or a new assessment workflow is outside this data-only change. No source gaps, missing 2026 test, ISO certificate or signed subprocessor terms have been filled with invented evidence.

## Loading the scenario

Open **Scenario** in the existing bottom Demo tools bar. Pick **Cedarline manual assessment**, review the summary and choose **Load scenario**. The same dialog accepts `cedarline.json` from disk. Choose **CedarCloud reference** to restore the original data.

The loader uses the installed schema and screen catalog. It validates the whole compatible pack before replacing model, presentation and prepared examples together. Invalid files leave the active scenario untouched. Current review/QA/decision drafts use the existing unsaved-change guard. A successful load starts a fresh customer session at C01, clearing prior scenario edits, receipts, audit and decisions; appearance remains unchanged. Refresh restores the original default data. No scenario state is saved to local storage.

The only added control is Scenario and its pick/load dialog. Existing entity names, request descriptions and recommendation presets read from the selected data. All stylesheets, the default JSON files, workspace schema, workflow/state rules, access rules, outcomes and generated database references remain unchanged. The Cedarline JSON has optional data defaults for its existing-action recommendation, material-gap text and the two adapted request descriptions.


## Branch and checks

The completed theme/CTP/review baseline was fast-forwarded to remote `main` at `221408c3823d850895d24c0b2a28e96dab7637d8`. Scenario work is isolated on `feat/cedarline-scenario-pack` and has not been merged to main. Its v2 deployment is recorded below.

- All 102 tests pass, including every original regression test, import validation/rejection, all 36 existing screens rendered with Cedarline, source counts and all 11 asset hashes.
- The build and default database-reference validation pass. The CSS asset remains `index-Du4Qn3hm.css`, identical to the merged baseline.
- Browser checks passed built-in Cedarline selection, a real JSON file load, invalid-file rejection with the active customer intact, keeping/discarding an unsaved decision draft via the existing guard, restoring CedarCloud and a blank customer outcome/rationale, then reloading Cedarline.
- Independent source review found a remaining hardcoded closure service label; it now reads the selected scenario's service, with the original default wording preserved. The screen regression check covers both uppercase and lowercase old labels.
- All 36 Cedarline routes passed 144 browser layout/theme cases at 1440px and 390px in Light and Dark, with no document/workspace horizontal overflow or checked text-contrast failures. Evidence: `/tmp/osura-scenario-checks/layout-audit.json`.
- At 390px in Dark mode, the picker stayed within the viewport with keyboard focus inside the dialog, no horizontal overflow and a successful restore of the default scenario.

## Live release · 9 November 2026

Deployed to https://osura-v2.dev.fems.education from source commit `19d4103f9a54622b0f11f1bfea9d7f5b5fa13e3f` on `feat/cedarline-scenario-pack`.

- Coolify service `ebmzph9q24sckudcsrr8y0eh`, activity **53**, finished with exit code **0**. Container `web-ebmzph9q24sckudcsrr8y0eh` is healthy on image `osura-interactive-demo:19d4103f9a54`. The build bundle is retained at `/data/osura-demo/releases/19d4103f9a54`.
- Live JavaScript is `assets/index-Q7dH5GK3.js`; CSS remains `assets/index-Du4Qn3hm.css`. All **25** deployed files match the verified build by SHA-256, including the scenario JSON and 11 source assets. Data/schema/associated-source responses retain `Cache-Control: no-store`.
- Live checks passed built-in Cedarline selection, restoration of CedarCloud, rejection of an invalid local file without replacing active data, and loading the real Cedarline JSON file. C04 retains 17 blank CTP selectors; C06 retains blank outcome/rationale with the QA gate blocking recording. C07 shows all 14 controls and the watermarked historical deferral with source QA absent and no current signed decision.
- Nine representative customer, analyst, QA, supplier and admin screens passed **36** further live layout/theme checks at 1440px and 390px in Light and Dark, with no document/workspace horizontal overflow or checked text-contrast failures. Live evidence is in `/tmp/osura-scenario-checks/live-*.json`. Full workflow journeys were not repeated during deployment; the release uses the preceding 102-test/144-case verification.
- The original demo remains healthy on image `osura-interactive-demo:72b26d3`. It was not redeployed. No production application was changed.

The existing session limit remains: loading a scenario resets the current tab's demo actions; refreshing restores CedarCloud. The source case does not imply production authentication, an actual QA sign-off, supplier approval or accepted risk.
