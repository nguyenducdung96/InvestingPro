# Slice 1: catalog and verified mappings

Implemented scope: authorities → ports → terminals → berths; company registry and temporal listings; company asset interests and external entity mappings; immutable source evidence, source rights registry, audit trail and admin review queue; catalog APIs and skeleton pages. No Slice 2–5 schema, connector, operating metric, ranking, price/event, financial or scenario implementation.

## Local commands

Use Node 24 and the pinned pnpm version in package.json:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
pnpm build:cloudflare
pnpm dev
```

Set server-only `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `apps/web/.env.local` for development, and as Cloudflare secrets for hosted environments. Use separate Supabase projects and Worker names per environment. The web app never uses a service-role credential. Anonymous reads stay anonymous even when the visitor is an admin.

The admin page accepts a short-lived access token from an existing Supabase Auth account. Set its role through trusted `app_metadata.role = admin`, never user_metadata. Auth verifies the token at Supabase; RLS checks the same trusted claim. Session cookies are HTTP-only, SameSite Strict and secure over HTTPS. General sign-in onboarding is outside this slice.

## Migrations and data publication

Apply the ordered `supabase/migrations/*.sql` through one controlled Supabase migration release job with a deployment lock. Expose `core`, `catalog`, `port` to PostgREST using the API settings (local settings are in supabase/config.toml). No migration is run from an application build. Migrations are additive and transactional. Rollback the application first and retain the additive schema and evidence. Fix deployed schema with forward migrations; do not drop evidence or audit history.

No production seed is included. `supabase/seed/catalog.dev.sql` requires explicit `app.environment=development|test` and is disabled by default. `tests/database.test.ts` builds its synthetic fixture in an ephemeral PostgreSQL database; `tests/fixtures/supabase-server.mjs` contains synthetic HTTP fixtures exclusively for browser tests. Do not copy those fixtures to a production database.

For a trusted catalog import:

1. Review official URL, robots, terms, redistribution rights and actual format; keep source rights `to_verify` until confirmed.
2. Save original bytes in private R2 with `persistRawEvidence` (`packages/db/src/raw-evidence.ts`), then insert the immutable source record with its hash, R2 key, source URL, canonical URL, fetched time and parser version. Public APIs expose the storage reference, not a signed R2 URL or bucket credentials.
3. Insert typed catalog entities and hierarchy from the evidence. Missing values stay null.
4. Propose company interests/external mappings using the admin API. Proposals start pending. Review the official evidence and validity period through `/admin/mappings`. Fuzzy name matches cannot be verified; submit documentary or official-identifier evidence as a new proposal.
5. Reviewed mappings are immutable. Append a correction using `supersedes_interest_id` or `supersedes_mapping_id`; never erase historical evidence. The active-interest view omits verified replacements. Effective intervals are half-open `[valid_from, valid_to)`; null end means open ended. Multiple owners/operators are supported. Ownership is not summed across direct and indirect claims.

Listing rows also require trusted admin verification and evidence before publication. Registry stores tickers separately from companies and permits multiple exchange listings. Lookup by ambiguous ticker returns conflict; use a company UUID.

## API surface

All catalog routes use `/api/v1`. GET collections: `port-authorities`, `ports`, `terminals`, `berths`; GET `{collection}/{uuid-or-slug}`; GET `port-authorities/{key}/ports`, `ports/{key}/terminals`, `terminals/{key}/berths`; GET `companies/{uuid-or-ticker}`, `companies/{uuid-or-ticker}/port-assets`, `industries/ports/overview`, `industries/ports/listed-companies`.

Collections accept `limit` (1–100), UUID `cursor` and optional `at=YYYY-MM-DD`. `at` selects effective listings/interests; catalog hierarchy is a current catalog. Overview returns catalog records without operating KPIs. Each data response includes citations, evidence fetched/published times, reporting period if supplied, quality, methodology and unknown operational coverage (`ratio: null`). `asOf` is the latest evidence fetch time in the returned page, not a current freshness guarantee. Public cache policy is intentionally no-store for this first authenticated-capable release.

Admin: GET/POST `/api/v1/admin/mappings?type=company_asset_interests|entity_mappings`; PATCH `/api/v1/admin/mappings/{uuid}?type=...` with `{ "decision": "verified|rejected", "note": "..." }`. POST accepts evidence and temporal mapping fields, rejects protected verification/audit fields, and creates pending proposals. Supply a verified Bearer token or admin session cookie. RLS remains effective through direct PostgREST access.

## Deployment and validation boundaries

Cloudflare Workers uses the official OpenNext adapter with Node compatibility. For the staging Worker, configure Workers Builds against GitHub: root directory `apps/web`; build `pnpm run build:cloudflare --env staging`; deploy `pnpm run deploy --env staging`. Use `run deploy` explicitly to avoid pnpm's unrelated built-in deploy command. Watch `apps/web/**`, `packages/**`, pnpm lock/workspace and root configs. Preview/staging use environment-specific Worker configs and Supabase secrets. Configure API WAF/rate limits and Supabase backup/PITR in managed dashboards before production exposure. No Docker, VM, Redis or microservice is required for production.

Next.js is pinned to 16.3.8 because OpenNext 1.20.11 does not yet handle Next.js 16.4's `preview-props.json` manifest at runtime. A successful build alone did not catch this: the first cloud smoke request returned error 1101. See [upstream issue #1355](https://github.com/opennextjs/opennextjs-cloudflare/issues/1355). Keep this pin until a released adapter supports that manifest and a Worker smoke test passes. The staging config explicitly enables its workers.dev URL and disables preview URLs.

The database tests execute migrations against PGlite (PostgreSQL WASM), with Supabase roles and auth claim functions supplied by the test harness. They verify real SQL constraints and RLS, but are not a live Supabase Auth/PostgREST integration or concurrent connection load test. Browser tests exercise Next SSR/API → a synthetic HTTP source on desktop and mobile; SQL behavior is verified separately. Live migration, managed backup, deployment connection and production smoke verification require project credentials and are not implied by local success.

Source registry candidates come from `vietnam_port_official_public_data_sources.md`: VIMAWA catalog, SSC, HOSE and HNX for mapping evidence. Their documentary URLs are candidates, not verified permission to ingest. No connector runs and no unverified URL is promoted to production. Queue/DLQ, workflows and connector jobs are deferred to the slice that first fetches source data; no fake ingestion pipeline is introduced for this catalog slice.

UI guidance: supplied ui-ux-pro-max skill. Dark navy semantic tokens, green evidence accents, responsive cards, 44px controls, keyboard focus, reduced motion, explicit missing/unknown states and server-rendered initial data. No operating chart placeholder fabricates numbers.

Technical references checked during implementation: [Cloudflare Next.js/OpenNext](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) and [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

Local Cloudflare bundle check: the adapter successfully built Next.js, then Windows denied a required filesystem symlink during Worker bundling (`EPERM`). CI performs the adapter build on Ubuntu. No live deployment or migration was performed.

## Verification result

Passed locally: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (29 tests including 12 PostgreSQL migration/constraint/RLS cases), `pnpm test:e2e` (12 desktop/mobile browser and visual checks), and `pnpm build`. Desktop and mobile screenshots were inspected; fixtures are labeled and layouts do not overflow. `pnpm build:cloudflare` remains blocked by the Windows symlink permission described above; WSL is unavailable on this host. Live Supabase migrations, Supabase Auth/PostgREST integration and Cloudflare preview/production deployment remain unverified because project credentials were not supplied.
