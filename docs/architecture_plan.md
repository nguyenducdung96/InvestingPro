# Financial Intelligence PWA

## Architecture và kế hoạch triển khai hoàn chỉnh

**Phiên bản:** 2.0  
**Ngày cập nhật:** 2026-10-13  
**Mục tiêu:** Xây dựng một nền tảng PWA theo dõi và phân tích thông tin đầu tư, bắt đầu bằng ngành cảng biển, sau đó mở rộng sang nhiều ngành, dữ liệu vĩ mô, hàng hóa, chứng khoán, công bố doanh nghiệp, báo cáo tài chính, tin tức và trợ lý AI.  
**Mô hình vận hành:** GitHub là source of truth; push/merge code sẽ tự động trigger build và deploy lên Cloudflare. Không yêu cầu tự quản lý server, Docker, Kubernetes hoặc máy ảo production.

---

## 1. Executive decision

### 1.1 Kiến trúc được chọn

Sử dụng **managed serverless platform + modular monolith + event-driven workers**:

- **Một GitHub monorepo** chứa web app, workers và shared packages.
- **Cloudflare Workers Builds** kết nối trực tiếp GitHub để auto build/deploy sau mỗi push hoặc merge.
- **Next.js + TypeScript + Tailwind** cho web/PWA; khi bắt đầu implement phải kiểm tra adapter/runtime Cloudflare được khuyến nghị tại thời điểm đó.
- **Cloudflare Workers** cho API gateway nhẹ, ingestion và background consumers.
- **Cloudflare Queues** cho buffering, batching, retry và dead-letter queue.
- **Cloudflare Workflows/Cron** cho công việc định kỳ hoặc nhiều bước cần retry bền vững.
- **Cloudflare R2** cho HTML/PDF/JSON gốc, file đính kèm và historical/archive data.
- **Supabase managed PostgreSQL** làm system of record cho dữ liệu quan hệ, Auth, RLS, metadata và dữ liệu phục vụ ứng dụng.
- **Realtime tách thành hai lớp**:
  - Supabase Realtime cho cập nhật dữ liệu ứng dụng và các channel có RLS.
  - Cloudflare Durable Objects + WebSocket chỉ dùng khi có market feed/live fan-out thật sự cần kết nối lâu dài và broadcast với tải lớn.
- **Không dùng D1 làm primary database** cho hệ thống tài chính đa ngành có mục tiêu dữ liệu lớn.
- **Không bắt đầu bằng microservices**, nhưng ranh giới các app/worker/module được thiết kế để tách độc lập khi có số liệu vận hành chứng minh nhu cầu.

### 1.2 Cam kết vận hành đơn giản

Luồng triển khai mục tiêu:

```text
Developer/AI coding agent
        |
        v
git push / pull request / merge
        |
        v
GitHub repository
        |
        v
Cloudflare Workers Builds
  - install
  - lint/typecheck/test
  - build
  - deploy preview hoặc production
        |
        v
Cloudflare Workers + static assets
```

Không có bước vận hành bắt buộc nào yêu cầu:

- Tạo hoặc quản lý Docker image production.
- Quản lý Kubernetes cluster.
- SSH vào server.
- Quản lý Nginx, PM2 hoặc hệ điều hành.
- Tự dựng PostgreSQL, Redis hoặc message broker.

Docker chỉ có thể xuất hiện như công cụ local tùy chọn của developer, không phải một phần bắt buộc của production deployment.

### 1.3 Mức scale là design target, không phải cam kết tự động

Hệ thống được thiết kế để có đường mở rộng cho:

- Hơn 50.000 tài khoản/người dùng.
- Hơn 100 GB dữ liệu tích lũy.
- Nhiều nguồn và background jobs.
- Bảng giá/watchlist tương đối realtime.

Các con số trên là **mục tiêu thiết kế**, không phải bảo đảm hiệu năng. Năng lực thực tế phải được xác nhận bằng load test, quota dịch vụ, gói thuê bao, database sizing, cache hit rate, tần suất feed và giấy phép dữ liệu.

---

## 2. Product scope

### 2.1 Tầm nhìn tổng thể

Nền tảng gồm các chủ đề độc lập nhưng chia sẻ cùng core:

- **Port Intelligence:** cảng, bến, doanh nghiệp cảng, throughput, tàu, hạ tầng luồng, sự kiện ngành.
- **Company Intelligence:** hồ sơ doanh nghiệp, công bố, báo cáo tài chính, nghị quyết, sự kiện doanh nghiệp.
- **Market Intelligence:** giá chứng khoán, index, watchlist, corporate actions, cảnh báo.
- **Macro Intelligence:** lãi suất, tỷ giá, thanh khoản, tăng trưởng, lạm phát và chỉ tiêu vĩ mô.
- **Commodity Intelligence:** vàng, dầu, kim loại, cao su, phân bón và các mặt hàng khác.
- **Industry Intelligence:** ngân hàng, cảng biển, vận tải, logistics, cao su và các ngành mở rộng sau này.
- **News Intelligence:** tổng hợp, chống trùng, gắn entity/topic và theo dõi sự kiện.
- **Research Assistant:** hỏi đáp trên structured data và tài liệu có citation.
- **Commercial SaaS:** Google login, plans, entitlement, billing, usage limits và admin.

### 2.2 Ngành cảng là module đầu tiên, không phải core cố định

Không thiết kế toàn bộ hệ thống quanh `ports`, `vessels` hoặc `terminals`. Những entity này thuộc module `port`.

Core chung gồm:

```text
identity
catalog
sources
observations
series
companies
instruments
documents
news
ingestion
alerts
research
assistant
billing
```

Các module ngành bổ sung định nghĩa riêng:

```text
modules/port
modules/banking
modules/transport
modules/rubber
modules/commodities
modules/macro
modules/market
```

Không dùng mô hình low-code `DynamicEntity/DynamicField` cho toàn bộ dữ liệu tài chính. Các entity quan trọng cần schema typed, migration rõ ràng và constraints. Cấu hình chỉ dùng cho dashboard, metric definition, labels, filters và source mapping.

---

## 3. System architecture

```text
Users / Installed PWA
          |
          v
Cloudflare CDN / Workers
  +-------------------------------+
  | Web/PWA                       |
  | API/BFF                       |
  | Auth session checks           |
  | Cache and rate limiting       |
  +-------------------------------+
          |
          +-------------------------------+
          |                               |
          v                               v
Supabase PostgreSQL                  Cloudflare R2
- catalog                            - raw HTML/PDF/JSON
- application data                   - document versions
- time-series hot/curated             - cold market history
- financial facts                    - export/archive
- users/RLS                           - optional Parquet/Iceberg
- vector metadata
          ^
          |
Cloudflare ingestion plane
  Cron/Workflow -> Producer -> Queue -> Consumer Workers
                                    |
                         fetch -> persist raw -> parse
                         -> normalize -> validate -> upsert
                         -> outbox/event -> alert/index

Optional real-time market plane
Licensed market feed
       |
       v
Market ingestion Worker
       |
       +--> Durable Objects/WebSocket fan-out --> subscribed clients
       |
       +--> Queue --> batch persistence --> PostgreSQL/R2
```

