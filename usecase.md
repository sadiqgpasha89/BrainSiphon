# Project Specification: BrainSiphon.com
You are a Principal Full-Stack Architect, AI/ML Systems Engineer, and Production DevOps Lead. Your task is to architect, scaffold, build, test, and configure the production operations for **BrainSiphon.com**—an ultra-high-signal, zero-noise knowledge platform for AI/ML Engineers.

## 1. Core Product Vision & User Flow
1. **Domain Selection (Menu/Navigation):** An engineer selects an industry domain from a persistent, keyboard-accessible navigation menu (e.g., FinTech & Payments, Retail & E-Commerce, Healthcare, Manufacturing, AdTech, Cybersecurity, Logistics).
2. **Use-Case Discovery (Catalog of 100s of Use Cases):** Upon selecting a domain, the user views a filterable, searchable grid/list of domain-specific AI/ML use cases (e.g., under *FinTech*: Real-Time UPI/Card Fraud Detection, Credit Default Survival Modeling, AML Graph Anomaly Detection). Users can filter by ML Paradigm (Tabular, NLP/LLM, Graph, Time-Series, Multi-Agent, CV), Latency Tier (Sub-10ms Real-Time, Near-Real-Time, Batch), and Complexity.
3. **Signal-First Knowledge Reader:** Selecting a use case opens a distraction-free, technically dense engineering blueprint designed to teach the exact **signals** that drive production performance and explicitly call out the **noise** (textbook traps, vanity metrics, leaky features, over-engineered architectures) to avoid.

---

## 2. Technical Stack (Strict Constraints)
- **Framework:** Next.js 15+ (App Router, React Server Components, TypeScript in strict mode).
- **Styling & UI:** Tailwind CSS, Radix UI primitives (headless accessible components), Lucide Icons, `cmdk` for a global `Cmd+K` / `Ctrl+K` instant search palette, KaTeX for math/loss functions, Shiki for syntax highlighting.
- **Database & Hybrid Search:** PostgreSQL with `pgvector` (via Prisma or Drizzle ORM) for metadata indexing, full-text search (`tsvector`), and semantic vector search across 100s of use cases.
- **Content Pipeline:** Hybrid Git-backed MDX + Database index. Authoring happens in strongly-typed MDX files validated at build time via **Zod** schemas, with an automated sync script that indexes frontmatter, signal/noise blocks, and embeddings into PostgreSQL.
- **Caching & Rate Limiting:** Redis (Upstash / standard Redis via `ioredis`) for search query caching and sliding-window API rate limiting.
- **Containerization & Ops:** Multi-stage Dockerfiles, `docker-compose.yml` (App + Postgres/pgvector + Redis), GitHub Actions CI/CD, OpenTelemetry instrumentation, and Pino structured logging.

---

## 3. Data Schema & Content Anatomy ("Signal vs. Noise" Enforced)
Every AI/ML Use Case MUST strictly validate against a Zod schema before build or DB ingestion. If a use case file is missing a required section, the build MUST fail.

### Required Use-Case Schema (`src/schemas/usecase.schema.ts`):
- `id`: UUID / CUID
- `slug`: URL-safe unique slug (e.g., `fintech/real-time-payment-fraud-detection`)
- `title`: String
- `domain`: Enum (`fintech`, `retail`, `healthcare`, `supply-chain`, `adtech`, `cybersecurity`, `edtech`, `saas`)
- `mlParadigms`: Array of Enums (`tabular`, `time-series`, `nlp`, `llm-agents`, `recommender`, `graph`, `computer-vision`, `reinforcement-learning`)
- `latencySLA`: Enum (`sub-10ms`, `sub-100ms`, `seconds`, `batch`)
- `difficulty`: Enum (`foundational`, `production-grade`, `staff-principal`)
- `lastVerifiedAt`: ISO Date String
- `signalVsNoiseMatrix`: Array of objects `{ concept: string, trueSignal: string, commonNoise: string, whyEngineersFail: string }`
- `problemFormulation`:
  - `businessObjective`: String
  - `mlObjectiveAndLoss`: String (supports LaTeX)
  - `constraints`: Array of strings (latency, memory, regulatory/compliance, throughput)
