# Role/access release checks

Verified on 4 November 2026 before publication.

- 24 automated tests pass, including assignments/revocation/deactivation, duplicate emails, role-specific decisions, independent QA/self-review, case-scope isolation, explicit customer ownership for shared-supplier panels, retained cross-customer workflow records and immutable event history.
- Production build passes; schema/seed and generated PostgreSQL reference agree. Existing non-blocking lucide-react bundler notices remain.
- Ego Browser production preview: all 35 original routes plus the superadmin page render under their corresponding demo users, with no missing headings, role blocks on allowed routes or JavaScript errors.
- Customer company label is static; no clickable workspace-switch button remains.
- Browser superadmin flow: created Maya Chen with no assignments (empty work list), assigned Ridgeway (only Ridgeway records), then granted Northstar as a second customer. Customer filter narrowed the combined work list correctly. Access and status changes are recorded with before/after values.
- Browser analyst flow: saved independent reasoning and an explicit suggested customer outcome. After superadmin granted QA permission to the same analyst, self-review was still blocked. QA reviewer 02 completed independent QA with rationale.
- Browser customer flow: the decision memo named the recommender and QA reviewer. Assigned analyst could inspect it read only; customer A. Morgan recorded the final outcome and obtained a frozen Decision Pack.
- Actual activity JSON download contains the three customer-visible actions (recommendation, independent QA and customer decision), each with user/actor IDs, role, customer, service/engagement, timestamp, review version and five document-version references. Administrative events stay outside the customer activity view.
- Resetting the walkthrough kept previous activity and recorded a reset; superadmin saw all seven recorded actions in the combined test session. Refresh remains a complete synthetic-session reset.
- Superadmin view at 390 CSS pixels: no document overflow or elements extending past the viewport. Existing mobile table scroll areas remain intentional.

Limits: this verifies client-side demo behavior, not production authorization. The public seed JSON is readable and demo identities are selectable. No live authentication, durable audit service or database was deployed. No new pixel-by-pixel design comparison was performed; browser verification used rendered semantics and layout geometry. Other UI recommendations were not implemented.
