# BrainSiphon

URL: https://sadiqgpasha89.github.io/BrainSiphon/

Zero-noise engineering blueprints for AI/ML systems — **400 use cases, 8 domains × 50**. Every blueprint teaches the
_signal_ that moves the metric, names the _noise_ that wastes your quarter, and designs the whole system for
**10 million users**: HLD, sequence diagram, LLD, 10-phase end-to-end breakdown, capacity/cost model, evaluation and edge cases.

## Quick start

```bash
npm ci
npm run dev                       # content:build + next dev   → http://localhost:3000
npm run validate:content          # strict gate (schema, ≥50/domain, KaTeX, Mermaid, slug history, staleness)
npm test                          # 36 unit/integration tests
npm run build && npm run test:e2e # production build + Playwright smoke tests
docker compose up --build         # app + pgvector + redis        → http://localhost:3200
npm run build:static              # CDN / GitHub Pages export → ./out
```

## How 400 deep blueprints stay consistent

Authoring is a compact, strongly-typed text format in `content/usecases/<domain>.N.uc` (see `src/content/parse.ts`).
One use case is ~25 lines: objective, loss (LaTeX), constraints, signal-vs-noise rows, high-signal features with leakage risk,
noisy features, baseline, production model, **pipeline stages**, edge cases, metrics, and a traffic profile (`a` events/user/day, `k` KB/event).

A typed generator (`src/content/expand.ts`, `design.ts`, `scale.ts`) turns that spec into the full blueprint and validates it
against the strict Zod schema (`src/schemas/usecase.schema.ts`) — **a missing section fails the build**:

| Output                                               | Derived from                                                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Pipeline + HLD + sequence + class diagrams (Mermaid) | the use case's own stages; latency budgets split by stage kind                               |
| API contract, DDL, hot-path code, runtime config     | the use case's own features, loss, stages, guardrail metrics                                 |
| Degradation ladder                                   | serving mode (online / interactive / batch)                                                  |
| 10-phase end-to-end breakdown                        | every authored field (objective, labels, features, models, metrics, edge cases)              |
| 10M-user capacity & cost table                       | `a`, `k`, compute class (CPU scorer, GPU ranker, vision, encoder, LLM tokens/s, Spark batch) |

> The capacity table is a transparent back-of-envelope model (assumptions are printed on every page), **not** a quote.

## Architecture

- **Next.js 15 App Router**, RSC + `generateStaticParams` (416 statically generated pages) + ISR; Tailwind; Radix; `cmdk`; KaTeX; Shiki (server-side); Mermaid (lazy, client).
- **Search** (`/api/search`): Redis cache → Postgres hybrid (full-text `ts_rank_cd` + `pgvector` cosine, fused by **Reciprocal Rank Fusion**) behind an 800 ms **circuit breaker** → build-time **MiniSearch** fallback. Embeddings are deterministic feature-hashing vectors (`src/lib/search/embed.ts`), the single swap-in point for a learned encoder.
- **Rate limiting**: Redis sliding-window (atomic Lua) with in-memory LRU fallback. **Validation**: Zod on every query parameter.
- **Ops**: OpenTelemetry (`@vercel/otel`), Pino JSON logs with `x-request-id` correlation and redaction, `/api/health/liveness`, `/api/health/readiness` (2 s dependency timeouts, 200/503), strict CSP + HSTS + nosniff + Referrer/Permissions-Policy.
- **SEO / agents**: `sitemap.xml`, `robots.txt`, dynamic OG images (`/api/og?slug=`), `/llms.txt`, and a clean `.md` for every blueprint (append `.md` to the URL).
- **Slug evolution**: `content/slug-history.json` → 308 redirects in middleware (client-side equivalent in static export).
- **Keyboard**: `⌘/Ctrl+K` search, `/` search, `[` Pure Signal Mode, `]` full detail.

## Deviations from the original spec (deliberate)

- Content is authored in a compact `.uc` DSL rather than MDX: 400 × ~25 lines is reviewable and diffable, and every file is still validated at build time.
- Search embeddings are feature-hashing vectors, not a neural model, so the project runs offline with no API keys.
- The GitHub Pages deployment is a static export (no Postgres/Redis/middleware); search uses the static index there. The Docker/compose deployment runs the full stack.
