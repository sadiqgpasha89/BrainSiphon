# Batch forecasting: demand sensing

A complete, runnable reference implementation of the **forecasting** family, and of the scheduled-batch shape shared by
**batch analytics** blueprints: no model in a request path; a nightly job reads the newest closed day, writes forecasts for
every series, and an API serves what was written. The worked use case is
[Network Demand Sensing](https://sadiqgpasha89.github.io/BrainSiphon/supply-chain/network-demand-sensing-short-term/).
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#adapting-it) says what to change for another forecasting or batch-scoring use case.

`make demo` runs the whole system on your machine in about a minute, with no cloud account and no Docker.

## What is implemented

| Capability | Where | What it does |
|---|---|---|
| Source-system integration | `data/source_system.py`, `data/contracts/sales_day.yaml` | A simulated ERP that writes each sales day, restatement and planned promotion with an outbox row, under a versioned contract |
| Ingestion and CDC | `src/bsref/cdc.py`, `src/bsref/bus.py`, `data/worker.py`, `data/ingest.py` | Outbox relay with checkpoints; inserts AND updates (restatements); a late older change can never overwrite a newer one |
| Validation and transformation | `src/bsref/validation.py`, `data/contracts/` | Row contract with quarantine; dataset rules on the forecast input (uniqueness, nulls); a run is refused when too few series reported |
| Feature engineering and storage | `features/build.py`, `features/definitions.yaml` | Origin-safe features from one function used by the backtest and the nightly run; stock-out days treated as censored demand |
| Training and evaluation | `training/train.py` | Rolling-origin backtest, three quantile models, band calibration on held-out origins, comparison with seasonal-naive |
| Packaging and registry | `serving/model.py`, `src/bsref/registry.py`, `models/` | The three quantile models and the band scale as one versioned artefact with checksum, lineage, promotion history, rollback |
| Batch processing | `serving/batch.py` | The nightly forecast run: origin selection, input validation, prediction, sanity holds, idempotent write |
| Backend API and business logic | `api/app.py`, `api/service.py` | Forecast reads, runs, planner decisions, overrides, accuracy, model operations; OpenAPI at `/docs` |
| Consuming application | `api/ui/index.html` | Planner console: latest run, held series, forecast lookup and override, live accuracy, models |
| Authentication and authorisation | `src/bsref/auth.py`, `configs/users.yaml` | OAuth2 bearer tokens (local issuer or your OIDC provider), role checks on every route, login throttling, audit log |
| Human in the loop | `src/bsref/hitl.py`, `serving/batch.py`, `api/service.py` | Implausible series are held and served the baseline until a planner accepts, keeps the baseline or overrides |
| Monitoring, logging, alerting | `monitoring/job.py`, `monitoring/alerts.yaml`, `src/bsref/observability.py` | Freshness, completeness, live WAPE against actuals, band calibration, drift, override value; ten alert rules |
| CI/CD and infrastructure | `infrastructure/`, `../../.github/workflows/reference-implementations.yml` | Dockerfile, Compose (PostgreSQL, Prometheus, Grafana), Kubernetes CronJobs, CI that runs tests and the demo |
| Feedback and retraining | `GET /v1/accuracy`, `training/retrain.py` | Actuals score every past forecast and every override; new data, age or live error triggers a gated retrain |

What is simulated, and what you replace for production, is listed in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#what-is-real-and-what-you-replace).

## Repository structure

```
batch-forecasting/
├── README.md  Makefile  requirements.txt  .env.example
├── configs/          pipeline.yaml (every tunable), users.yaml (users and roles)
├── data/             source system, CDC worker, ingestion, schema, contracts/
├── features/         definitions.yaml (feature registry), build.py
├── training/         train.py (backtest, gates), retrain.py
├── models/           registry/ is created here at run time (git-ignored); model card
├── serving/          model.py (the packaged model), batch.py (the nightly forecast run)
├── api/              app.py (routes), service.py (business logic), ui/ (planner console)
├── monitoring/       job.py, alerts.yaml, prometheus-rules.yml, prometheus.yml, grafana/
├── infrastructure/   Dockerfile, docker-compose.yml, k8s/
├── scripts/          demo.py, verify.py, bootstrap.py
├── tests/            16 tests: data and restatements, features and backtest, API and review, closed loop
├── docs/             ARCHITECTURE.md, RUNBOOK.md
└── src/bsref/        the platform layer shared by all reference implementations (vendored copy)
```

## Prerequisites

- Python 3.11 or newer (developed and tested on 3.13), `make`, about 1 GB of disk for the virtual environment.
- Optional, for the Compose profile: Docker with the Compose plugin.
- No cloud credentials. The only secrets are generated locally by `make setup`.

## Quick start

```bash
cd reference-implementations/batch-forecasting
make setup      # .venv, pinned dependencies, and .env with a generated JWT secret and demo passwords
make demo       # seed -> CDC -> backtest -> serve -> run + verify -> actuals arrive -> monitor -> retrain -> new run
```

`make demo` ends with `DEMO PASSED`. To run the steps yourself:

```bash
make seed       # 1. source system: 200 series, 399 days of history
make ingest     # 2. CDC relay + ingestion (about 20 s)
make train      # 3. rolling-origin backtest, register, promote
make forecast   # 4. the nightly batch job: forecasts for the next 14 days
make serve      # 5. API on http://127.0.0.1:8000  (docs: /docs, console: /ui/)   [leave running]
# in a second terminal:
make verify     # 6. 21 end-to-end checks through the API
make advance && make ingest   # 7. three weeks of actuals, restatements and late feeds arrive
make monitor    # 8. the first run is scored against what actually sold
make retrain    # 9. retrains because 21 new sales days arrived
make forecast   # 10. a new run with the new model
make test       # the test suite
```

## Environment variables

`make setup` writes `.env` from `.env.example`. Nothing else needs to be configured for the local profile.

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | SQLite file `var/app.db` | The platform database. PostgreSQL: `postgresql+psycopg://user:pass@host:5432/db` |
| `SOURCE_DATABASE_URL` | same as `DATABASE_URL` | The ERP's database, where the outbox lives |
| `MODEL_REGISTRY_DIR` | `models/registry` | Where model versions are stored |
| `AUTH_MODE` | `local` | `local`: this service issues HS256 tokens. `oidc`: verify RS256 tokens from your identity provider |
| `JWT_SECRET` | generated | Signing key for `AUTH_MODE=local` (at least 32 characters) |
| `OIDC_JWKS_URL`, `OIDC_ISSUER`, `OIDC_AUDIENCE` | empty | Identity-provider settings for `AUTH_MODE=oidc` (or `JWT_PUBLIC_KEY_FILE` for a static key) |
| `TOKEN_TTL_SECONDS` | `3600` | Lifetime of locally issued tokens |
| `USER_SVC_REPLENISHMENT_PASSWORD`, `USER_PLANNER_PASSWORD`, `USER_ML_ADMIN_PASSWORD` | generated | Passwords of the three demo users in `configs/users.yaml` |
| `ALERT_WEBHOOK_URL` | empty | If set, firing and resolved alerts are POSTed here as JSON |
| `API_PORT` | `8000` | Port for `make serve` and `make demo` |
| `LOG_LEVEL` | `INFO` | Log level |
| `POSTGRES_PASSWORD` | generated | Compose profile only |

## Invoke the endpoint

With `make serve` running and at least one forecast run written (`make forecast`):

```bash
set -a; source .env; set +a
TOKEN=$(curl -s -X POST localhost:8000/auth/token -d "username=svc-replenishment" --data-urlencode "password=$USER_SVC_REPLENISHMENT_PASSWORD" | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')
curl -s "localhost:8000/v1/forecasts?store_id=S001&sku=K0001" -H "Authorization: Bearer $TOKEN"
```

Response after `make demo` (first two of the 14 days shown; the dates follow the day you run it):

```json
{"run_id": "2026-11-12_v0002", "store_id": "S001", "sku": "K0001", "status": "published",
 "days": [{"target_day": "2026-11-13", "horizon": 1, "final": 20.341, "p10": 11.924, "p50": 20.341, "p90": 32.229, "baseline": 13.0},
          {"target_day": "2026-11-14", "horizon": 2, "final": 31.733, "p10": 19.069, "p50": 31.733, "p90": 48.523, "baseline": 43.0}]}
```

`final` is the number to act on: the model's p50, a planner's override, or the seasonal-naive baseline while the series is
held for review. The planner console is at <http://127.0.0.1:8000/ui/> (sign in as `planner` with `USER_PLANNER_PASSWORD`).

## Expected results

From a clean run of `make demo` with the committed configuration (seed 11, 8 stores, 25 products, 420 days). The simulated
world is deterministic for a given calendar day, so your counts should match; metrics can move in the third decimal between
library versions.

| Step | Expected |
|---|---|
| Seed | `sale: 79784`, `restate: 783`, `promo: 6686`, `malformed: 116` |
| Ingest | `processed: 87369`, `dead_lettered: 0`, `quarantined: 116`, `restatements: 783` |
| Train v0001 | `promoted: true`; rows train / calibration / test = 104909 / 10759 / 16076; WAPE 0.304 against 0.476 for seasonal-naive (forecast value added 0.36); band coverage 0.795; bias -0.035 |
| Verify | 21 lines of `PASS` (the run covers 200 series, 6 held for review), then `VERIFICATION PASSED` |
| Advance + ingest | `sale: 4200`, `restate: 45`; `processed: 4579` |
| Monitor | `live_wape: 0.297` against `live_baseline_wape: 0.482`; `live_coverage: 0.797`; `max_feature_psi: 0.087`; `override_wape_delta: -0.011`; one alert firing, `ForecastRunStale` (correct: 21 days have passed without a run) |
| Retrain | `retrained: true` because of 21 new sales days; `v0002` WAPE 0.3015 against 0.3021 for production on the same origins; `promoted: true` |
| New run | `model_version: v0002`; the `ForecastRunStale` alert resolves |

Read these honestly: the data is synthetic, with clean weekly seasonality and well-behaved promotions, so a 36% improvement
over seasonal-naive says the pipeline is wired correctly, not that you will see that on your data. The live accuracy matching
the backtest (ratio 0.98) is the property to look for in production.

## The Compose profile (PostgreSQL, Prometheus, Grafana)

```bash
make setup
docker compose -f infrastructure/docker-compose.yml --env-file .env up -d --build
docker compose -f infrastructure/docker-compose.yml --env-file .env run --rm job python scripts/bootstrap.py
docker compose -f infrastructure/docker-compose.yml --env-file .env run --rm -e API_URL=http://api:8000 job python scripts/verify.py
```

Verification status: the test suite passes on both SQLite and PostgreSQL 17 (`TEST_DATABASE_URL=postgresql+psycopg://... make test`).
The Compose file is checked with `docker compose config`, and the CI workflow builds the image and runs this profile; it was
not run on the authoring machine, which had no Docker daemon. Kubernetes manifests are in
[infrastructure/k8s](infrastructure/k8s/README.md) and are syntax-checked only.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `no .env found: run make setup first` | Run `make setup`. |
| `the source system is already seeded` | `make clean` and start again, or continue with `make advance`. |
| `RegistryError: demand-forecaster: no production version` on `make forecast` | No model was promoted. Run `make train` and read `failed_gates`. |
| `run refused: fewer than 90% of series reported` | Store feeds are late. Wait for them and re-run; lowering `data.min_origin_completeness` publishes a biased forecast. |
| `DataValidationError: forecast_input: unique...` | The input window has duplicate series-days: an ingestion bug or a source fault. Look at `quarantine` and the source. |
| `fewer than 8 training origins` | Under about 150 days of history. Seed more history before training. |
| A forecast has `status: held` and `final` equals `baseline` | A planner has not decided yet. Open the console, or `GET /v1/reviews`. |
| `ForecastRunStale` fires | The nightly job did not run for the newest day. `make forecast`; then find out why the schedule missed. |
| `401 invalid token`, `429 too many failed attempts`, `Address already in use` | Sign in again; wait five minutes; `API_PORT=8010 make serve`. |
| Any other alert | See [docs/RUNBOOK.md](docs/RUNBOOK.md): each alert has a section with checks and actions. |

## Teardown

```bash
make clean                                                         # local database, registry and logs
rm -rf .venv .env                                                  # the environment and the generated secrets
docker compose -f infrastructure/docker-compose.yml down -v        # Compose profile, including its volumes
kubectl delete namespace batch-forecasting                         # Kubernetes profile
```
