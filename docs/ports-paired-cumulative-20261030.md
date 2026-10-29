# Cumulative port comparisons - 2026-10-30

User decision: cumulative comparisons sum only months with data in both years. Use the identical month selection for current and prior values, then calculate (current / prior - 1) * 100 when prior is positive. Missing months remain unavailable; a recorded zero remains valid. Coverage gaps within an observed month do not disqualify its recorded values.

Applied to the shared PHP/DVP/issuer dashboard (including HTIT and CDN), southern scopes, PDN, QNP, CMP, NAP and Dung Quat. Both summary cards and comparison footers use paired months and list the included months. The current partial month compares through the same calendar cutoff, including the existing leap-year handling. Historical year selections and quarterly views still derive cumulative comparisons from monthly data.

The previous CDN finished-month-only footer now follows this common rule, including a paired partial month. Published cargo/TEU cumulative comparisons also skip unmatched months and expose paired_months per metric. Vessel source series, strict full-range API aggregates, monthly/quarterly rows, evidence and coverage metadata remain separate from the display comparison.

Validation: TypeScript, full ESLint, 183 Vitest tests and 8 desktop/mobile Playwright checks (PHP/HTIT and CDN), including regression tests for late starts, gaps on either side, missing DWT, recorded zero, no common months, historical years, matching partial cutoffs and independent throughput metrics. Publication authorized by the user after review. Commit/push targets codex/cloudflare-next-compat, which triggers the existing Cloudflare staging build. Deployment/readback evidence is checked after pushing.
