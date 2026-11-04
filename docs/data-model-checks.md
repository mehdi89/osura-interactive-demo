# Data model and session CRUD checks

Verified locally on 4 November 2026. Application changes are uncommitted/unpublished; the pending UI recommendation board was not changed.

- `npm test`: all 14 tests passed (8 existing workflow tests and 6 schema/CRUD/database-generator tests).
- `npm run build`: passed, including seed validation and generated SQL freshness checking. Existing lucide-react `use client` bundler notices remain non-blocking.
- `git diff --check`: passed.
- Full migration projection compared against the original workspace JSON: identical values and row ordering.
- Ego Browser, local development server on port 5184: all 35 routes rendered headings; no JavaScript errors in the initial route sweep. A settled-layout sweep (fonts and animation frames awaited) found no document overflow at desktop width. The earlier immediate sweep transiently flagged C14/C15; both passed the settled sweep.
- Browser CRUD: created an actor, renamed it and deleted it; deleting referenced A. Morgan was blocked with a relationship error. Created a Northstar engagement, changed its stage and verified the extra row/stage in the assessment register after navigation.
- Actual browser JSON download saved and parsed: included the new engagement and edited stage; the entire downloaded dataset passed schema/relational validation.
- Refresh behavior: two CedarCloud register rows before refresh became one original row after refresh. Workflow owner edits separately survived navigation and reset to L. Reed after refresh.
- New editor at 390 CSS pixels: dialog and toolbar fit within the viewport; form switches to one column, without horizontal dialog overflow. Desktop dialog layout also checked through DOM geometry.

Browser testing caught and fixed an HTML-pattern mismatch (HTML matches the whole field, JSON Schema searches within it), and long-form dialog scrolling/action placement. The browser date-fill helper needed an actual keyboard event to update React state; the successful save used that event.

Limits: new screenshot capture timed out in Ego, so editor layout checks used rendered DOM/geometry rather than a new pixel comparison. This is not a repeat of the earlier independent visual audit or full accessibility certification. PostgreSQL DDL/seed generation and quoting were tested, but the SQL was not applied to a live database. Static illustrative panels and current workflow state retain the boundaries documented in data-model.md; this is not a production backend migration.
