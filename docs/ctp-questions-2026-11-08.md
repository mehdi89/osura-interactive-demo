# Supplied CTP business impact questions · 8 November 2026

The interactive demo now uses all 17 questions verbatim from `CTP_17_Questions_Simple_Guide (1).docx`: five Confidentiality, five Integrity and seven Availability scenarios. The source's OOXML tables and extracted text agree. It supplies question numbers but no technical canonical codes, so existing stable record IDs are retained and `canonicalCode` remains null.

## Behavior

- C04 retains the four existing service-scope questions separately, then asks the 17 impact questions with blank defaults. Choices are N/A, Low, Medium, High and unresolved Unknown.
- Continue and direct submission from C05 check every answer and focus the first missing question. Unknown is allowed for analyst clarification and stays visible in review; it never becomes No, N/A or a scored result.
- The guide's base asset-impact calculation uses N/A=0, Low=1, Medium=3 and High=5. It takes each category's maximum and then the highest category maximum. Any missing, invalid or Unknown impact leaves the overall summary incomplete. All-N/A is a valid zero.
- Drafts remain separate per customer and survive ordinary Back/Continue navigation. Changing the supplier or service scope clears the old scope facts and impact answers for reconfirmation, with feedback when previous impact answers existed.
- C05 and the request receipt show all questions and answers. Receipt JSON includes a snapshot of question IDs, wording, categories, answers, source attribution and base-impact summary. Later edits to question definitions cannot rename a submitted answer.
- The normalized model and base calculation require the full 17-question, 5/5/7 structure. BIA answers must match the engagement's pinned core question policy. N/A and Unknown are supported by the schema and generated database reference.

The old 17 prepared BIA answers were removed because the previous confidentiality and integrity questions described different scenarios. O12 now shows the supplied questions with Not answered instead of attributing those old answers to new wording. Existing prepared risk tiers remain explicitly synthetic; new requests remain Pending triage.

The guide describes base asset impact and notes that other questionnaire inputs can affect full CTP calculations. This change does not introduce a final CTP inherent-risk engine, change thresholds, publish methodology, create supplier assurance conclusions, bypass independent QA or grant customer decision authority. It does not implement the separately discussed Cedarline scenario loader.

## Verification

- `npm test`: 91 tests pass. Added coverage checks verbatim wording, groups, category maxima, valid zero, unresolved/invalid answers, reduced-questionnaire rejection, policy scope, immutable receipt wording, initial blank controls and customer draft isolation.
- `npm run generate:db` and `npm run build` pass; the generated SQL references match the schema and data. No dependencies were added.
- Local browser interaction checks passed first/last missing-answer focus, correction clearing stale errors, direct-review submission blocking, Unknown remaining unresolved, High remaining the maximum, all-N/A zero, Back/Continue retention, Northstar/Ridgeway draft isolation and invalidation after a changed service.
- A real receipt JSON download contains all 17 answers, the correct selected service and a zero base-impact summary while retaining Pending triage.
- The final build passed 24 DOM/layout cases: C04 intake, C05 review, C09 submitted receipt and O12 CTP review at 1440px, 1024px and 390px in Light and Dark. No document/workspace horizontal overflow was found. Impact selectors retain 44px minimum height; read-only question rows use 14px text. O12 exposes all 17 unanswered questions without the old hardcoded High category badges.
- Browser verification used actual controls, rendered text and geometry, not screenshot pixel comparison. Evidence is in `/tmp/osura-ctp17-checks/`, including the downloaded receipt. The task-owned browser pages were closed after verification.

## Release status

Deployed to https://osura-v2.dev.fems.education with the client-theme release from source commit `bb8c605ccaa34eb9755c75d1818c8959709dd851`. Coolify activity **52** finished with exit code **0**, and the v2 container is healthy on image `osura-interactive-demo:bb8c605ccaa3`. All 13 public files match the verified build by SHA-256. Live intake verification confirmed all 17 blank selectors and their 5/5/7 category groups.

The original demo was not redeployed. This remains a synthetic interactive prototype; deployment does not imply production methodology acceptance. See [the client-theme release evidence](client-visual-theme-2026-11-08.md#release).