### 3.1 Thành phần luôn triển khai từ đầu

- `web`: PWA và Backend-for-Frontend.
- `ingestion-worker`: discovery/fetch/normalize.
- `queue-consumer`: parse, validation, persistence.
- `Supabase PostgreSQL`: data serving và application data.
- `R2`: raw storage.
- `Queues`: background workloads.
- `Cron/Workflows`: schedule và durable multi-step jobs.

### 3.2 Thành phần chuẩn bị interface nhưng chỉ bật khi cần

- `realtime-gateway`: Durable Objects/WebSocket cho live market feed.
- Read replica Supabase cho analytical/read traffic.
- R2 Data Catalog/R2 SQL hoặc warehouse khác cho historical analytics.
- Search/vector service chuyên dụng.
- Dedicated API service tách khỏi web.

Không provision thành phần chỉ vì có thể cần trong tương lai. Code phải có interface/adapter để thêm mà không sửa domain model.

---

## 4. Monorepo và code ownership

```text
financial-intelligence/
  apps/
    web/                        # Next.js PWA + route handlers/BFF
    ingestion-worker/           # source discovery/fetch producers
    processing-worker/          # queue consumers/parsers/upserts
    realtime-gateway/           # optional Durable Objects/WebSocket
  packages/
    domain/                     # shared domain types and rules
    db/                         # migrations, generated types, queries
    source-sdk/                 # connector contracts and helpers
    observability/              # logs, metrics, tracing helpers
    auth/                       # claims, policies, entitlement checks
    ui/                         # shared UI components
    config/                     # eslint, tsconfig, env schemas
    modules/
      port/
      market/
      macro/
      commodities/
      company/
      news/
      research/
  supabase/
    migrations/
    seed/                       # dev/test only
  infra/
    cloudflare/                 # wrangler configs and bindings
  docs/
    architecture/
    adr/
    sources/
    methodologies/
  tests/
    fixtures/
    e2e/
  .github/
    workflows/                  # quality gates, not production server ops
```

### 4.1 Quy tắc dependency

```text
UI -> application services -> domain -> repositories/adapters
workers -> source-sdk -> domain -> repositories/adapters
modules may depend on core
core must not depend on an industry module
```

- Module `port` không được chứa logic billing/auth dùng chung.
- Module `market` không ghi trực tiếp vào bảng của `port`.
- Mọi cross-module integration đi qua entity IDs, domain events hoặc application services.
- Shared package không trở thành thư mục `utils` chứa logic không kiểm soát.

---

## 5. GitHub và auto deployment

### 5.1 Branch strategy

- `main`: production.
- Pull request: preview deployment.
- Feature branches: lint, typecheck và test trước khi merge.
- Không sửa production trực tiếp từ Cloudflare dashboard ngoài xử lý khẩn cấp có ghi nhận.

### 5.2 Cloudflare projects trong cùng monorepo

Mỗi app có project/binding riêng nhưng cùng GitHub repository:

```text
apps/web                 -> financial-intelligence-web
apps/ingestion-worker    -> financial-intelligence-ingestion
apps/processing-worker   -> financial-intelligence-processing
apps/realtime-gateway    -> financial-intelligence-realtime (optional)
```

Sử dụng build watch paths để chỉ build app bị ảnh hưởng. Cloudflare Workers Builds quản lý auto deploy; GitHub Actions chủ yếu làm quality gates độc lập.

### 5.3 Pipeline

```text
Pull request
  -> install with frozen lockfile
  -> lint
  -> typecheck
  -> unit tests
  -> parser fixture tests
  -> build changed apps
  -> Cloudflare preview

Merge main
  -> repeat quality gates
  -> run safe migrations as controlled release step
  -> deploy changed Workers/apps
  -> smoke tests
  -> mark release
```

Database migration không được chạy đồng thời nhiều lần từ mỗi Worker build. Cần một migration job có lock và nguyên tắc backward-compatible:

1. Expand schema.
2. Deploy code hỗ trợ schema cũ và mới.
3. Backfill bằng queue/workflow.
4. Chuyển reads/writes.
5. Contract schema ở release sau.

### 5.4 Secrets

- Cloudflare secrets cho Workers.
- Supabase dashboard/vault cho database secrets.
- GitHub secrets chỉ cho CI cần thiết.
- Chỉ biến `NEXT_PUBLIC_*` mới được xuất hiện ở client.
- Không lưu service-role key, billing secret hoặc data-vendor key trong repository.

---

## 6. Database strategy

### 6.1 PostgreSQL là system of record

Các nhóm schema:

```text
core
identity
catalog
market
financials
disclosures
news
ingestion
research
assistant
billing
port
```

### 6.2 Ứng dụng và dữ liệu phân tích không dùng cùng pattern truy vấn

- OLTP/user-facing: normalized tables, targeted indexes, RLS.
- Dashboard: materialized views hoặc precomputed aggregates.
- Hot market data: latest snapshot + recent bars.
- Cold history/raw ticks: R2, partitioned files; chỉ đưa dữ liệu phục vụ ứng dụng vào PostgreSQL.
- AI retrieval: document chunks/metadata và vector references; không gửi toàn bộ raw archive vào prompt.

### 6.3 Partitioning

Các bảng tăng nhanh phải sẵn sàng partition theo thời gian:

- `market_ticks`
- `market_bars`
- `observations`
- `news_articles`
- `source_records`
- `audit_events`

Không tạo partition phức tạp trước khi có dữ liệu, nhưng migration và repository không được phụ thuộc vào một bảng đơn không thể chuyển đổi.

### 6.4 Schema lõi tối thiểu

```text
entities
companies
industries
entity_industries
instruments
indicators
series
observations
documents
document_versions
document_chunks
sources
source_records
ingestion_jobs
ingestion_runs
ingestion_errors
data_quality_issues
outbox_events
watchlists
watchlist_items
alert_rules
alert_deliveries
```

Module cảng bổ sung:

```text
ports
terminals
vessels
port_calls
port_kpis
company_assets
company_port_kpis
maritime_notices
```

Module market bổ sung:

```text
market_venues
market_sessions
quotes_latest
market_ticks
market_bars
corporate_actions
price_alerts
feed_entitlements
```

### 6.5 Đường scale database

- Scale compute/connection pooling trước.
- Tối ưu indexes, query plans và materialized views.
- Tách analytical reads sang read replica khi có bottleneck đo được.
- Dùng CDC/warehouse cho analytical history khi operational PostgreSQL không còn phù hợp.
- Không chạy dashboard scan toàn bộ tick history trên primary database.

---

## 7. Data ingestion architecture

### 7.1 Connector contract

```ts
export interface SourceConnector<Raw, Normalized> {
  discover(context: DiscoverContext): Promise<DiscoveredItem[]>;
  fetch(item: DiscoveredItem, context: FetchContext): Promise<RawArtifact<Raw>>;
  parse(raw: RawArtifact<Raw>): Promise<ParsedRecord[]>;
  normalize(record: ParsedRecord): Promise<Normalized[]>;
  validate(item: Normalized): ValidationResult;
}
```

### 7.2 Pipeline chuẩn

