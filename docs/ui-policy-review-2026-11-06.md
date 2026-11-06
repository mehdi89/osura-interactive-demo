# Live UI and policy review — 6 November 2026

Reviewed `https://osura-v2.dev.fems.education` with **Ego Browser**, using a fresh synthetic session. Deployed assets matched commit `b260304`: `index-BEmAicft.js` and `index-ndnl_ZV6.css`. No application code, seed data or deployment was changed.

Criteria: the approved D01–D16 final call sheet, CTP methodology boundaries, versioned evidence, independent QA, attributed actions and customer decision authority. Explicitly deferred features were excluded.

## Resolution

The seven findings below were subsequently corrected on `feat/osura-v2-decisions`; their original reproductions are retained as the review record. Additional identity attribution, Inventory count and text-contrast omissions were also corrected. See [decision-file-completion.md](decision-file-completion.md) for exact scope and verification.

## Original findings

### 1. P1 — QA rework can be released after an unchanged save (D02)

1. As Analyst 01, save an R-07 judgement on O04.
2. As QA Reviewer 02, record Send back, asking for a revised recommendation.
3. Return as Analyst 01 and save the existing review without changing its judgement, conclusion or recommendation.
4. As QA Reviewer 02, accept it; switch to Customer and open C06.

**Observed:** the unchanged save satisfies the revision barrier. C06 reports Ready for customer decision and enables Record decision. The original judgement remained “The recovery target is documented; scoped exercise evidence is still incomplete.”

**Required:** an actual revision or explicit resolution of the QA challenge must satisfy rework; pressing Save alone must not. `src/state.mjs:178` increments the analysis revision unconditionally; `:209` checks only that counter.

Evidence: `/tmp/osura-ui-audit/qa-unchanged-save.txt`.

### 2. P1 — Equal filenames mix evidence versions (D08)

1. As Analyst 01, add an ordinary R-07 evidence upload named `same.pdf`.
2. As Supplier, submit a newer recovery response also named `same.pdf`, with a distinct answer.
3. Return to O04 as Analyst 01.

**Observed:** the source heading shows the older `upload-…` version and the metadata-only passage. The provenance panel shows the newer `CC-2026-104-R01` supplier receipt. The new supplier answer is absent from the main evidence view.

**Required:** select the source consistently by evidence identity/version, not filename. Source heading, passage, date and version must refer to the same record. Relevant selection: `src/main.jsx:239` and `:258`.

Evidence: `/tmp/osura-ui-audit/source-collision.txt`.

### 3. P1 — Atlas monitoring opens CedarCloud's selected condition (D01)

1. As Customer, open Monitoring (C08).
2. Click View review on the Atlas Identity / Document expiry row.

**Observed:** C12 opens with Atlas Identity in the scope banner, but CedarCloud / Payment event processing / R-07 selected in the condition panel. The user must manually select Atlas's finding to reconcile the page.

**Required:** preserve the selected supplier/service and open its own finding or scoped preview. The customer monitoring handler routes every row to C12 (`src/main.jsx:3550`); Findings initially selects the first global result.

## Further corrections

### 4. P2 — Closure displays the wrong evidence file (D08, D15)

1. Record a conditional customer decision.
2. Subsequently add ordinary evidence `closure.pdf` as Analyst 01 and review R-07 as Supported.
3. Open O09.

**Observed:** verification is enabled and the badge reads Reviewed newer evidence, but the displayed file is the older supplier `same.pdf`. `closure.pdf` is not mentioned. The closure eligibility helper accepts ordinary uploads, while the view reads only `supplierReceipt` (`src/main.jsx:4363`).

**Required:** show the exact eligible version, received date and review used by the closure gate. In a session without a supplier receipt, this same display path would show no new evidence despite an eligible upload.

Evidence: `/tmp/osura-ui-audit/closure-provenance.txt`.

### 5. P2 — QA-stage work disappears from the risk matrix (D02)

1. Save an analyst review on O04, making independent QA the next owner.
2. Open O01.

**Observed:** the queue includes CedarCloud as QA / Independent QA required. The matrix has Request, Evidence, Questions, Findings and Decision columns, with no QA column; the Critical row has no CedarCloud count.

**Required:** include every emitted workflow stage, including QA, or map stages explicitly without omitting open work. Matrix stage list: `src/main.jsx:1398`.

Evidence: `/tmp/osura-ui-audit/missing-qa-matrix.txt`.

### 6. P2 — Evidence summary counts do not follow saved conclusions (D02, D16)

1. Review the new R-07 evidence as Supported and save.
2. Open O02 Summary (also applicable to C09).

**Observed:** the requirement table shows R-07 Supported, but Current outcomes and Control coverage retain “10 supported · 1 partial · 1 unknown”. Those summaries remain fixed strings (`src/main.jsx:2380` and `:2396`).

**Required:** derive the displayed evidence-support counts from the same current conclusions, or clearly label a separate prepared example rather than presenting it as current.

Evidence: `/tmp/osura-ui-audit/stale-evidence-summary.txt`.

### 7. P2 — Unsigned prepared condition is labelled as a customer obligation (D03, D04)

1. In a fresh customer session, open C08 and C12 before recording a decision.

**Observed:** C08's title correctly says no customer decision, but its metrics say 1 Open condition. C12 calls it an Approval condition and its Treatment reads Customer approval condition. No customer has signed it. The prepared fixture's Open condition state takes precedence over the proposed-condition label (`src/main.jsx:2575`).

**Required:** consistently mark this as Proposed / prepared until a conditional customer decision exists, including counts and treatment text.

## Checks that passed

- Customer intent starts blank and requires scoped confirmation.
- Analysts get a read-only customer decision view; Superadmin and Supplier cannot access the signing form.
- The reviewed cases still keep CTP inherent risk distinct from evidence support and customer decisions; no risk-engine or threshold change was proposed.
- At 390px, C01, C14, C15, C06, O04, O08, O15, S01, S02 and A01 all measured 390px document scroll width. Wide tables stayed contained. Measurements: `/tmp/osura-ui-audit/mobile-layout.json`.
- No real data, provider messages or external uploads were used. Only synthetic metadata and browser-local workflow actions were created.

## Limits and next step

Both normal Ego screenshot capture and its raw CDP capture path timed out. This review confirms live interactions, rendered text, selected state and measured layout; it does not claim a completed pixel-level visual review or physical-device/accessibility sign-off.

Fix findings 1–3 before another unrestricted client walkthrough; then correct findings 4–7 and repeat these exact reproductions. No fixes or redeployment were performed as part of this review. Ego reported an available update; it was not installed.
