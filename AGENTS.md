# Osura interactive demo

Standalone React/Vite supplier-assurance prototype deployed on Vercel. All data is synthetic; changes live in memory until refresh. Public seed JSON and the demo-user selector are not real authentication or tenant security.

Current stage: the owner explicitly approved the original CONCEPT-01–CONCEPT-16 layouts and interactions from `Osura Decision Call.html`, in addition to the D01–D16 correctness fixes. Earlier final-call-sheet deferrals no longer exclude the guided example, scoped record search, mobile service cards, executive decision layout, expandable service directory or versioned supplier corrections. See `docs/approved-v2-changes.md` and `docs/decision-file-completion.md` for the implementation crosswalk and verification status. Customer, Analyst and Superadmin roles retain assigned-customer access and named review history. The current visual revision targets the separate `osura-v2.dev.fems.education` demo; source changes do not update that manual Coolify deployment automatically. The original demo remains a separate snapshot.

- `src/main.jsx`: screens, routing, review/decision surfaces and guided example. `styles.css`, `visual-system.css`, `customer-layouts.css`, `case-layouts.css`, `operations-layouts.css`: base styling, semantic components and concept layouts.
- `src/customer-session.mjs`: separate customer draft/receipt/filter views. Northstar Payments and Ridgeway Finance remain separate simulated customer scopes; switch customer demo identities only through the bottom **Demo user** selector. Customer, Analyst and Superadmin have no sidebar workspace card. Analysts filter assigned customers in the topbar.
- `src/WorkspaceSearch.jsx`, `search.mjs`: scoped in-memory supplier/service/page search. Supplier response revisions remain immutable session records, not real uploads or delivery.
- `src/access.mjs`, `RoleAdmin.jsx`: simulated role checks, customer assignments, superadmin controls and activity history.
- `src/state.mjs`: recommendation, independent QA and customer-decision rules. QA requires a different analyst with explicit permission; the customer Decision Owner signs the final outcome.
- `public/data/workspace.json`: normalized records; `public/schemas/workspace.schema.json`: schema. `presentation.json` and `examples.json` contain labelled reference fixtures; `screens.json` defines the original 35 routes. Superadmin adds A01.
- `docs/data-model.md`, `docs/roles-and-accountability.md`: contracts and limits. `database/`: generated PostgreSQL reference, not a deployed database.

Run `npm test` and `npm run build`. After schema/seed changes, run `npm run generate:db`. Pushing `main` to `mehdi89/osura-interactive-demo` triggers Vercel production deployment; publish only when requested.

Preserve CTP methodology, versioned evidence, independent QA, immutable action attribution and customer decision authority. The full walkthrough is CedarCloud; other engagements are scoped portfolio previews.
