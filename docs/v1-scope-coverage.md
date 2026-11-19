# Locked V1 scope coverage (19 November 2026)

Source: https://osura-demo.pages.dev/scope (40 V1 items, agreed 18 November 2026). This is a close interactive demo: storage, real upload/extraction and live AI arrive with the backend. Simulated capabilities are labelled in the UI.

| Item | Demo status |
| --- | --- |
| P2 persistence, P6 durable history, E7 drafts across refresh, A4 locked framework store | Backend build. The demo keeps everything in session memory and says so. |
| P3, E5 documents and page viewer | Synthetic PDF pack (`src/document-library.mjs` → `scripts/generate-pdfs.mjs` → `public/documents/`), native browser PDF viewer beside the note and in QA. Upload is simulated by choosing a pack file. |
| I1–I4 intake, supplier, facts, receipt | Covered. Dynamic question sets are a backend item. |
| R1 calculated risk | Demo rules v0: deterministic tier from impact answers and context facts with visible drivers; Unknown stays provisional; analyst confirms or overrides with a reason; a clarified fact recomputes. |
| R2 controls | Separate control library; rules apply controls with reasons; analyst adds or marks not applicable with reasons. |
| R4 rating separate | Inherent risk, evidence support, findings, recommendation and outcome are separate fields. |
| S1, S2 supplier requests | One consolidated, deduplicated request for every control still missing evidence; targeted follow-ups may or may not be tied to a control. Nothing is emailed. |
| E1–E4 evidence | Document metadata and replaces links; verified citations; rule-derived control status; claims and corrections side by side. |
| AI1, AI2, AI4 | One seam (`src/ai.mjs`): evidence notes with citations, finding and follow-up drafts, claim-vs-evidence comparison. Simulated provider, run provenance, abstain/failure states. `setAiProvider()` plugs in a real server-side model. |
| N1, N3, N4 | Accept/edit/reject each proposal (reason required for edit/reject); override reason when concluding against the evidence or AI hint; no preselected recommendation; workspace shows progress, blockers and next owner. |
| F1–F3 findings | Unified fields (controls, issue, cited evidence or missing requirement, severity rationale, action, owner, due); a finding for every gap before recommending; closure only on a newer verified citation. |
| Q1–Q4 QA | Independent reviewer with permission, no self-review; four outcomes; challenges answered before resubmitting; reasoning and sources side by side. |
| D1–D5 decision | Memo from current data; outcome with reason and confirmation; risk acceptance for open findings; frozen pack v2 with citations, rules version, AI runs and findings; Print/Save PDF and JSON. |
| M2, C1 | Findings stay open after any decision; client overview exists. |

Prepared CedarCloud/Cedarline case: independent QA, four QA outcomes, risk acceptance and the unified finding fields apply; its approved layouts are unchanged.