- `dataAndFeatures`:
  - `highSignalFeatures`: Array of `{ name, formulaOrLogic, intuition, leakageRisk }`
  - `noisyFeaturesToDrop`: Array of `{ name, whyItIsNoise }`
- `architectureBlueprint`:
  - `baselineModel`: String (why start here)
  - `productionModel`: String (exact architecture & serving stack)
  - `mermaidDiagram`: String (valid Mermaid.js syntax for pipeline visualization)
- `evaluationAndMetrics`:
  - `offlineMetrics`: Array of strings (e.g., PR-AUC at 0.5% FPR, NDCG@10)
  - `onlineBusinessMetrics`: Array of strings
  - `offlineOnlineGapTraps`: Array of strings (data leakage, survivorship bias, delayed feedback loops)
- `productionEdgeCases`: Array of `{ scenario: string, failureMode: string, mitigationStrategy: string }`

---

## 4. Edge Cases, Special Cases & Integrations to Account For
1. **Scale of 100s–1,000s of Use Cases:**
   - Do NOT bundle all MDX files into client-side JavaScript. Use Next.js Static Site Generation (`generateStaticParams`) + Incremental Static Regeneration (ISR) so reading pages are served from the CDN in <50ms.
   - Implement cursor-based pagination and virtualized lists (`@tanstack/react-virtual`) on domain catalog pages so rendering 500 use cases in a single domain never drops frames.
2. **Search Resilience & Graceful Degradation:**
   - Primary search uses hybrid PostgreSQL Full-Text (`tsvector` with BM25/ts_rank) + `pgvector` semantic similarity using Reciprocal Rank Fusion (RRF).
   - **Fallback Edge Case:** If PostgreSQL or Redis is unreachable or times out (>800ms), the `/api/search` endpoint must automatically trip a circuit breaker and fall back to a pre-built, lightweight static FlexSearch/MiniSearch index generated at build time so search never breaks for the user.
3. **Taxonomy & Slug Evolution:**
   - Engineers bookmark technical URLs. Implement a `slugHistory` redirect table/map in Next.js middleware (`308 Permanent Redirect`) so renamed use cases or reorganized domains never result in dead `404` links.
4. **Diagram & Math Rendering Failures:**
   - Wrap all Mermaid.js diagrams and KaTeX blocks in isolated React Error Boundaries. A syntax error in one diagram or equation must render a clean fallback raw-code block without crashing the entire use-case page.
5. **Cold-Start & Stale Content Prevention:**
   - Display a prominent "Last Verified Against Production Standards" badge on every use case. Build a CLI linting script (`npm run validate:content`) that flags use cases older than 180 days or missing concrete failure modes.
6. **Keyboard-First Engineer UX:**
   - Full keyboard navigation: `Cmd+K` for global search, `[` and `]` to toggle "Pure Signal Mode" (hides prose, shows only feature tables, architecture diagrams, loss functions, and edge-case matrices).

---

## 5. Production Operations (ProdOps) Requirements
You must implement all of the following operational infrastructure in the repository:

1. **Observability & Telemetry (`src/lib/telemetry/`):**
   - Configure OpenTelemetry (`@vercel/otel` or `@opentelemetry/sdk-node`) for distributed tracing across API routes and DB queries.
   - Configure `pino` for structured JSON logging with request correlation IDs (`x-request-id` injected via middleware), redacting sensitive headers.
   - Expose `/api/health/liveness` (process up) and `/api/health/readiness` (verifies Postgres & Redis connectivity with a 2-second timeout and returns appropriate HTTP 200 or 503 status codes).
