# Reference implementations

A blueprint tells you what to build. Each directory here is one **complete, runnable system** for a family of blueprints:
clone, `make setup`, `make demo`, and a source system, CDC, validation, features, training, a registry, serving, an API with
authentication, a consuming application, human review, monitoring and a retraining loop run on your machine and check
themselves. No cloud account, no API key and no Docker are needed for the default profile.

| Implementation | Solution family (blueprint archetype) | Worked use case | What makes it different | Checks |
|---|---|---|---|---|
| [realtime-decisioning](realtime-decisioning/) | Real-time decisioning | Card and UPI fraud | A model in the request path under a deadline; streaming features; delayed labels; every block reviewed | 26 tests, 19-check verification |
| [batch-forecasting](batch-forecasting/) | Forecasting; the scheduled-batch shape of Batch analytics | Demand sensing | No model in a request path; nightly run; restatements; rolling-origin backtest; planner overrides scored | 16 tests, 21-check verification |
| [rag-assistant](rag-assistant/) | Retrieval-augmented generation | Developer documentation assistant | The index is the versioned artefact; access control before ranking; cited answers or a refusal; reviews grow the evaluation set | 15 tests, 21-check verification |
| [agentic-workflow](agentic-workflow/) | Agentic workflow | SOC alert triage | A planner inside a harness; read-only tools; approval-gated actions with four-eyes; measured against analysts | 17 tests, 23-check verification |

These four are separate implementations because the systems are different in kind: they do not share an endpoint, a data
model, a failure mode or a definition of "correct". They do share a platform layer.

## Coverage of the 500 blueprints

Every blueprint has one of nine solution archetypes (`src/content/archetype-lld.ts`). Counts from the current content build:

| Archetype | Blueprints | Reference implementation |
|---|---|---|
| Batch analytics | 119 | **Adapt** [batch-forecasting](batch-forecasting/docs/ARCHITECTURE.md#adapting-it): same pipeline; replace the model, the run's output table and the accuracy join |
| Real-time decisioning | 100 | [realtime-decisioning](realtime-decisioning/) |
| Computer vision | 66 | **None yet** |
| Document and language extraction | 48 | **None yet** |
| Retrieval-augmented generation | 44 | [rag-assistant](rag-assistant/) |
| Forecasting | 35 | [batch-forecasting](batch-forecasting/) |
| Agentic workflow | 35 | [agentic-workflow](agentic-workflow/) |
| Optimisation and planning | 32 | **None yet** |
| Recommendation and ranking | 21 | **None yet** |

So 214 blueprints have an implementation of their own family, 119 more have one to adapt with named changes, and 167 have
none yet. For those four families the platform layer (below) still applies unchanged; the family-specific parts (image or
document ingestion, a solver, a two-stage ranker) are not written. The site says the same thing on each blueprint rather
than pointing at the nearest look-alike.

An implementation is of a *family*, shown through one use case. It is not an implementation of every blueprint in that
family: each `docs/ARCHITECTURE.md` ends with what to change for another use case.

## What every implementation contains

The same fourteen capabilities, each in the same place:

| Capability | Directory |
|---|---|
| Source-system integration (a simulated operational system behind a versioned data contract) | `data/source_system.py`, `data/contracts/` |
| Ingestion and change data capture (transactional outbox, relay, ordered log, offsets, dead letters) | `data/worker.py`, `data/ingest.py`, `src/bsref/` |
| Validation and transformation (contract checks, quarantine, dataset rules) | `data/`, `src/bsref/validation.py` |
| Feature engineering and storage (a registry file, one implementation for training and serving) | `features/` |
| Training and evaluation (time-aware splits, baselines, gates on held-out data) | `training/` |
| Packaging and registry (immutable versions, checksum, lineage, promotion history, rollback) | `models/`, `src/bsref/registry.py` |
| Online inference or batch processing | `serving/` |
| Backend API and business logic (FastAPI, OpenAPI at `/docs`) | `api/app.py`, `api/service.py` |
| Consuming application (a page served by the API at `/ui/`) | `api/ui/` |
| Authentication and authorisation (OAuth2 bearer tokens, roles on every route, OIDC mode) | `src/bsref/auth.py`, `configs/users.yaml` |
| Human in the loop (review queue with claim, SLA, four-eyes) | `src/bsref/hitl.py` |
| Monitoring, logging and alerting (JSON logs, Prometheus metrics, drift, alert rules, runbook) | `monitoring/`, `docs/RUNBOOK.md` |
| CI/CD and infrastructure (Dockerfile, Compose, Kubernetes, CI workflow) | `infrastructure/`, `.github/workflows/reference-implementations.yml` |
| Feedback and retraining (outcomes become labels or evaluation examples; gated retrain; hot swap) | `training/retrain.py` |

and the same top-level layout: `configs/ data/ features/ training/ models/ serving/ api/ monitoring/ infrastructure/ scripts/
tests/ docs/ src/`, with a `README.md` (prerequisites, environment variables, commands, expected results, troubleshooting,
teardown), a `Makefile` and a pinned `requirements.txt`.

## Run everything

```bash
cd reference-implementations
make setup     # one virtual environment for all four, and a generated .env in each
make test      # 17 platform tests + 74 implementation tests
make demo      # the four end-to-end demos, each from a clean state
```

Or work in one directory: every implementation has its own `make setup` and is self-contained.

## The shared platform layer

`_platform/bsref` is about 1,300 lines that every implementation needs and none should rewrite: settings, the portable
database schema, the event log and CDC relay, contract validation, the feature store interface, the model registry,
authentication, the review queue, metrics and alerting, and the API shell. `tools/sync_platform.py` copies it into each
implementation's `src/bsref`, so that a directory can be lifted out of this repository and still run; CI fails if a copy
differs from the source. Edit `_platform/bsref`, then `make sync`.

## What has and has not been verified

Stated once here, and repeated in each README, because the difference matters:

- **Run and passing on the authoring machine:** every test suite on SQLite and on PostgreSQL 17; every `make demo`; every
  curl example printed in a README; `ruff` on all code.
- **Checked for syntax only:** the Compose files (`docker compose config`) and the Kubernetes manifests (YAML parse). No
  Docker daemon was available. The CI workflow builds each image and runs each Compose profile end to end; treat its first
  run as the test of those files.
- **Not run:** the two Claude code paths (`rag-assistant` generator, `agentic-workflow` planner). They were written from the
  API reference; no key was available. Both sit behind the same evaluation gates as the default paths.
- **Simulated by design:** the source systems and their data. Every metric in a README is a statement about wiring, not
  about how a model would perform on your data. Each `docs/ARCHITECTURE.md` lists what is simulated and what replaces it.
- **Not claimed:** load or latency testing at production scale, a security review, or use in a real deployment.
