# Osura interactive demo

Standalone React/Vite supplier-assurance prototype deployed on Vercel. All data is synthetic; changes live in memory until refresh. Public seed JSON and the demo-user selector are not real authentication or tenant security.

Current stage: the data model/session editor is published. The user approved simplifying workspace switching into Customer, Analyst and Superadmin roles with assigned-customer access and named review history. Other proposals in the parent workspace’s UI review board remain unapproved.

- `src/main.jsx`, `styles.css`: screens, routing and UI.
- `src/access.mjs`, `RoleAdmin.jsx`: simulated role checks, customer assignments, superadmin controls and activity history.
- `src/state.mjs`: recommendation, independent QA and customer-decision rules. QA requires a different analyst with explicit permission; the customer Decision Owner signs the final outcome.
- `public/data/workspace.json`: normalized records; `public/schemas/workspace.schema.json`: schema. `presentation.json` and `examples.json` contain labelled reference fixtures; `screens.json` defines the original 35 routes. Superadmin adds A01.
- `docs/data-model.md`, `docs/roles-and-accountability.md`: contracts and limits. `database/`: generated PostgreSQL reference, not a deployed database.

Run `npm test` and `npm run build`. After schema/seed changes, run `npm run generate:db`. Pushing `main` to `mehdi89/osura-interactive-demo` triggers Vercel production deployment; publish only when requested.

Preserve CTP methodology, versioned evidence, independent QA, immutable action attribution and customer decision authority. The full walkthrough is CedarCloud; other engagements are scoped portfolio previews.
