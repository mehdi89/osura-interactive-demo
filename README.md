# Osura interactive demo

[V2 client review](https://osura-v2.dev.fems.education) · [Approved improvements and deployment notes](docs/approved-v2-changes.md)

This branch implements the approved final decision call sheet. The demo stays synthetic and session-only; the actual V2 application owns milestone acceptance.

[Live demo](https://osura-demo-mehdi89.vercel.app) · [Public repository](https://github.com/mehdi89/osura-interactive-demo)

A standalone React/Vite interactive supplier-assurance demo: 16 customer screens, 16 Osura operations screens and 3 supplier portal screens, plus a superadmin team/access page. All example data is synthetic.

```sh
npm ci
npm run dev -- --port 5178
```

Open [localhost:5178](http://localhost:5178). The bottom demo bar selects a named demo user and opens that role’s screen index. Browser back/forward works through hash routes such as `/#C01`, `/#O04` and `/#S01`.

## Change the data

As **Superadmin**, use **Demo data** in the bottom toolbar to add, edit or delete records. Changes survive navigation and perspective switches **until the page is refreshed**. There is no automatic localStorage/database saving. **Reset demo** clears walkthrough progress and overrides while preserving fixture edits; refreshing restores everything from the source JSON. Download the edited data JSON before refreshing if you want to keep it.

The application fetches these files at runtime:

| File | Purpose |
| --- | --- |
| `public/data/workspace.json` | Data only: 132 normalized synthetic records across 19 collections, with stable IDs, foreign keys and ISO dates |
| `public/schemas/workspace.schema.json` | JSON Schema: types, required fields, enums, relationship and uniqueness annotations; drives validation, editor fields and SQL generation |
| `public/data/presentation.json` | Display settings, initial workflow state, scenario pins and illustrative panel content |
| `public/data/examples.json` | Frozen prepared Decision Pack and supplier receipt examples, separate from current records |
| `public/data/screens.json` | The 35 screen titles, subtitles, routes and navigation |

See [the data model guide](docs/data-model.md) for relationships, changing fixtures, generated database files and prototype limits. After changing source records/schema, run `npm run generate:db`, `npm test` and `npm run build`. The build rejects invalid records or stale database reference files.

The editor validates a whole change before saving. Referenced records cannot be deleted; IDs cannot be changed during editing. CedarCloud's required walkthrough records and two ordered request items are protected. Workflow actions can override base fixture values; reset the walkthrough to clear those overrides. The download contains the normalized base records, while Decision Packs have their own download.

Labels, layout and interaction logic are React components in `src/main.jsx`; styling lives in `src/styles.css`. The Inter font is bundled locally, so the demo needs no font-provider connection.

## Click-through flows

- **Customer intake:** Overview → Request assessment → confirm a supplier → intended use → business context → review/attachments → submit. A local receipt, new assessment-register row and operations-queue item are created. Draft values last until refresh.
- **Evidence:** Operations → Assessments → CedarCloud → Evidence → inspect a requirement/source version → save independent judgement → compare the prepared proposal. A changed conclusion requires a reason.
- **Supplier loop:** Prepare supplier follow-up → review the packet → queue locally → supplier portal → upload metadata and describe service scope → submit → session receipt. The two requested items have independent drafts and receipts. Response inspection opens the changed recovery evidence for review; receipt alone does not mark it supported.
- **QA and customer decision:** Independent QA → accept or return for rework → Customer decision → choose one of four outcomes. QA rework blocks signing until an analyst revision and new independent QA pass. Customer intent starts blank and requires confirmation. Conditional approval requires an owner, due date and required evidence. Returning for clarification produces no signed pack.
- **Decision Pack:** Recording a customer outcome snapshots the case, evidence, rationale and QA. Open the pack, download its JSON or use **Print / Save PDF**. Later condition changes leave this snapshot unchanged.
- **Ongoing assurance:** Report a change, create a scheduled review, inspect a condition and record closure reasoning. A closure needs a prior signed condition and supported, independently reviewed evidence received after that decision. Submitted supplier items are read-only.

See [Roles and accountability](docs/roles-and-accountability.md) for analyst assignments, independent QA and named action history.

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

This is an interactive UI prototype with synthetic data and session memory. The named demo-user selector simulates roles; it is not authentication. All seed JSON remains public, so this is not a security boundary for real customer information. File pickers persist filenames/metadata, not file contents. Source inspection uses prepared JSON excerpts, not a PDF extraction service. The displayed CTP/BIA values are reference fixtures, not a newly implemented risk engine. Email, AI analysis and worker activity are not live. Only use synthetic information; session state resets on refresh and is not shared between users or devices.

The full evidence-to-decision journey is scoped to CedarCloud. Submitted intake requests remain accurately awaiting triage rather than receiving invented analysis. Historical portfolio packs are reference previews. These boundaries are visible in the UI.