1. Workflow/Cron tạo discovery run.
2. Producer phát message nhỏ chứa source/job/cursor.
3. Consumer fetch với timeout và source-specific rate limit.
4. Lưu raw response bất biến vào R2.
5. Validate MIME, checksum và cấu trúc tối thiểu.
6. Parse và normalize sang canonical model.
7. Resolve entity bằng stable identifiers.
8. Upsert idempotent vào PostgreSQL.
9. Chạy data-quality rules.
10. Ghi outbox event.
11. Queue downstream work: indexing, aggregate, alert.
12. Cập nhật checkpoint sau khi batch hoàn tất.

### 7.3 Reliability

- Idempotency key cho mọi message và upsert.
- Exponential backoff.
- DLQ cho message quá retry limit.
- Poison message không chặn toàn batch.
- Replay được từ raw artifact.
- Job checkpoint không tiến khi dữ liệu chưa commit.
- Schema/parser version được lưu cùng record.
- Source health dashboard: freshness, lag, failures, duplicates.

---

## 8. Realtime market data

### 8.1 Nguyên tắc

- Không gọi là realtime nếu nguồn chỉ cập nhật theo phút, phiên hoặc cuối ngày.
- Không scrape bảng giá public rồi tái phân phối nếu không có quyền.
- Giá, độ sâu thị trường, redistribution và số kết nối thường phụ thuộc điều khoản của data vendor/sở giao dịch.
- Kiến trúc kỹ thuật không thay thế giấy phép dữ liệu.

### 8.2 Hai chế độ

#### Near-realtime MVP

- Poll licensed/public-permitted source theo giới hạn hợp lệ.
- Queue batch updates.
- Upsert `quotes_latest` và bars.
- Supabase Realtime hoặc server-sent updates cho watchlist giới hạn.
- Không lưu mọi tick nếu chưa cần.

#### Realtime feed commercial

```text
Licensed feed/WebSocket
        |
        v
Market ingestion Worker
        |
        +--> normalize/deduplicate/sequence checks
        |
        +--> Durable Object shards by venue/symbol-group
        |       |
        |       +--> WebSocket subscribers
        |
        +--> Queue
                |
                +--> latest quote store
                +--> bars/aggregates
                +--> R2 tick archive
                +--> alerts
```

### 8.3 Sharding

- Không dồn tất cả symbols vào một Durable Object.
- Shard theo venue và symbol bucket.
- Client subscribe theo watchlist/topic, không broadcast toàn thị trường cho mọi client.
- Backpressure, message coalescing và snapshot/delta protocol phải được thiết kế trước khi bật live feed.

### 8.4 Market data storage

- `quotes_latest`: một row/symbol/venue, phục vụ UI.
- `market_bars`: 1m/5m/day tùy subscription và license.
- `market_ticks`: retention ngắn trong PostgreSQL nếu cần.
- Full tick/archive: R2 partition theo `venue/date/symbol`.
- Derived analytics luôn có methodology/version và source entitlement.

---

## 9. API design

Prefix: `/api/v1`

Core:

```text
GET  /entities/search
GET  /companies/{id}
GET  /companies/{id}/documents
GET  /documents
GET  /news
POST /watchlists
POST /alerts
POST /assistant/query
```

Port:

```text
GET /industries/ports/overview
GET /ports
GET /ports/{id}
GET /ports/{id}/series
GET /ports/{id}/notices
```

Market:

```text
GET /market/instruments
GET /market/quotes?symbols=
GET /market/bars?symbol=&interval=&from=&to=
GET /market/sessions
WS  /market/stream
```

Response metadata:

```json
{
  "data": {},
  "meta": {
    "asOf": "ISO-8601",
    "sources": [],
    "quality": "verified|preliminary|estimated|incomplete",
    "methodologyVersion": "string",
    "entitlement": "string"
  }
}
```

---

## 10. PWA and UX

- Installable manifest.
- Responsive desktop/mobile.
- App shell cache.
- Network-first cho quotes/dashboard.
- Stale-while-revalidate cho catalog và documents list.
- Cache-first cho static assets.
- Hiển thị trạng thái offline/stale rõ ràng.
- Không cache service-role response hoặc dữ liệu vượt entitlement.
- Push notifications chỉ dùng cho alert/event đã chống trùng.

Routes:

```text
/
/markets
/markets/[symbol]
/macro
/commodities
/industries
/industries/ports
/ports/[slug]
/companies/[ticker]
/disclosures
/news
/watchlist
/alerts
/assistant
/settings
/admin/sources
/admin/ingestion
/admin/data-quality
/admin/billing
```

---

## 11. Research assistant

### 11.1 Retrieval

1. Classify question.
2. Resolve entity, metric và time range.
3. Query structured data cho số liệu.
4. Hybrid search cho documents/news.
5. Rerank theo source authority, date và entity match.
6. Generate từ retrieved context.
7. Return citation, as-of, quality và limitations.

### 11.2 Guardrails

- Không trả số không có trong retrieved context.
- Không biến proxy thành actual.
- Nguồn xung đột phải hiển thị cả hai.
- Không tạo khuyến nghị mua/bán chắc chắn.
- Không vượt user entitlement qua agent tool.
- Log retrieval IDs, citations, model/version và evaluation outcome.

---

## 12. Security

- Supabase RLS cho user-owned data.
- Private realtime channels và authorization policies.
- Service role chỉ ở Worker/server secret.
- RBAC: `user`, `analyst`, `admin`, `ingestion_service`, `billing_service`.
- Input validation và parameterized queries.
- HTML sanitization và Content Security Policy.
- Cloudflare rate limiting/WAF cho login, search, assistant và public APIs.
- Signed webhook verification và idempotency.
- Audit log cho quyền, entitlement, source config và data correction.
- Environments tách biệt: preview/staging/production.
- Backup, PITR và restore drill theo gói database.
- Không log token, cookie, payment data hoặc vendor credentials.

---

## 13. Observability and SLO preparation

Structured fields:

```text
trace_id
request_id
job_id
run_id
source_id
connector_version
entity_id
user_id_hash
```

Metrics:

- API latency/error rate.
- Cache hit ratio.
- Queue depth/oldest message age.
- Ingestion freshness và lag.
- Fetch/parse/upsert/error counts.
- Duplicate rate.
- Database connections/query latency.
- WebSocket connections/messages/backpressure.
- Alert delivery success.
- Assistant grounded-answer evaluation.

Alerts:

- Source stale.
- Parser break.
- DLQ non-empty.
- Queue backlog tăng.
- Database saturation.
- Realtime sequence gap.
- Billing webhook failure.

---

## 14. Testing strategy

- Unit: domain rules, parsers, calculations.
- Fixture/regression: mỗi connector.
- Contract: API và normalized schemas.
- Integration: PostgreSQL, R2, Queue, Auth.
- E2E: port dashboard, disclosures, watchlist, alerts, assistant citations.
- Security: RLS leakage, authz, webhook replay, sanitization.
- PWA: manifest, install, cache và offline behavior.
- Load test:
  - read-heavy dashboard.
  - document discovery bursts.
  - quote updates/subscriptions.
  - queue backlog recovery.
- Data quality: unit, period, revision, freshness và reconciliation.

Không tuyên bố đạt 50.000 users trước khi load test trên cấu hình production-like và ghi nhận bottleneck.

