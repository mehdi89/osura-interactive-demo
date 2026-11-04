# Roles, assignments and accountability

This release implements the approved simplification in the standalone interactive demo. Other recommendations in the separate UI review board remain pending.

| Role | View and powers |
| --- | --- |
| Customer | One company, with a static company label. The designated Decision Owner can record the final outcome. |
| Analyst | Combined records for all assigned customers; a Customer filter narrows the view. Can record evidence conclusions and suggested customer outcomes. |
| Superadmin | Add/update/deactivate analysts, grant independent QA permission, assign/remove customers, inspect access history and use the synthetic-data editor. Superadmin alone cannot recommend, QA or sign for a customer. |

Independent QA is a permission on an analyst, not another administrative role. It requires access to the customer and a different person from the lead analyst and anyone who recorded analysis in the current review. Saving a new recommendation invalidates the previous QA release state even when the conclusion stays unchanged. Assigned analysts can inspect a customer decision read only; the shared decision mutation also checks the designated customer actor.

No product workspace switcher remains. The named **Demo user** selector in the bottom presentation bar is the only impersonation control. The existing supplier invitation walkthrough remains separate.

## Try the flow

1. Select **Superadmin · Sam Taylor** in the demo bar. Add an analyst and assign Northstar, Ridgeway or both. Use Edit to change assignments, active status or QA permission. Empty assignments mean an empty work list. No invitation email is sent.
2. Select the analyst. Their work list contains all assigned customers together. Narrow it with **Customer**; customer names remain visible on cross-customer records.
3. As **Analyst · Osura analyst 01**, open Evidence → source verification, enter independent reasoning and select the suggested customer outcome. Save the recommendation.
4. Attempt QA as the same analyst: lack of permission or self-review blocks it. As **Analyst · QA reviewer 02**, record independent QA with rationale.
5. As **Customer · A. Morgan**, open the customer decision. The memo identifies the recommender and QA reviewer. Record the customer outcome and inspect the frozen Decision Pack.
6. Open **Activity & accountability**, inspect details or download activity JSON. Superadmin also sees before/after analyst access changes.

## What is tracked

Actions snapshot the person's name, user ID, actor ID and role, timestamp, customer, engagement/service, demo assessment version, policy/overlay labels, exact document version metadata, rationale and outcome. Recommendations include requirement, conclusion, change reason and suggested outcome. QA records its own person and outcome. Customer decisions preserve the named decision actor; packs freeze review and QA attribution.

Analyst additions and updates record the acting superadmin, target user, previous/new active status, QA permission and customer assignments. Deactivate rather than deleting an analyst, so earlier attributed actions keep their identity. Renaming an actor does not rewrite earlier history. Access changes apply to the selected demo user immediately.

History is append-only through the session UI. Resetting the walkthrough retains history and increments the demo review version, so repeated walkthrough decisions remain distinguishable. Refresh resets all synthetic records, assignments, workflow progress and history. Export activity before refresh to keep it. Activity visibility follows current customer access; administrative access-change details are superadmin-only.

## Code and model

- `src/access.mjs`: session identity, assigned-customer scoping, action checks, immutable action metadata and analyst administration.
- `src/RoleAdmin.jsx`: superadmin team/access forms and scoped activity viewer/export.
- `src/state.mjs`: recommendation, QA and customer-decision guards and attribution.
- `src/main.jsx`: static company/team labels, demo identities, customer filter, read-only decision view and route-role guards.
- `public/data/workspace.json`: synthetic users and customer assignments join the existing relational seed model. Schema and generated PostgreSQL reference include both tables.

## Prototype boundary

This is a client-side simulation, not production authorization: the public JSON contains all synthetic seed records and the presentation bar can impersonate any active demo user. No real authentication, backend access checks, invitations, durable audit database or production tenant isolation is implemented. Never put real customer data in these files. The complete source-to-decision workflow remains CedarCloud; other assigned engagements are scoped portfolio previews. Static policy panels remain labelled reference fixtures.

A real backend must establish the signed-in identity, enforce customer assignments on every query/mutation, preserve immutable assessment/evidence revisions and persist audit events server-side. The generated SQL is a reference, not a deployed database or production migration.
