# BrainSiphon

URL: https://sadiqgpasha89.github.io/BrainSiphon/

Zero-noise engineering blueprints for AI/ML systems — **500 use cases, 10 domains × 50**. Every blueprint teaches the
_signal_ that moves the metric, names the _noise_ that wastes your quarter, and designs the whole system for
**10 million users**: HLD, sequence diagram, LLD, 10-phase end-to-end breakdown, capacity/cost model, evaluation and edge cases.

## How to find your way

- **Start here and tracks.** Each domain page opens with a three-step "Start here" path, then 7–8 tracks (for example
  fintech: payments fraud, credit and lending, financial crime, markets, insurance). A track filters the catalog.
  Both live in `content/tracks.json`; the build fails unless the tracks of a domain cover every use case exactly once.
- **Patterns.** `/patterns` lists the 11 reference patterns (the same eleven as the starter kits). Each hub shows what the
  pattern teaches, how to run its kit and every blueprint, in every domain, that is an instance of it.
- **Problem, solution and architecture, per use case.** Each blueprint has its own problem statement, solution approach and a
  stage-by-stage account of why each part of its architecture exists, all assembled from that use case's own signals,
  constraints, edge cases and metrics. The end-to-end breakdown is gated so that under 3% of its steps may be identical
  between use cases (it was 47% before).
- **Agentic solution.** Every blueprint has a section on where agents help, the typed tools they get, an autonomy ladder
  with promotion gates, guardrails and how to evaluate them. It is generated from the blueprint and not expert-reviewed.

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

## How 500 deep blueprints stay consistent

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

## Build playbooks (all 500: 8 hand-written, 492 generated)

A blueprint explains *what a good system looks like*. A **Build playbook** is what an intermediate engineer needs to
*build it*: the domain knowledge and terminology to learn first, where the data comes from, ordered milestones with numeric
exit gates, a starter kit that runs on synthetic data, a worked example, an executable test plan, decisions and pitfalls,
and a 30-day launch checklist.

**Two tiers, labelled on every page.**

- **Hand-written (8 pilots, one in each of the original eight domains).** Each has its own starter kit and numbers measured from its runs:
  card fraud, sepsis early warning, CTR prediction, demand sensing, session recommendation, knowledge tracing, SOC investigation
  agent and a developer docs assistant.
- **Generated (the other 492).** Assembled from the use case's *own* authored fields (objective, constraints, signals,
  noise, baseline and production model, pipeline, edge cases, metrics and traps), shared domain and method knowledge
  (`content/domain-knowledge`), a curated and link-checked dataset registry (`content/dataset-registry.json`) and one of **11
  reference starter kits** (`content/kits`: tabular, forecast, anomaly, recommender, graph, nlp, cv, bandit, optimize, llm-rag,
  llm-agent), each run on synthetic data and tested in CI. Generated playbooks are specific to the use case where the
  blueprint is, and generic where it is not; they have not been reviewed by a domain expert, and the kit numbers are
  the reference kit's, not the use case's.

```bash
npm run test:playbooks            # run every kit and pilot starter's pytest suite (needs Python 3.11+ and content/playbooks/requirements.txt)
npm run check:links               # verify every dataset URL (network)
```

Hand-written playbooks live in `content/playbooks/<domain>/<use-case>/` and `content/playbooks/README.md` is the authoring
template; `npm run validate:content` enforces its depth rules for them. Every loss formula also has a per-symbol legend
(`content/loss-lexicon.json` for shared symbols, `content/loss-variables.json` for use-case-specific ones); the build fails if any
symbol in any formula is unexplained.

Caveats worth knowing: the LLM-based kits (SOC copilot, docs assistant, and the `llm-agent` and `llm-rag` reference kits) use a
deterministic stand-in for the model, so the harness, guardrails and evaluation are real and testable offline; every kit's
numbers come from *synthetic* data (far easier than production); the dataset links are for the real-data run.

## Architecture

- **Next.js 15 App Router**, RSC + `generateStaticParams` (416 statically generated pages) + ISR; Tailwind; Radix; `cmdk`; KaTeX; Shiki (server-side); Mermaid (lazy, client).
- **Search** (`/api/search`): Redis cache → Postgres hybrid (full-text `ts_rank_cd` + `pgvector` cosine, fused by **Reciprocal Rank Fusion**) behind an 800 ms **circuit breaker** → build-time **MiniSearch** fallback. Embeddings are deterministic feature-hashing vectors (`src/lib/search/embed.ts`), the single swap-in point for a learned encoder.
- **Rate limiting**: Redis sliding-window (atomic Lua) with in-memory LRU fallback. **Validation**: Zod on every query parameter.
- **Ops**: OpenTelemetry (`@vercel/otel`), Pino JSON logs with `x-request-id` correlation and redaction, `/api/health/liveness`, `/api/health/readiness` (2 s dependency timeouts, 200/503), strict CSP + HSTS + nosniff + Referrer/Permissions-Policy.
- **SEO / agents**: `sitemap.xml`, `robots.txt`, dynamic OG images (`/api/og?slug=`), `/llms.txt`, and a clean `.md` for every blueprint (append `.md` to the URL).
- **Slug evolution**: `content/slug-history.json` → 308 redirects in middleware (client-side equivalent in static export).
- **Keyboard**: `⌘/Ctrl+K` search, `/` search, `[` Pure Signal Mode, `]` full detail.

## Deviations from the original spec (deliberate)

- Content is authored in a compact `.uc` DSL rather than MDX: 500 × ~25 lines is reviewable and diffable, and every file is still validated at build time.
- Search embeddings are feature-hashing vectors, not a neural model, so the project runs offline with no API keys.
- The GitHub Pages deployment is a static export (no Postgres/Redis/middleware); search uses the static index there. The Docker/compose deployment runs the full stack.