---

## 15. Commercialization

### Giai đoạn cá nhân

- Single-owner hoặc private auth.
- Không billing.
- Source/legal registry vẫn bắt buộc.

### Giai đoạn beta

- Google login.
- Invite-only.
- Usage metering.
- Feature flags và entitlements.

### Giai đoạn thương mại

- Plans/features/limits.
- Hosted checkout/customer portal.
- Signed billing webhooks.
- `subscriptions`, `entitlements`, `webhook_events`.
- Entitlement enforced cả API, realtime topic và UI.
- Terms, privacy, disclaimer, attribution và data licenses.

---

## 16. Roadmap

### Phase 0: Platform foundation

- Monorepo và dependency boundaries.
- GitHub -> Cloudflare Workers Builds.
- Preview/production environments.
- Supabase schema/migrations/RLS.
- R2 raw storage.
- Queues + DLQ.
- Connector SDK.
- Observability baseline.

**Exit:** push/merge tự deploy; một sample connector chạy end-to-end; raw artifact và lineage truy xuất được.

### Phase 1: Port Intelligence MVP

- Port/terminal/company catalog.
- VIMAWA catalog/statistics connectors sau khi kiểm tra quyền và response.
- Port dashboard và company page.
- Document feed và source citations.

**Exit:** dữ liệu production đều truy nguồn được; parser fixtures và DQ checks hoàn chỉnh.

### Phase 2: Disclosure Scanner

- SSC, HOSE, HNX/UPCoM connectors.
- PDF/file versioning.
- BCTC, nghị quyết, ĐHĐCĐ và corporate events.
- Notifications.

**Exit:** phát hiện tài liệu mới, chống trùng, correction chain và retry/DLQ.

### Phase 3: Research Assistant

- Document chunking, hybrid retrieval.
- Structured query tools.
- Citation và evaluation set.

### Phase 4: Macro/commodities

- Generic indicator/series framework.
- FX, rates, gold, oil, metals, fertilizer theo licensed/public sources.
- Cross-series dashboards và alerts.

### Phase 5: Market/watchlist

- Instrument catalog.
- End-of-day hoặc delayed/near-realtime feed hợp pháp.
- Quotes latest, bars, watchlists và price alerts.
- Chuẩn bị realtime-gateway interface.

### Phase 6: Commercial realtime

- Licensed market feed.
- Durable Object/WebSocket fan-out.
- Entitlement-aware subscriptions.
- Tick archive, sequencing, backpressure và load tests.

### Phase 7: Multi-industry

- Banking, transport, rubber và các ngành khác.
- Industry templates cho dashboard/metrics/source registry.
- Shared screener.

### Phase 8: Scale hardening

Chỉ kích hoạt theo metrics:

- Supabase compute/replicas.
- Dedicated analytical warehouse/R2 SQL khi ổn định và phù hợp.
- Tách query API/assistant/market services.
- Multi-region strategy.
- Formal SLO và disaster recovery.

---

## 17. Architecture Decision Records

- ADR-001: GitHub monorepo là source of truth.
- ADR-002: Cloudflare auto build/deploy; không self-managed production servers.
- ADR-003: Supabase PostgreSQL là operational system of record.
- ADR-004: R2 raw-first immutable storage.
- ADR-005: Modular monolith cho product domain.
- ADR-006: Worker/Queue/Workflow cho asynchronous processing.
- ADR-007: Typed domain schemas; config-driven dashboard, không generic low-code database.
- ADR-008: Market realtime là plane riêng, bật khi có licensed feed và nhu cầu đo được.
- ADR-009: Historical high-volume data chuyển sang object storage/analytics layer, không giữ mọi tick trong OLTP.
- ADR-010: No Docker/Kubernetes requirement for production deployment.
- ADR-011: Citations, lineage và quality status bắt buộc cho dữ liệu đầu tư.
- ADR-012: Entitlement nội bộ là source of truth cho feature access.

---

## 18. Immediate implementation backlog

### Epic A: Bootstrap

- pnpm workspace.
- Next.js PWA app.
- Cloudflare adapter/runtimes được official docs khuyến nghị tại thời điểm implement.
- Wrangler configs theo app/environment.
- Cloudflare Workers Builds connection và watch paths.
- Lint, typecheck, Vitest và build gates.

### Epic B: Data foundation

- Supabase migrations.
- RLS baseline.
- Source registry.
- R2 raw artifact adapter.
- Ingestion jobs/runs/errors.
- Queue producer/consumer và DLQ.

### Epic C: Port module

- Typed entities cho ports/terminals/companies/assets.
- Catalog APIs/UI.
- Một connector official source với fixtures.
- Source/as-of/quality badges.

### Epic D: Reliability

- Idempotency.
- Parser versioning.
- Replay command/workflow.
- DQ rules.
- Health dashboard.

### Definition of Done

- Không secret trong repo.
- Migration có rollback/forward strategy.
- Tests và build pass.
- Preview deployment hoạt động.
- Raw artifact + normalized record + lineage truy xuất được.
- UI/API hiển thị source, period/as-of và quality.
- Connector tuân thủ terms/robots/rate limits.

---

## 19. Prompt để AI bắt đầu implement

```text
Hãy implement Phase 0 và Epic A-B từ architecture_plan.md.

Ràng buộc:
1. Dùng một GitHub pnpm monorepo.
2. Production deployment phải là GitHub -> Cloudflare Workers Builds; không tạo Docker/Kubernetes/VM requirement.
3. Tạo apps/web, apps/ingestion-worker và apps/processing-worker; realtime-gateway chỉ tạo interface/README, chưa provision nếu chưa cần.
4. Dùng Supabase managed PostgreSQL làm system of record và Cloudflare R2 lưu raw artifacts.
5. Dùng Cloudflare Queues với retry và DLQ; Workflows/Cron cho scheduled jobs.
6. Kiểm tra official Cloudflare docs mới nhất để chọn adapter/runtime Next.js phù hợp trước khi scaffold.
7. Tạo migration cho sources, source_records, ingestion_jobs, ingestion_runs, ingestion_errors và outbox_events.
8. Tạo env validation và .env.example không có secrets.
9. Tạo source connector interface, sample fixture connector và tests.
10. Tạo CI quality gates và cấu hình build watch paths cho monorepo.
11. Không kết nối nguồn thật trước khi xác minh robots.txt, terms, response format và quyền sử dụng.
12. Chạy lint, typecheck, tests và builds; báo rõ file đã tạo, lệnh, kết quả và blockers.
```

---

## 20. Official technical references

- Cloudflare Workers GitHub integration: https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/
- Cloudflare Workers Builds: https://developers.cloudflare.com/workers/ci-cd/builds/
- Cloudflare Next.js guide: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- Cloudflare Queues: https://developers.cloudflare.com/queues/
- Cloudflare Queue batching/retries: https://developers.cloudflare.com/queues/configuration/batching-retries/
- Cloudflare Dead Letter Queues: https://developers.cloudflare.com/queues/configuration/dead-letter-queues/
- Cloudflare Cron Triggers: https://developers.cloudflare.com/workers/configuration/cron-triggers/
- Cloudflare Workflows: https://developers.cloudflare.com/workflows/
- Cloudflare Durable Objects WebSockets: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Cloudflare R2: https://developers.cloudflare.com/r2/
- Supabase Read Replicas: https://supabase.com/docs/guides/platform/read-replicas
- Supabase Database Replication: https://supabase.com/docs/guides/database/replication
- Supabase Realtime Authorization: https://supabase.com/docs/guides/realtime/authorization

