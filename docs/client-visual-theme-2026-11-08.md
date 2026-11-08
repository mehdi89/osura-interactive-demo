# Client visual theme alignment · 8 November 2026

The client selected the workspace dashboard on https://www.osura.io/#platform and `Osura_UI_Design_Reference.pdf` as the main visual reference. Coverbase and the previously approved materials continue to guide layouts and workflows. Historical deferrals do not remove approved features.

## Implemented

- The shared shell now uses the reference's navy sidebar (`#1d2639`), official Osura wordmark and locally served Manrope font. The font's SIL Open Font License is included. Supplier invitation pages retain their separate navigation with the same branding.
- Shared semantic tokens in `theme.css` provide white/light-grey surfaces, subtle borders, muted purple actions and selections, and distinct green, amber, red and blue states. Dark mode has matching, readable counterparts. Light-mode text and control borders are slightly stronger than the website where needed for contrast.
- All five shared stylesheets use the same palette. Cards, buttons, tabs, fields, tables, status badges, source panes, dialogs, search, account menus and presenter tools now share the reference's calmer hierarchy and restrained corners. Responsive layouts and wrapping safeguards remain in place.
- Page titles are concise. The operations overview has one heading and purpose statement. Customer next actions remain prominent; portfolio metrics and service reviews now precede the presenter exploration cards. Existing expandable supplier/service records and mobile cards remain available.
- Review and decision pages have a visible primary heading. The prepared pack's supplier name and the risk metric use subordinate headings. Profile-menu icons use their actual symbols instead of the fallback circle.
- Existing customer assignments, topbar-only analyst filtering, bottom-left account actions, scoped search, independent QA, immutable receipts/packs and customer decision authority remain intact. The mockup's sidebar customer card was not restored because the owner explicitly removed that control.
- The previously implemented official 17-question CTP impact set is included. Its base-impact result remains separate from final CTP inherent risk; no methodology thresholds or workflow gates were changed by the theme work.

## Verification

- `npm test`: all 91 tests pass. `npm run build` and generated database-reference validation pass. No npm dependency was added.
- All 36 routes under their intended roles passed 144 desktop/mobile/theme cases: 1440px and 390px, Light and Dark. Checks found no page/workspace horizontal overflow, text contrast below the checked thresholds, or missing/duplicate visible primary headings.
- Eight representative form, review, communications, register and admin pages passed another 32 cases at 1024px and 1280px in both themes, bringing layout checks to 176.
- Source references and the rendered portfolio/register screenshots were visually inspected. Screenshot capture succeeded for those surfaces but timed out on a later case capture; the remaining routes were verified through rendered text, computed colours, geometry and controls. This is not a pixel-identity claim for every screen.
- Actual interaction checks cover theme changes while retaining an unsaved decision draft, blank customer outcome choices, mobile navy navigation, the contained six-action profile menu and restoration of System appearance. Print emulation checks the light prepared-pack document, hidden shell/presenter controls and preserved example label.
- The initial contrast pass identified borderline amber/muted text on tinted panels and a control-border issue. Those were corrected. Navigation focus rings use a pale purple against the always-navy shell. Reduced-motion preferences disable decorative transitions.

## Release

The target remains the separate https://osura-v2.dev.fems.education demo. Deployment evidence is appended after the live release is verified. The original demo and production applications are outside this release.
