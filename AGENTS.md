# Osura interactive demo

Standalone React/Vite supplier-assurance prototype deployed on Vercel. All data is synthetic; changes live in memory until refresh. Public seed JSON and the demo-user selector are not real authentication or tenant security.

Current stage: the owner approved the full final call sheet from `Osura Decision Call.html` on 6 November 2026. This branch implements its 16 areas; see `docs/approved-v2-changes.md` for scope and deliberate deferrals. Customer, Analyst and Superadmin roles retain assigned-customer access and named review history. The v2 demo is deployed separately at `osura-v2.dev.fems.education`; the original demo remains unchanged.

- `src/main.jsx`, `styles.css`: screens, routing and UI.
- `src/access.mjs`, `RoleAdmin.jsx`: simulated role checks, customer assignments, superadmin controls and activity history.
- `src/state.mjs`: recommendation, independent QA and customer-decision rules. QA requires a different analyst with explicit permission; the customer Decision Owner signs the final outcome.
- `public/data/workspace.json`: normalized records; `public/schemas/workspace.schema.json`: schema. `presentation.json` and `examples.json` contain labelled reference fixtures; `screens.json` defines the original 35 routes. Superadmin adds A01.
- `docs/data-model.md`, `docs/roles-and-accountability.md`: contracts and limits. `database/`: generated PostgreSQL reference, not a deployed database.

Run `npm test` and `npm run build`. After schema/seed changes, run `npm run generate:db`. Pushing `main` to `mehdi89/osura-interactive-demo` triggers Vercel production deployment; publish only when requested.

Preserve CTP methodology, versioned evidence, independent QA, immutable action attribution and customer decision authority. The full walkthrough is CedarCloud; other engagements are scoped portfolio previews.
