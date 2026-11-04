# Osura interactive demo

A standalone React/Vite interactive supplier-assurance demo: 16 customer screens, 16 Osura operations screens and 3 supplier portal screens. All example data is synthetic.

```sh
npm ci
npm run dev -- --port 5178
```

Open [localhost:5178](http://localhost:5178). The bottom demo bar switches perspectives and opens the complete screen index. Browser back/forward works through hash routes such as `/#C01`, `/#O04` and `/#S01`.

## Change the data

The application fetches JSON at runtime; these files are copied into the deployed site:

| File                         | What to change                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/data/workspace.json` | Workspace, supplier/service records, supplier directory, requirements, source excerpts, documents, findings, triage/BIA reference values, supplier request, initial state and post-state previews |
| `public/data/screens.json`   | The 35 screen titles/subtitles, route IDs, sidebar navigation and gallery reference context                                                                                                       |

Preserve the JSON keys and route IDs. `cedar` is the complete assessment walkthrough; the other records are portfolio examples. Increase `schemaVersion` after replacing a dataset to discard incompatible browser-saved state, or use **Reset demo** in the bottom bar. No source-code edit is needed to change the displayed records and source excerpts.

Labels, layout and interaction logic are React components in `src/main.jsx`; styling lives in `src/styles.css`. The Inter font is bundled locally, so the demo needs no font-provider connection.

## Click-through flows

- **Customer intake:** Overview → Request assessment → confirm a supplier → intended use → business context → review/attachments → submit. A local receipt, new assessment-register row and operations-queue item are created. Draft values survive reload.
- **Evidence:** Operations → Assessments → CedarCloud → Evidence → inspect a requirement/source version → save independent judgement → compare the prepared proposal. A changed conclusion requires a reason.
- **Supplier loop:** Prepare supplier follow-up → review the packet → queue locally → supplier portal → upload metadata and describe service scope → submit → persistent receipt. The two requested items have independent drafts and receipts. Response inspection opens the changed recovery evidence for review; receipt alone does not mark it supported.
- **QA and customer decision:** Independent QA → accept or return for rework → Customer decision → choose one of four outcomes. QA rework blocks signing. Conditional approval requires an owner, due date and required evidence. Returning for clarification produces no signed pack.
- **Decision Pack:** Recording a customer outcome snapshots the case, evidence, rationale and QA. Open the pack, download its JSON or use **Print / Save PDF**. Later condition changes leave this snapshot unchanged.
- **Ongoing assurance:** Report a change, create a scheduled review, inspect a condition and record closure reasoning. A closure needs a prior signed condition and newly submitted evidence.

The screen index supplies the matching HubSpot context for C11. C07 and S03 show explicitly labelled prepared post-state previews until you create your own decision/submission. Secondary portfolio records show their own scope and status; they cannot be signed with CedarCloud evidence.

## Deploy to Vercel

Import this repository into Vercel. Use the repository root (`.`) as the **Root Directory**.

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm ci`
- Environment variables: none

The included `vercel.json` sets the build command and output directory. Navigation uses URL hashes, so deep links work without server rewrites. The project can be deployed directly from this repository without additional services.

## Checks

```sh
npm test
npm run build
npm run preview -- --port 4178
```

The state tests cover the 35-route catalog, nine triage/17 BIA inputs, QA and conditional-decision validation, secondary-record signing prevention, frozen snapshots, clarification, per-item supplier submission/idempotency and filters. All 35 screens were independently reviewed against the supplied visual references at desktop and mobile widths. Local review screenshots are excluded from this repository.

## Preview boundaries

This is an interactive UI prototype with synthetic data and browser-local storage. Perspective switching is a presentation control, not authentication. File pickers persist filenames/metadata, not file contents. Source inspection uses prepared JSON excerpts, not a PDF extraction service. The displayed CTP/BIA values are reference fixtures, not a newly implemented risk engine. Email, AI analysis and worker activity are not live. Only use synthetic information; browser state is not shared between users or devices.

The full evidence-to-decision journey is scoped to CedarCloud. Submitted intake requests remain accurately awaiting triage rather than receiving invented analysis. Historical portfolio packs are reference previews. These boundaries are visible in the UI.
