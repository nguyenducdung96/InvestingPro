# PDN: official published berth plans

## Scope and evidence

PDN covers Long Bình Tân, Gò Dầu A and Gò Dầu B. The company 2025 annual report (PDF pages 7 and 10), the authority harbour labels, and official Gò Dầu notices establish these scopes. The reviewed source URLs, corporate PDF hash and observed harbour/wharf matrix are in `catalog-review/pdn-source-review-20261025.json`.

Match both the authority harbour code and the exact NFC terminal label: BC185 Long Bình Tân, BC186 Gò Dầu A, BC187 Gò Dầu B. Do not match a wharf code alone: historical responses reuse some wharf codes under different harbours. Preserve both raw codes in each event. Exclude Sowatco Long Bình, the separate Long Bình Tân fuel terminal, Phước An, VOPAK and unlinked anchorages. The review does not certify all berths, river craft, terminal operations or historical ownership.

The official authority homepage links the anonymous Liferay public application at `http://123.25.204.166/web/guest/public-kh`. The source is distinct from the unreachable HCM ship-schedule server. A GitHub Ubuntu probe successfully read all three daily resources: [manual run 40185054799](https://github.com/nguyenducdung96/InvestingPro/actions/runs/40185054799). This proves the tested route, not future uptime or successful cron runs.

## Collection and semantics

`python scripts/collect-pdn-plans.py` retrieves three read-only resources per day from 2025-01-01 through yesterday in Vietnam: arrivals, departures, and approved published shifting plans. It follows the public client's exact parameters, including category 11, SHIP, marked states 3/4/5/7/8/9 and shifting requestState 4. The bootstrap returns transient session URLs; only the four known read resources on the fixed public origin/path are accepted. Redirects are refused. Session URLs, user metadata and authentication parameters are never persisted, printed or exposed through the public API.

Each gzip archive contains the response, exact response text, SHA-256, selected date/parameters, canonical public URL and retrieval timestamp. Earlier archive text can only be reconstructed when the recovered bytes match the previously captured SHA-256 exactly; otherwise the collector fetches the day again. Cached data is validated and the latest seven days are refreshed. Response limits, total/page count, selected date and a 5% last-good row-loss guard prevent replacement with a broken response. Bootstrap or daily failures fail the workflow and retain the published edition. No new Supabase migration, RLS change, server or credentials are needed.

`python scripts/export-pdn-plans.py` verifies response checksums, date/IDs and exact terminal scope. Direct arrival/departure rows and linked anchorage-to-berth shifts enter separate arrival/departure series. Shifts between any two PDN terminals remain `internal`, excluded from every aggregate. Exact time/vessel/from/to duplicates collapse; conflicting DWT remains null. Native IDs appearing on different days block publication. Unexpected terminal labels and large month/scope row losses also block or remain outside the published totals. A successful response with no linked observation never becomes a zero day.

Source formatting emits `010` for some hour/minute values. Only that explicit format is normalized to `10`; original `raw_time` and `time_normalized` remain in the journal. Other invalid times fail validation. DWT is the source numeric DWT field, never GT; non-positive or missing values remain null.

Semantics: `authority_published_berth_plan`, `movement_scope=berth`, `actual_verified=false`, `full_scope_certified=false`. These are public plans, not confirmed ATB/ATD, unique port calls, cargo tonnage or all movements through the maritime area.

The public source records sharply fewer Long Bình Tân rows from July 2026. BOAT and omitted shipBoat parameter probes on 2026-10-24 did not recover additional PDN arrivals. The cause is unverified; retain recorded totals and YoY, with this substantial coverage/comparability issue in collapsed quality details and API coverage notes. Never interpret the decline as a verified decline in total terminal operations.

## Published edition and product

The first edition covers 662 days / 1,986 source responses, 2025-01-01 through 2026-10-24. It contains 19,760 linked rows, including 58 internal movements retained separately and 104 rows with the explicitly normalized time format. No rows with PDN harbour codes had an unmatched terminal label in this edition.

The compact daily edition feeds recorded totals, monthly/quarterly series, YTD and comparable prior-year periods; missing raw data and strict completeness fields remain separate. Month modules store gzip/base64 JSON and decode with the web-standard `DecompressionStream`; journals remain server-side and load by month. The initial 13.9 MB of literal journal modules caused Cloudflare to reject the Worker above its 63.9 MiB uncompressed limit. Compression reduces those modules to 1.13 MB, with exact decoded JSON equality verified before publication; no new storage service is required. The ledger reconciles terminal/month/direction totals and lists each response hash. Available contributions remain visible when other parts have no observations.

- `/companies/PDN`: total PDN, Long Bình Tân, Gò Dầu combined, Gò Dầu A and B; arrivals/departures; DWT/rows; month/quarter/year; current update window; 90-day chart and date-filtered journal.
- `/api/v1/companies/PDN/plans?asset=pdn&direction=departure`: series, quality and source. Optional `day=YYYY-MM-DD` returns that direction's journal and separate internal movements. Invalid scope/direction/date returns 400; future dates return no observations.
- `/industries/ports/south`: PDN uses the same series and its own Đồng Nai source; no summing overlapping issuers into a regional total.

## Refresh and acceptance

`.github/workflows/pdn-plans.yml` runs at 08:45 Vietnam, checks out the staging branch, restores validated raw archives, collects, exports, tests, commits the edition, waits for Cloudflare deployment and reconciles the live API. The job refreshes the last seven days. If older raw archives are absent from the cache, the exporter preserves that portion from the reviewed immutable Git edition, validates its source proofs and journal fields, and recomputes every aggregate. Missing recent raw responses or missing reviewed history block publication. An explicit full collector run can rebuild the raw history independently. `--recent-only` verifies the same preservation path even with a warm cache. The cache retains receipts and source archives; artifacts expose compact receipts only. Data commits trigger the existing Cloudflare build. Main contains only workflow registration; app implementation stays on `codex/cloudflare-next-compat`.

`node scripts/verify-pdn-live.mjs` checks the deployed edition timestamp, all five scopes and both directions over every month, current journals, invalid-query behavior and the southern overview. Receipts distinguish manual/local runs from `schedule`; two distinct recent real scheduled runs are required before `scheduled_refresh_verified=true`. The configured cron and a successful manual run do not establish that condition.

Validation commands: `python scripts/test-pdn-plans.py`; `pnpm exec vitest run tests/pdn-plans.test.ts tests/pdn-history.test.ts tests/south-plans.test.ts tests/south-history.test.ts tests/north-overview.test.ts tests/central-overview.test.ts --maxWorkers=1`; `pnpm typecheck`; `pnpm lint`; `pnpm build`. Live acceptance is recorded separately in `catalog-review/pdn-staging-20261025.json` after deployment.