---

## 21. Final constraints

- Kiến trúc không bảo đảm scale chỉ bằng lựa chọn công nghệ; phải đo và nâng gói/tối ưu theo tải thực.
- Realtime market data phải có source/license phù hợp trước implementation thương mại.
- Không lưu mọi dữ liệu vào PostgreSQL nếu archive/history phù hợp hơn với R2.
- Không thêm Redis, Kafka, Kubernetes hoặc microservices nếu chưa có bottleneck đo được.
- Không để yêu cầu “không vận hành phức tạp” làm mất reliability: Queue, DLQ, raw storage, lineage, backup và observability vẫn là bắt buộc.
- Ngành cảng là vertical đầu tiên; core platform phải tiếp tục phục vụ macro, commodities, market, companies và các ngành sau này.

---

## 22. Port Intelligence vertical specification

**Phiên bản bổ sung:** 2.1  
**Ngày cập nhật:** 2026-10-14  
**Trạng thái:** Ready for implementation planning  
**Mục tiêu:** Chuyển Phase 1 từ định hướng tổng quát thành đặc tả có thể triển khai cho ngành cảng, đồng thời giữ nguyên kiến trúc core đa ngành.

### 22.1 Product decisions

1. `dulieucangbien.com` chỉ được dùng để tham khảo UX, taxonomy và cách trình bày. Không scrape, sao chép hoặc tái phân phối dữ liệu VIP/paywall của website này.
2. Dữ liệu production phải đến từ nguồn chính thức hoặc nguồn thương mại có giấy phép, có lineage đến từng record.
3. DWT tàu cập bến là chỉ báo về năng lực/trọng tải thiết kế của tàu, không phải khối lượng hàng thực bốc xếp. UI không được gắn nhãn DWT là “sản lượng hàng hóa thực”.
4. Mọi metric phải hiển thị `reporting_period`, `as_of`, `source`, `quality_status`, `methodology_version` và phạm vi coverage.
5. Mapping `cảng/bến/cầu cảng -> doanh nghiệp -> mã chứng khoán` phải có bằng chứng, thời gian hiệu lực và khả năng một tài sản có nhiều chủ sở hữu/đơn vị khai thác.
6. Không suy luận doanh thu từ DWT nếu chưa có mô hình được kiểm chứng, công bố sai số và cho phép đối soát với số liệu thực tế.

### 22.2 User decisions to support

Module cảng phải giúp nhà đầu tư trả lời:

- Cảng vụ, cụm cảng, cảng và bến nào đang tăng/giảm hoạt động vận hành?
- Tăng trưởng đến từ số lượt tàu, quy mô tàu, loại tàu, tuyến, hãng tàu hay bến mới?
- Doanh nghiệp niêm yết nào thực sự có quyền sở hữu hoặc khai thác tài sản đó, tỷ lệ sở hữu và thời gian hiệu lực ra sao?
- Công suất thiết kế, mức sử dụng công suất và khả năng mở rộng có tạo dư địa tăng trưởng không?
- Thay đổi luồng, độ sâu, khung giá, quy hoạch, bến mới hoặc liên doanh có thể là catalyst/risk nào?
- Dữ liệu vận hành có xác nhận hay mâu thuẫn với doanh thu, sản lượng công bố, biên lợi nhuận và kế hoạch năm?
- Định giá hiện tại phản ánh kịch bản tăng trưởng cơ sở, tích cực và tiêu cực ở mức nào?

### 22.3 Information architecture

#### A. Port Industry Overview: `/industries/ports`

**Header controls**
- Kỳ xem: 7 ngày, 30 ngày, tháng, quý, YTD, năm và khoảng tùy chọn.
- Đơn vị: DWT, lượt tàu, TEU hoặc tấn khi nguồn thực sự cung cấp.
- Bộ lọc: cảng vụ, khu vực, loại tàu, loại bến, hãng tàu, quốc tế/nội địa, trạng thái chất lượng dữ liệu.
- Hiển thị rõ ngày dữ liệu mới nhất và coverage.

**KPI strip**
- Tổng DWT trong kỳ.
- Tổng lượt tàu.
- DWT/lượt tàu trung bình.
- Tăng trưởng YoY kỳ và YTD.
- Số cảng/bến đang có dữ liệu hợp lệ.
- Số sự kiện/nguy cơ vận hành đang hiệu lực.

**Ranking**
- Xếp hạng cảng vụ theo tổng DWT 30 ngày gần nhất.
- Cho phép đổi sang lượt tàu, DWT/lượt, tăng trưởng YoY và tỷ trọng.
- Mỗi hàng có rank, rank change, value, YoY, coverage và quality badge.
- Không xếp hạng chung các đơn vị không so sánh được hoặc coverage quá khác nhau mà không cảnh báo.

**Charts and panels**
- Bản đồ cảng vụ/cảng/bến, kích thước marker theo metric đã chọn.
- DWT theo tháng/quý, có toggle actual và cumulative.
- So sánh cùng kỳ năm trước.
- Cơ cấu theo loại tàu, loại hàng hoặc tuyến, chỉ hiển thị khi nguồn có trường tương ứng.
- Top hãng tàu và tuyến hàng hải.
- Sự kiện ngành theo timeline: bến mới, thay đổi luồng/độ sâu, quy hoạch, giá/khung giá, liên doanh, gián đoạn.
- Danh sách mã niêm yết liên quan, tách `pure-play port`, `diversified`, `indirect beneficiary` và `benchmark only`.

#### B. Port Authority Detail: `/industries/ports/authorities/[slug]`

- Hồ sơ cảng vụ và khu vực quản lý.
- Danh sách cảng/bến thuộc phạm vi, kèm trạng thái mapping.
- KPI 7/30/90 ngày, MTD, QTD, YTD và năm.
- Xếp hạng cảng/bến nội bộ.
- Cơ cấu tàu/hãng/tuyến.
- Thông báo hàng hải đang hiệu lực.
- Chỉ báo data coverage: nguồn, ngày thiếu, bến chưa map, tỷ lệ record bị loại.

#### C. Listed Port Company: `/companies/[ticker]`

**Company summary**
- Tên pháp lý, mã, sàn, mô hình kinh doanh, tài sản cảng và tỷ lệ sở hữu/khai thác.
- Danh sách cảng/bến/cầu cảng liên quan, mỗi mapping có hiệu lực từ/đến và nguồn xác minh.
- Phân loại mức độ “cảng-thuần” để tránh gộp sai doanh nghiệp đa ngành.

**Operating dashboard**
- DWT, lượt tàu, DWT/lượt theo tháng, quý và năm.
- YoY tháng/quý, YTD YoY và rolling 12 months.
- Cơ cấu đóng góp theo cảng con/bến con.
- Top hãng tàu, tuyến, loại tàu.
- Nhật ký tàu theo ngày có tìm kiếm và lọc.
- Reconciliation giữa dữ liệu vận hành và số liệu doanh nghiệp công bố; chênh lệch phải được hiển thị, không tự sửa.

