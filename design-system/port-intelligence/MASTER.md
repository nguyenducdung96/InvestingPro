# Port Intelligence interface decisions

Based on the supplied `.claude/skills/ui-ux-pro-max/SKILL.md` and its `financial catalog dashboard` design-system search. The palette and dark data-dashboard direction fit this product. The returned Enterprise Gateway marketing layout does not fit a catalog; use cards, hierarchy navigation and evidence details instead.

- Dark navy background `#020617`, panel `#0f172a`, light text `#f8fafc`, secondary text `#cbd5e1`.
- Green `#4ade80` for links/evidence; amber `#fbbf24` for quality/error notices. Always include text status.
- System sans serif for offline-friendly rendering; base 16px, line height 1.6, responsive 32–48px page titles.
- Responsive cards, 16/24/32/48px spacing; no fabricated KPI strip or empty chart axes.
- Native semantic links/forms/details; visible labels and focus, 44px controls, skip link, reduced motion.
- Server Components for initial database reads; leaf client components for session and review decisions.
- Missing operational coverage and unreported ownership display explicitly, never as zero.

Validated at 375px and 1440px with Playwright; hierarchy and company pages use actual repository data through the HTTP test fixture. Production facts are never embedded in UI code.
