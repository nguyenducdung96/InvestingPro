# Port Intelligence interface decisions

Applied `.claude/skills/ui-ux-pro-max/SKILL.md` for the 17/10/2026 readability redesign. The `investment research dashboard readable` design-system search supports a navy/green data dashboard and clear typographic hierarchy. Its Enterprise Gateway marketing template and dark-only preference do not fit the requested catalog and explicit light/dark requirement; use an application shell and both accessible palettes instead.

- Desktop: 232px navigation rail, active destination, admin tools in a separate disclosure, theme selector below. Tablet/mobile: compact two-row header with the same destinations and visible theme control.
- Theme choices: Sáng / Tối / Theo thiết bị. Default follows the OS; manual preference persists locally and synchronizes between tabs. An early constant bootstrap applies the preference before content paint; no external font or theme service.
- Light: background `#f4f7fb`, surface `#ffffff`, text `#17273e`, secondary `#52637a`, accent `#08745f`.
- Dark: background `#0b1320`, surface `#121f31`, text `#edf3fb`, secondary `#adbed1`, accent `#72ddc0`.
- All surfaces, controls, statuses and focus indicators use semantic CSS variables. Separate control-border tokens provide stronger input boundaries. Avoid theme-color animation that momentarily reduces contrast.
- System sans-serif; 16px body, 1.65 line height, 28–40px page titles, 17–22px card/section titles. Long source hashes wrap and stay inside disclosures.
- Directory: real scope counts, aligned search/filter toolbar, two-column cards on wide screens and one column on phones. Search state remains in the URL.
- Company: ticker/name identity header, actual reported-record counts, concise visible scope note, section links, asset cards with labeled facts and a separate source rail. Sources follow assets on narrow screens; DOM and visual reading order agree.
- Critical data limits remain visible; detailed source hashes, documentary dates and supplementary notes expand on demand. Do not turn unknown dates into fabricated values or count observations as certified total ownership.
- Native links/forms/details, consistent SVG icons (no emoji), 44px primary controls, skip link and keyboard focus, reduced-motion support. Theme selection stays available when persistent storage is unavailable.
- Validation: Playwright at 375px/1440px plus a 768px layout check, both palettes, theme persistence/reload, OS preference changes, contrast checks and horizontal overflow. Actual staging screenshots are recorded separately from local fixture evidence.