**Financial and investment dashboard**
- Doanh thu, lợi nhuận gộp, EBITDA nếu có thể xác định nhất quán, EBIT, LNST, CFO và capex.
- Biên lợi nhuận, ROIC/ROE, nợ ròng, khả năng trả lãi, cổ tức và pha loãng.
- Segment revenue/volume nếu doanh nghiệp công bố.
- Kế hoạch năm, mức hoàn thành và lịch sử thực hiện kế hoạch.
- Valuation: market cap/EV, P/E, EV/EBITDA, P/B và FCF yield, kèm ngày giá và nguồn hợp lệ.
- Scenario model: bear/base/bull với giả định lượt tàu, DWT/lượt, sản lượng công bố, giá/đơn giá, biên và capex. Không đưa khuyến nghị chắc chắn.
- Catalysts, risks và upcoming events.

#### D. Port/Terminal Detail: `/ports/[slug]` and `/terminals/[slug]`

**Overview**
- Cảng vụ quản lý, cảng, bến/cầu cảng, vị trí và loại bến.
- Chủ sở hữu, đơn vị khai thác, công ty niêm yết liên quan và tỷ lệ sở hữu nếu có nguồn.
- Công suất thiết kế theo đúng đơn vị nguồn: tấn/năm, TEU/năm, lượt/năm hoặc đơn vị khác.
- Chiều dài cầu bến, độ sâu, cỡ tàu tiếp nhận, loại hàng và equipment khi nguồn công bố.
- Trạng thái vận hành và các giai đoạn mở rộng.

**Operations**
- Lượt tàu hàng tháng.
- DWT tháng, quý, năm; YTD đến tháng đang xem; cùng kỳ năm trước.
- Chart DWT tháng/quý.
- Chart DWT so với cùng kỳ năm trước.
- Bảng YoY % cho kỳ và lũy kế.
- Moving averages 7/30/90 ngày và rolling 12 months.
- DWT/lượt tàu để phân biệt tăng trưởng do số tàu hay cỡ tàu.
- Hãng tàu khai thác, tuyến hàng hải, cảng trước/cảng sau nếu nguồn hợp pháp cung cấp.
- Dữ liệu tàu qua bến hằng ngày.

**Capacity and utilization**
- Công suất thiết kế và năm công bố.
- Sản lượng hàng hóa thực tế nếu có nguồn chính thức.
- Utilization chỉ tính khi tử số và mẫu số cùng đơn vị/phạm vi/methodology.
- Nếu chỉ có DWT tàu, hiển thị `DWT activity index`, không hiển thị utilization.

**Events and documents**
- Thông báo hàng hải, thay đổi độ sâu/luồng, bảo trì, đóng/mở bến.
- Văn bản quy hoạch, giấy phép, thay đổi danh mục bến/cầu cảng.
- Công bố doanh nghiệp liên quan.
- Event có `effective_from`, `effective_to`, severity, affected_entities và source.

#### E. Service Pricing: `/industries/ports/pricing`

- Registry văn bản giá/khung giá, cơ quan ban hành, hiệu lực và văn bản thay thế/sửa đổi.
- Bảng giá theo loại dịch vụ, loại tàu/hàng, khu vực/cảng/bến, đơn vị tiền tệ và VAT/status nếu nguồn nêu rõ.
- Lưu min/max/fixed/formula thay vì ép mọi giá về một số duy nhất.
- So sánh chỉ thực hiện khi cùng dịch vụ, đơn vị, điều kiện và thời kỳ hiệu lực.
- Không suy ra giá thực thu của doanh nghiệp chỉ từ khung giá.

#### F. Industry Events: `/industries/ports/events`

- Timeline và calendar view.
- Categories: regulation, planning, tariff, capacity, commissioning, maintenance, channel/depth, weather/disruption, partnership, M&A, corporate action.
- Liên kết event với authority, port, terminal, company và ticker.
- Cho phép đánh dấu `observed`, `announced`, `effective`, `completed`, `cancelled`.

### 22.4 Investment information missing from the initial list

Bổ sung các nhóm quan trọng sau:

1. **Ownership and economic interest:** tỷ lệ sở hữu, quyền khai thác, liên doanh, thời hạn concession/lease và thay đổi theo thời gian.
2. **Capacity and utilization:** công suất theo từng loại hàng, công suất bổ sung, ngày vận hành thương mại và bottleneck luồng/kho/bãi/cầu bến.
3. **Cargo mix:** container, hàng rời, lỏng, tổng hợp, Ro-Ro; nội địa/quốc tế; xuất/nhập/transshipment nếu dữ liệu cho phép.
4. **Unit economics:** doanh thu/TEU hoặc doanh thu/tấn chỉ khi doanh nghiệp công bố hoặc methodology đủ tin cậy; biên gộp, EBITDA margin, operating leverage.
5. **Financial quality:** CFO, capex duy trì/mở rộng, nợ, lãi vay, cổ tức, giao dịch bên liên quan và lợi ích cổ đông thiểu số.
6. **Plan versus actual:** kế hoạch sản lượng/doanh thu/LNST năm và mức hoàn thành theo quý/YTD.
7. **Competitive position:** thị phần theo khu vực với cùng metric, mức tập trung khách hàng/hãng tàu, độ sâu luồng, khả năng đón tàu lớn, kết nối hậu phương.
8. **Catalysts and risks:** bến mới, nạo vét, khung giá, dịch chuyển tuyến, liên minh hãng tàu, quy hoạch, thời tiết, đình trệ, pháp lý và capex delay.
9. **Valuation and scenarios:** định giá lịch sử/peer, sensitivity theo volume, price, margin, capex và thời điểm ramp-up.
10. **Data confidence:** coverage, missing days, duplicate rate, unmatched terminals, revised records và mức độ chính thức/ước tính.

### 22.5 Canonical metric definitions

Mọi metric định nghĩa trong bảng `metric_definitions` và version hóa.

- `vessel_calls`: số lần tàu ghé theo quy tắc dedup đã công bố.
- `gross_dwt_arrivals`: tổng DWT thiết kế của các tàu ghé hợp lệ; không phải cargo throughput.
- `avg_dwt_per_call`: `gross_dwt_arrivals / vessel_calls`.
- `period_yoy_pct`: `(current_period / comparable_prior_year_period - 1) * 100` khi hai kỳ có coverage tương đương.
- `ytd_dwt`: tổng từ ngày đầu năm đến cuối kỳ đang xem.
- `ytd_yoy_pct`: so sánh cùng số tháng/ngày của năm trước.
- `rolling_30d_dwt`: tổng trong cửa sổ 30 ngày kết thúc tại `as_of_date`.
- `rank_30d_dwt`: xếp hạng trên tập entity đủ điều kiện coverage tại cùng `as_of_date`.
- `reported_cargo_tonnes` và `reported_teu`: số chính thức được báo cáo, tách biệt hoàn toàn với DWT.
- `capacity_utilization_pct`: chỉ tính khi actual và capacity cùng đơn vị, scope và kỳ.