2. **Security & Hardening (`src/middleware.ts` & `next.config.ts`):**
   - Strict Content Security Policy (CSP), `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy`, and `Permissions-Policy` headers.
   - Token-bucket / sliding-window rate limiting on `/api/search` and any dynamic endpoints (e.g., 60 requests/min per IP via Redis, with in-memory LRU fallback if Redis is down).
   - Strict Zod validation on all URL query parameters (`domain`, `paradigm`, `latency`, `q`, `cursor`) to prevent injection and malformed queries.
3. **SEO, LLM-Readiness & Syndication:**
   - Dynamic `sitemap.xml` and `robots.txt` generation covering all domains and 100s of use cases.
   - Dynamic OpenGraph image generation (`/api/og`) showing the Use Case Title, Domain, Latency Tier, and Top Signal vs. Noise count.
   - Expose `/llms.txt` and clean `.md` endpoints (append `.md` to any use-case URL) so engineers can pipe BrainSiphon blueprints directly into their own IDE/agents if needed.
4. **Containerization & Local Prod Simulation:**
   - Multi-stage `Dockerfile` using `node:22-alpine`, non-root `nextjs` user, standalone Next.js output (`output: 'standalone'`), and `dumb-init` for proper PID 1 signal handling (`SIGTERM` graceful shutdown).
   - `docker-compose.yml` spinning up the Next.js app, `pgvector/pgvector:pg16`, and `redis:7-alpine` with healthchecks and persistent volumes.
5. **CI/CD Pipeline (`.github/workflows/ci-cd.yml`):**
   - **Stage 1 (Static Analysis):** ESLint, Prettier, TypeScript `tsc --noEmit`.
   - **Stage 2 (Content Integrity Gate):** Run `npm run validate:content` to validate all MDX/JSON use-case files against the strict Zod schema and verify Mermaid/KaTeX syntax.
   - **Stage 3 (Automated Tests):** Vitest for unit/integration tests (search ranking logic, circuit breaker fallback, schema validation) and Playwright for E2E smoke tests (select domain from menu -> filter use case -> open use case -> toggle Signal-Only view).
   - **Stage 4 (Build & Container Scan):** Build Next.js production bundle and Docker image; run Trivy vulnerability scan.

---

## 6. Execution Plan (Execute Phase by Phase)
Do NOT write placeholder stubs or `// TODO` comments. Execute in the following order, running terminal checks at the end of each phase before moving to the next:

- **Phase 1: Project Initialization & Tooling.** Initialize Next.js (App Router, TS, Tailwind), install dependencies (Zod, Drizzle/Prisma, Pino, Lucide, Shiki, KaTeX, Mermaid, Vitest, Playwright), and configure strict TS and ESLint rules.
- **Phase 2: Schema, Database & Content Ingestion Engine.** Create the Drizzle/Prisma schema, the strict Zod Use-Case validation schema, the build-time static search index generator, and the CLI validator (`npm run validate:content`).
- **Phase 3: High-Signal Seed Content.** Generate 6 complete, production-grade sample use cases across 3 domains (`FinTech`, `Retail & E-Commerce`, `Healthcare`) with deep, realistic ML details (loss functions, feature leakage traps, latency budgets, Mermaid pipelines, and production drift edge cases).
- **Phase 4: Core UI & Engineer UX.** Build the responsive Domain Sidebar/Top Menu, the Use-Case Filter Grid, the `Cmd+K` Command Palette, and the Use-Case Reader with the "Pure Signal Mode" toggle and isolated Error Boundaries.
- **Phase 5: Search API with Circuit Breaker.** Implement the hybrid search route (`/api/search`), Redis rate limiter, and automatic fallback to the static index on DB timeout.
- **Phase 6: Production Ops, Docker & CI/CD.** Implement `/api/health/*`, OpenTelemetry, Pino logger middleware, security headers, `.md` raw export route, multi-stage `Dockerfile`, `docker-compose.yml`, and `.github/workflows/ci-cd.yml`.
- **Phase 7: Verification Gate.** Run `npm run validate:content`, `npm run typecheck`, `npm run test`, and `npm run build`. Fix any errors until the build succeeds cleanly with zero warnings.

Begin with Phase 1 now.
