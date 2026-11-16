# Roles, assignments and accountability

This release implements the approved roles and original concept layouts in the standalone interactive demo.

| Role | View and powers |
| --- | --- |
| Customer | One company per demo identity: Northstar Payments (A. Morgan) or Ridgeway Finance (T. Singh). The individual customer workspace has no customer switcher. The designated Decision Owner can record a supported final outcome. |
| Analyst | Combined records for all assigned customers; the topbar Customer filter narrows the view. Can record evidence conclusions and suggested customer outcomes. |
| Superadmin | Add/update/deactivate analysts, set the (currently unused) QA permission flag, assign/remove customers, inspect access history and use the synthetic-data editor. Superadmin alone cannot recommend, QA or sign for a customer. |

QA review is currently recorded by the assigned analyst, including on their own recommendation (client decision, 16 November 2026). A separate QA reviewer and the QA permission are not required; the removed checks are marked with `ponytail:` comments in `state.mjs` and `request-workflow.mjs`. Saving a new recommendation invalidates the previous QA release state even when the conclusion stays unchanged. Assigned analysts can inspect a customer decision read only; the shared decision mutation also checks the designated customer actor.

Switch customer demo identities and roles only through the **Demo user** selector in the bottom presentation bar. This presenter control does not grant one customer user access to another company. Customer, Analyst and Superadmin sidebar workspace cards are removed; analysts use the topbar Customer filter for their assigned customers. The supplier invitation walkthrough remains separate. Demo identity switching is not real authentication.

Customer, Analyst and Superadmin open Notifications, Account, Change password, Billing and Log out from the bottom-left profile's native popover. The top-right synthetic-data badge, notification bell and avatar are removed. Change password is explicitly labelled as a local form preview and saves no credentials. Billing has no connected subscription or charges; team roles have no customer billing records. Log out hides the workspace locally and offers Resume, preserving saved session records and checking for unsaved drafts before leaving. Refresh still resets demo data. These account controls do not change role permissions or customer access, and the supplier invitation flow is unchanged.

## Try the flow

1. Select **Superadmin · Sam Taylor** in the demo bar. Add an analyst and assign Northstar, Ridgeway or both. Use Edit to change assignments, active status or QA permission. Empty assignments mean an empty work list. No invitation email is sent.
2. Select the analyst. Their work list contains all assigned customers together. Narrow it with **Customer**; customer names remain visible on cross-customer records.
3. For the prepared CedarCloud example, open its case from **My work**, then Evidence → source verification, enter independent reasoning and select the suggested customer outcome. Save the recommendation.
4. As the same analyst, open QA review and record the QA outcome with rationale.
5. As **Customer · A. Morgan**, open the customer decision. The memo identifies the recommender and QA reviewer. Record the customer outcome and inspect the frozen Decision Pack.
6. Open **Activity & accountability**, inspect details or download activity JSON. Superadmin also sees before/after analyst access changes.

New requests start in the customer intake form. As the assigned analyst, review intake, ask for clarification if needed, confirm scope and manual CTP classification, and add/review service-specific source versions. Request evidence from the supplier when needed (switch **Demo user** to the supplier to answer from the inbox), and raise a finding from any source reviewed as Partially supported or Contradictory. Record a recommendation and its QA review, then switch to the customer Decision Owner to review and confirm an outcome. Approving with conditions requires an explicit confirmation that the condition is sent to the supplier. Role switching preserves the same request when the next user has access.

## What is tracked

Actions snapshot the person's name, user ID, actor ID and role, timestamp, customer, engagement/service, demo assessment version, policy/overlay labels, exact document version metadata, rationale and outcome. Recommendations include requirement, conclusion, change reason and suggested outcome. QA records its own person and outcome. Customer decisions preserve the named decision actor; packs freeze review and QA attribution.

Analyst additions and updates record the acting superadmin, target user, previous/new active status, QA permission and customer assignments. Deactivate rather than deleting an analyst, so earlier attributed actions keep their identity. Renaming an actor does not rewrite earlier history. Access changes apply to the selected demo user immediately.

History is append-only through the session UI. Resetting the walkthrough retains history and increments the demo review version, so repeated walkthrough decisions remain distinguishable. Refresh resets all synthetic records, assignments, workflow progress and history. Export activity before refresh to keep it. Activity visibility follows current customer access; administrative access-change details are superadmin-only.

## Code and model

- `src/access.mjs`: session identity, assigned-customer scoping, action checks, immutable action metadata and analyst administration.
- `src/RoleAdmin.jsx`: superadmin team/access forms and scoped activity viewer/export.
- `src/state.mjs`: prepared CedarCloud recommendation, QA and customer-decision guards and attribution.
- `src/request-workflow.mjs`, `src/RequestAssessment.jsx`: isolated new-request scope, evidence versions/reviews, supplier requests/responses, findings, recommendation, QA review, deliberate customer decision, immutable pack and condition closure. Customer clarification returns to the analyst; analyst questions return to the customer. Changes before signing invalidate QA. Signed packs remain frozen through new condition evidence and closure.
- `src/main.jsx`: static company/team labels, demo identities, customer filter, read-only decision view and route-role guards.
- `src/data-model.mjs`: derives customer-specific workspace metadata; Ridgeway has no configured overlay, assigned case reviewer or prepared QA release. Scoped Ridgeway views exclude CedarCloud's example packs, source histories and supplier request.
- `public/data/workspace.json`: synthetic users and customer assignments join the existing relational seed model. Schema and generated PostgreSQL reference include both tables.

## Prototype boundary

This is a client-side simulation, not production authorization: the public JSON contains all synthetic seed records and the presentation bar can impersonate any active demo user. No real authentication, backend access checks, invitations, durable audit database or production tenant isolation is implemented. Never put real customer data in these files. CedarCloud remains the prepared source-to-decision example; newly submitted requests have their own complete manual workflow. Other seeded engagements remain scoped portfolio previews. Static policy panels remain labelled reference fixtures.

A real backend must establish the signed-in identity, enforce customer assignments on every query/mutation, preserve immutable assessment/evidence revisions and persist audit events server-side. The generated SQL is a reference, not a deployed database or production migration.