**Null policy:** không chuyển dữ liệu thiếu thành 0. `0`, `null`, `not_reported`, `not_applicable` và `coverage_incomplete` là các trạng thái khác nhau.

### 22.6 Port-domain data model additions

Bổ sung/thay đổi schema `port`:

- `port_authorities`
- `ports`
- `terminals`
- `berths`
- `channels`
- `vessels`
- `vessel_aliases`
- `port_calls`
- `port_call_events`
- `voyage_routes`
- `carriers`
- `service_routes`
- `terminal_carrier_services`
- `port_capacities`
- `port_infrastructure_facts`
- `port_metric_observations`
- `port_metric_aggregates`
- `port_rank_snapshots`
- `service_price_documents`
- `service_price_rules`
- `industry_events`
- `event_entity_links`
- `company_asset_interests`
- `company_operating_metrics`
- `company_guidance`
- `entity_mappings`
- `metric_definitions`
- `coverage_snapshots`
- `reconciliation_results`

**Critical constraints**

- `port_calls` có natural/idempotency key từ source + external record + event time + vessel identity.
- Vessel identity ưu tiên IMO; record không có identifier ổn định phải có confidence và merge history.
- Ownership/operator mapping có `valid_from`, `valid_to`, `interest_type`, `ownership_pct`, `verification_source_id`.
- Mọi observation có `unit`, `period_type`, `scope`, `status`, `source_record_id`, `methodology_version`.
- Aggregates không ghi đè raw observations và phải rebuild được.
- Rank snapshot lưu eligible universe, coverage threshold và tie-break rule.

### 22.7 API additions

Prefix: `/api/v1`

```text
GET /industries/ports/overview?from=&to=&metric=&authority=&quality=
GET /port-authorities
GET /port-authorities/{id}
GET /port-authorities/{id}/rankings?window=30d&metric=gross_dwt_arrivals
GET /ports/{id}/overview
GET /ports/{id}/terminals
GET /ports/{id}/series?metric=&grain=month|quarter|year&from=&to=
GET /ports/{id}/comparisons?metric=&mode=yoy|ytd_yoy
GET /ports/{id}/calls?from=&to=&carrier=&vesselType=&cursor=
GET /ports/{id}/carriers
GET /ports/{id}/routes
GET /terminals/{id}
GET /terminals/{id}/series
GET /companies/{id}/port-assets
GET /companies/{id}/port-operations
GET /companies/{id}/plan-vs-actual
GET /industries/ports/pricing
GET /industries/ports/events
GET /industries/ports/listed-companies
GET /data-quality/coverage?entityType=&entityId=&period=
```

API trả thêm trong `meta`:

```json
{
  "asOf": "ISO-8601",
  "reportingPeriod": {"from": "YYYY-MM-DD", "to": "YYYY-MM-DD"},
  "sources": [],
  "quality": "verified|preliminary|estimated|incomplete",
  "coverage": {"expectedDays": 0, "observedDays": 0, "ratio": null},
  "methodologyVersion": "string",
  "unit": "DWT|vessel_call|tonne|TEU|VND|USD",
  "warnings": []
}
```

### 22.8 Aggregation and ranking pipeline

1. Ingest raw vessel/port records and persist immutable artifact.
2. Resolve vessel, authority, port, terminal and berth with confidence.
3. Validate dates, DWT, duplicates, impossible movements and mapping.
4. Store canonical `port_calls`; quarantine uncertain records.
5. Build daily aggregates by authority/port/terminal/company.
6. Roll up month, quarter, year, YTD and rolling windows.
7. Calculate YoY only after coverage comparability check.
8. Materialize ranking snapshot once per data refresh.
9. Publish outbox event to invalidate cache and refresh affected UI.
10. Preserve methodology/version so historical ranks can be reproduced.

### 22.9 Data-quality rules specific to port calls

- DWT must be non-negative and within configured plausibility bounds; outliers are reviewed, not silently clipped.
- One source record cannot create multiple active calls unless explicitly modeled as separate events.
- Arrival/departure ordering must be valid where both timestamps exist.
- Alias resolution must not merge vessels solely by similar name.
- Terminal mapping by fuzzy name alone cannot be marked verified.
- Missing DWT excludes the record from DWT aggregates but may retain it for vessel-call counts.
- Coverage gap invalidates or warns on YoY/ranking according to configured threshold.
- Revised source documents create a new version and trigger aggregate rebuild.
- DWT, tonnes and TEU remain separate series and units.

### 22.10 UI components

- `MetricDefinitionPopover`
- `SourceAsOfQualityBadge`
- `CoverageBadge`
- `AuthorityRankingTable`
- `PortMapLayer`
- `PeriodComparisonChart`
- `CumulativeYoYChart`
- `DwtPerCallDecomposition`
- `CarrierRouteTable`
- `DailyPortCallTable`
- `CapacityUtilizationCard`
- `OwnershipTimeline`
- `PlanVsActualCard`
- `EventTimeline`
- `PricingRuleTable`
- `ReconciliationPanel`
- `DataQualityDrawer`

Charts phải có unit, source, as-of, tooltip định nghĩa metric, tùy chọn download và cảnh báo khi coverage không đầy đủ.

### 22.11 MVP scope and implementation slices

#### Slice 1: Catalog and verified mappings

- Port authority, port, terminal and berth catalog.
- Listed-company registry and company-asset mappings.
- Source badges, lineage and admin review queue.
- Pages: industry overview skeleton, port detail skeleton, company port-assets.

**Exit:** Không còn hardcode mapping trong UI; mọi mapping có nguồn và hiệu lực.

**Điều chỉnh được chấp thuận 16/10/2026:** quan hệ theo kỳ báo cáo được lưu riêng với nguồn/trang/kỳ và ngày bắt đầu có thể chưa xác định. Không dùng ngày cuối kỳ thay ngày hiệu lực; không yêu cầu lấp đủ lịch sử để nghiệm thu phạm vi snapshot đã chốt. Quan hệ hiệu lực đã xác minh giữ mô hình cũ. Phạm vi, tiêu chí và giới hạn công bố tại [slice_1_reported_catalog_scope.md](slice_1_reported_catalog_scope.md).

#### Slice 2: Investment-ready vessel arrival/departure data

- Collect vessel arrivals/departures, port/source area, event time and DWT where
  available from free public authority, terminal and API sources.
- Persist source-backed event history with deduplication, revisions, explicit
  missing fields and coverage metadata, ready for aggregation by later slices.
- Deliver a daily event table and basic vessel-call overview. Coordinates,
  detailed vessel positions and permit workflows are not required product outputs.

**Exit:** Có bảng tàu vào/ra theo thời gian và API dữ liệu lịch sử phục vụ các phase
tổng hợp; DWT thiếu được nêu rõ, nguồn/độ phủ kiểm tra được, refresh không tạo trùng.
Không dùng số vị trí, kế hoạch hoặc giấy phép để giả lập lượt thực tế. Phạm vi tất cả
cảng vẫn cần nghiệm thu độ phủ, không tự thu hẹp khi đổi trọng tâm sản phẩm.

**User-directed objective revision (17/10/2026):** prioritize investment-relevant
operating data, not maritime tracking or permit administration. Current scope and
acceptance: [slice2-investment-data-scope.md](slice2-investment-data-scope.md).
This revision supersedes earlier source-specific task priorities below, not the
recorded implementation history. Slice 3 retains advanced DWT aggregates, YoY and
ranking; Slice 2 prepares the event data required to compute those consistently.

Implementation scope (2026-10-17): user authorized Slice 2 after accepting the
light/dark redesign. First adapter is the public Cua Viet arrival/departure
notices of Quang Tri Maritime Administration. Facts retain reported-event
semantics and observation-scoped vessel identities where IMO is absent;
they are not AIS-confirmed movements. Runbook and acceptance boundaries:
`docs/port-calls-slice2.md`. Slice 3–5 remain outside this implementation.

User-directed expansion (2026-10-17): free official sources only; no paid provider
account/key is required. Add Len Bang notices and Can Tho/Hau Giang/My Thoi
in-port snapshots, with source-isolated revisions, separate snapshot UI/API and
no inferred departures. Snapshot observations never inflate reported call charts.
Coverage remains partial, not nationwide acceptance. Source audit and live receipt
are in `docs/port-call-source-review.md` and
`docs/catalog-review/slice2-free-sources-acceptance-20261017.json`.

#### Slice 3: DWT aggregates, YoY and ranking

- Daily/monthly/quarterly/yearly/YTD/rolling-30-day aggregates.
- 30-day authority ranking.
- Period and cumulative YoY charts.
- Coverage comparability guards.

**Exit:** Aggregate rebuild deterministically reproduces displayed values.

#### Slice 4: Carriers, routes, events and pricing

- Carrier/service-route registry.
- Maritime notices and industry events.
- Versioned price documents and normalized price rules.

**Exit:** Không hiển thị giá ngoài thời gian hiệu lực; event liên kết được với tài sản chịu tác động.

#### Slice 5: Company investment layer

- Financial statements/disclosures.
- Plan-vs-actual, operating-to-financial reconciliation.
- Valuation and scenario UI using licensed/end-of-day market data.

**Exit:** Investor page tách actual, reported, estimated và scenario; không biến estimate thành fact.

### 22.12 MVP acceptance criteria

- Có trang xếp hạng cảng vụ theo rolling 30-day DWT với eligible universe và coverage công khai.
- Có trang công ty niêm yết và danh sách cảng/bến liên quan được xác minh.
- Có trang cảng/bến gồm overview, lượt tàu tháng, DWT tháng/quý/năm, YoY kỳ, YTD YoY, hãng tàu, tuyến và nhật ký hằng ngày khi nguồn cung cấp.
- Có định nghĩa rõ DWT không phải cargo throughput.
- Có price/event registry versioned; không suy ra giá thực thu từ khung giá.
- Mọi chart/table có source, period, as-of, unit, quality và methodology.
- Missing data không biến thành zero.
- Raw artifact, normalized record, mapping decision và aggregate có audit trail.
- Parser, metric calculation, YoY, YTD, dedup, mapping và RLS có tests.
- PWA hiển thị stale/offline state và không cache dữ liệu vượt entitlement.
- Không dùng dữ liệu từ website tham khảo làm source of truth.

### 22.13 Updated immediate backlog for Port Intelligence

#### Epic P1: Domain and catalog
- Migrations cho authority/port/terminal/berth/carrier/route.
- Company-asset-interest model có temporal validity.
- Admin UI cho entity mapping và evidence.

#### Epic P2: Calls and identity
- Port-call schema và vessel resolution.
- Dedup/quarantine/replay.
- Daily calls API and UI.

#### Epic P3: Metrics
- Metric registry.
- Aggregation jobs và materialized views.
- DWT/vessel-call charts, YoY, YTD and rolling ranking.

#### Epic P4: Events and pricing
- Maritime notices to event pipeline.
- Pricing documents/rules with effective dates.
- Event/pricing pages.

#### Epic P5: Listed-company analysis
- Disclosure ingestion and financial facts.
- Plan-versus-actual.
- Reconciliation, valuation and scenarios.

#### Epic P6: Quality and operations
- Coverage dashboard.
- Mapping review queue.
- Source health, parser break alerts and aggregate rebuild tooling.

### 22.14 Screenshots that are useful but not blocking

Nếu cần đối chiếu sâu hơn với trải nghiệm VIP, các ảnh có giá trị nhất là:

1. Toàn trang chi tiết một mã cảng từ header tới cuối trang.
2. Tooltip/legend của từng chart DWT, đặc biệt cách định nghĩa tháng, quý, YTD và YoY.
3. Bảng tàu hằng ngày, gồm toàn bộ cột, filter, pagination và export.
4. Trang giá dịch vụ, gồm cách thể hiện hiệu lực, đơn vị, min/max/formula và nguồn.
5. Trang sự kiện ngành và cách liên kết event với cảng/mã.
6. Trang hãng tàu/tuyến hàng hải và điều kiện lọc.
7. Trạng thái dữ liệu thiếu, cập nhật chậm hoặc không có DWT.

Chỉ dùng ảnh để phân tích UX và yêu cầu. Không chép nội dung dữ liệu trả phí vào production dataset.

### 22.15 Implementation prompt for the next coding step

Hãy implement Slice 1 của Port Intelligence theo `architecture_plan.md` phiên bản 2.1.

Ràng buộc:
1. Giữ GitHub pnpm monorepo, Cloudflare Workers Builds, Supabase PostgreSQL và R2 như kiến trúc đã duyệt.
2. Tạo migrations typed cho `port_authorities`, `ports`, `terminals`, `berths`, `company_asset_interests`, `entity_mappings` và các bảng evidence/source cần thiết.
3. Temporal mapping phải có `valid_from`, `valid_to`, `verification_status`, `verification_source_id` và audit fields.
4. Tạo seed chỉ cho dev/test; không đưa số giả vào production.
5. Tạo API catalog và trang skeleton `/industries/ports`, `/ports/[slug]`, `/terminals/[slug]`, `/companies/[ticker]`.
6. Mọi response có source/as-of/quality/coverage metadata ngay từ đầu.
7. Tạo admin mapping review queue; không auto-verify fuzzy mapping.
8. Viết unit, database constraint, RLS và E2E tests cho catalog/mapping.
9. Không kết nối hay scrape `dulieucangbien.com`; chỉ dùng làm UX reference.
10. Chạy lint, typecheck, tests và builds; báo file, lệnh, kết quả và blockers.


### 22.12 Bổ sung công cụ refresh tham chiếu Slice 1 (16/10/2026)

Theo yêu cầu người dùng, bổ sung luồng refresh chi phí thấp qua Vnstock/VCI và adapter JSON/API FiinGroup có cấu hình riêng, kết hợp kiểm tra trang nguồn khai báo. Công cụ chạy local, chỉ hồ sơ/quan hệ công ty trong phạm vi nghiên cứu; không thêm giá, port calls, metrics hoặc Slice 2–5. Bản raw, snapshot và before/after được lưu riêng; không tự ghi đè dữ kiện đã duyệt hoặc tự công bố. Hướng dẫn vận hành và giới hạn live tại `docs/company-data-refresh.md`. Không còn áp dụng giới hạn “không connector” cũ cho riêng công cụ tham chiếu được yêu cầu bổ sung này.
