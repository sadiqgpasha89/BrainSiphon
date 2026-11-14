# Real-time decisioning: payment fraud

A complete, runnable reference implementation of the **real-time decisioning** family: a model sits in the request path of a
business transaction and answers `ALLOW`, `STEP_UP` or `BLOCK` within a deadline. The worked use case is
[Real-Time Card & UPI Fraud Detection](https://sadiqgpasha89.github.io/BrainSiphon/fintech/real-time-card-upi-fraud-detection/).
The same shape fits any blueprint whose archetype is *Real-time decisioning* (credit pre-approval, account-takeover scoring,
bot detection, claim triage); [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#adapting-it) says what to change.

`make demo` runs the whole system on your machine in about a minute, with no cloud account and no Docker.

## What is implemented

| Capability | Where | What it does |
|---|---|---|
| Source-system integration | `data/source_system.py`, `data/contracts/transaction.yaml` | A simulated payment switch that writes each business row and an outbox row in one transaction, under a versioned data contract |
| Ingestion and CDC | `src/bsref/cdc.py`, `src/bsref/bus.py`, `data/worker.py` | Outbox relay with checkpoints, a durable ordered event log, consumer offsets, retries, a dead-letter queue, exactly-once effects |
| Validation and transformation | `src/bsref/validation.py`, `data/ingest.py`, `data/contracts/` | Every event is checked against its contract; violations are quarantined with the reason; the training set has its own contract |
| Feature engineering and storage | `features/transforms.py`, `features/definitions.yaml`, `features/backfill.py` | One feature implementation for streaming, scoring and backfill; online store, offline feature log, parity check |
| Training and evaluation | `training/dataset.py`, `training/train.py` | Label maturity, chronological split, two algorithms, calibration, thresholds fitted to a false-decline budget, held-out test |
| Packaging and registry | `serving/model.py`, `src/bsref/registry.py`, `models/` | Classifier + calibrator + thresholds as one versioned artefact with checksum, lineage, promotion history, rollback |
| Online inference | `serving/scorer.py` | Hot model swap, feature-signature check, deadline, conservative rules fallback |
| Backend API and business logic | `api/app.py`, `api/service.py` | Idempotent decisions, contract-checked requests, outcomes, model operations, OpenAPI at `/docs` |
| Consuming application | `api/ui/index.html` | Analyst console: review queue, decision mix, alerts, model versions and promotion |
| Authentication and authorisation | `src/bsref/auth.py`, `configs/users.yaml` | OAuth2 bearer tokens (local issuer or your OIDC provider), role checks on every route, login throttling, audit log |
| Human in the loop | `src/bsref/hitl.py`, `api/service.py` | Every block becomes a review task with an SLA; exclusive claim; the verdict becomes a label |
| Monitoring, logging, alerting | `monitoring/job.py`, `monitoring/alerts.yaml`, `src/bsref/observability.py` | JSON logs with request ids, Prometheus metrics, PSI drift, delayed ground truth, ten alert rules, Grafana dashboard |
| CI/CD and infrastructure | `infrastructure/`, `../../.github/workflows/reference-implementations.yml` | Dockerfile, Compose (PostgreSQL, Prometheus, Grafana), Kubernetes manifests, CI that runs tests and the demo |
| Feedback and retraining | `training/retrain.py`, `POST /v1/outcomes`, review verdicts | Chargebacks, analyst verdicts and step-up outcomes become labels; triggers start a gated retrain; the API hot-swaps |

What is simulated, and what you replace for production, is listed in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#what-is-real-and-what-you-replace).

## Repository structure

```
realtime-decisioning/
├── README.md  Makefile  requirements.txt  .env.example
├── configs/          pipeline.yaml (every tunable), users.yaml (users and roles)
├── data/             source system, CDC worker, ingestion, schema, contracts/
├── features/         definitions.yaml (feature registry), transforms.py, backfill.py
├── training/         dataset.py, train.py, retrain.py
├── models/           registry/ is created here at run time (git-ignored); MODEL_CARD.md
├── serving/          model.py (the packaged model), scorer.py (online inference)
├── api/              app.py (routes), service.py (business logic), ui/ (analyst console)
├── monitoring/       job.py, alerts.yaml, prometheus-rules.yml, prometheus.yml, grafana/
├── infrastructure/   Dockerfile, docker-compose.yml, k8s/
├── scripts/          demo.py, verify.py, bootstrap.py
├── tests/            26 tests: data, features, training, API, closed loop
├── docs/             ARCHITECTURE.md, RUNBOOK.md
└── src/bsref/        the platform layer shared by all reference implementations (vendored copy)
```

## Prerequisites

- Python 3.11 or newer (developed and tested on 3.13), `make`, about 1 GB of disk for the virtual environment.
- Optional, for the Compose profile: Docker with the Compose plugin.
- No cloud credentials. The only secrets are generated locally by `make setup`.

## Quick start

```bash
cd reference-implementations/realtime-decisioning
make setup      # .venv, pinned dependencies, and .env with a generated JWT secret and demo passwords
make demo       # seed -> CDC -> train -> serve -> verify -> monitor -> retrain -> hot swap
```

`make demo` ends with `DEMO PASSED`. To run the steps yourself, and keep the API up:

```bash
make seed       # 1. source system: about 63,000 transactions, 357 chargebacks, 132 malformed events
make ingest     # 2. CDC relay + ingestion (about 15 s)
make train      # 3. train, evaluate, register, promote
make serve      # 4. API on http://127.0.0.1:8000  (docs: /docs, console: /ui/)   [leave running]
# in a second terminal:
make advance && make ingest   # 5. eight more days of traffic and chargebacks arrive
make verify     # 6. 19 end-to-end checks through the API
make monitor    # 7. drift, delayed ground truth, alerts
make retrain    # 8. retrains because new fraud labels arrived; the running API picks up the new version
make test       # the test suite
```

## Environment variables

`make setup` writes `.env` from `.env.example`. Nothing else needs to be configured for the local profile.

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | SQLite file `var/app.db` | The platform database. PostgreSQL: `postgresql+psycopg://user:pass@host:5432/db` |
| `SOURCE_DATABASE_URL` | same as `DATABASE_URL` | The operational system's database, where the outbox lives |
| `MODEL_REGISTRY_DIR` | `models/registry` | Where model versions are stored |
| `AUTH_MODE` | `local` | `local`: this service issues HS256 tokens. `oidc`: verify RS256 tokens from your identity provider |
| `JWT_SECRET` | generated | Signing key for `AUTH_MODE=local` (at least 32 characters) |
| `OIDC_JWKS_URL`, `OIDC_ISSUER`, `OIDC_AUDIENCE` | empty | Identity-provider settings for `AUTH_MODE=oidc` (or `JWT_PUBLIC_KEY_FILE` for a static key) |
| `TOKEN_TTL_SECONDS` | `3600` | Lifetime of locally issued tokens |
| `USER_SVC_GATEWAY_PASSWORD`, `USER_ANALYST_PASSWORD`, `USER_ML_ADMIN_PASSWORD` | generated | Passwords of the three demo users in `configs/users.yaml` |
| `ALERT_WEBHOOK_URL` | empty | If set, firing and resolved alerts are POSTed here as JSON |
| `API_PORT` | `8000` | Port for `make serve` and `make demo` |
| `LOG_LEVEL` | `INFO` | Log level |
| `POSTGRES_PASSWORD` | generated | Compose profile only |

## Invoke the endpoint

With `make serve` running:

```bash
set -a; source .env; set +a
TOKEN=$(curl -s -X POST localhost:8000/auth/token -d "username=svc-gateway" --data-urlencode "password=$USER_SVC_GATEWAY_PASSWORD" | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')
curl -s -X POST localhost:8000/v1/decisions -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"txn_id":"manual-000001","card_id":17,"merchant_id":42,"device_id":990123,"amount":4200,"rail":"card","country":"AE","event_time":'"$(date +%s)"'}'
```

Response from the run that produced the numbers below (after `make demo`, so the serving model is v0002):

```json
{"txn_id":"manual-000001","action":"BLOCK","score":1.0,"reason":"new device; amount 191.9x the card average; unusual country",
 "model_version":"v0002","fallback":false,"latency_ms":3.323}
```

Send the same request again and you get the identical stored decision (idempotency). A `BLOCK` appears in the analyst console
at <http://127.0.0.1:8000/ui/> (sign in as `analyst` with `USER_ANALYST_PASSWORD` from `.env`), where you confirm or release
it; that verdict becomes a training label.

## Expected results

These numbers are from a clean run of `make demo` with the committed configuration (seed 7, 800 cards, 75 days). The simulated
world is deterministic for a given UTC day, so your counts should match; the model metrics can move in the third decimal
between library versions.

| Step | Expected |
|---|---|
| Seed | `txn: 63092`, `chargeback: 357`, `malformed: 132` |
| Ingest | `processed: 63581`, `dead_lettered: 0`, `quarantined: 132`, `duplicates: 0` |
| Train v0001 | `promoted: true`; rows train / validation / test = 19818 / 7387 / 9553; selected `logistic_regression` (validation PR-AUC 0.869 against 0.820 for gradient boosting); test PR-AUC 0.869, recall at block 1.00, false-decline rate 0.0050 |
| Verify | 19 lines of `PASS`, then `VERIFICATION PASSED` |
| Monitor | `consumer_lag: 0`, `dead_letters: 0`, `quarantine_rate: 0.002`, `max_feature_psi: 0.15`, `matured_pr_auc: 0.85`, no alert firing |
| Retrain | `retrained: true` because of 62 new fraud labels; `v0002` test PR-AUC 0.857 against 0.858 for production on the same window, inside the 0.02 regression tolerance; `promoted: true` |
| Hot swap | `PASS  the running API now serves v0002 without a restart` |

Read these honestly: the data is synthetic and far easier than production fraud, so the metrics say the pipeline is wired
correctly, not that this model would perform like this on your traffic. On this data the plain logistic regression beats
gradient boosting on validation, and the pipeline ships it; that is the selection rule working, not a defect.

## The Compose profile (PostgreSQL, Prometheus, Grafana)

```bash
make setup
docker compose -f infrastructure/docker-compose.yml --env-file .env up -d --build
docker compose -f infrastructure/docker-compose.yml --env-file .env run --rm job python scripts/bootstrap.py
docker compose -f infrastructure/docker-compose.yml --env-file .env run --rm -e API_URL=http://api:8000 job python scripts/verify.py
```

API on <http://localhost:8000>, Prometheus on <http://localhost:9090>, Grafana on <http://localhost:3000>.

Verification status: the test suite passes on both SQLite and PostgreSQL 17 (`TEST_DATABASE_URL=postgresql+psycopg://... make test`).
The Compose file is checked with `docker compose config`, and the CI workflow builds the image and runs this profile; it was
not run on the authoring machine, which had no Docker daemon. Kubernetes manifests are in
[infrastructure/k8s](infrastructure/k8s/README.md) and are syntax-checked only.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `no .env found: run make setup first` | The secrets have not been generated. Run `make setup`. |
| `the source system is already seeded` | `make seed` ran before. `make clean` and start again, or continue with `make advance`. |
| `/readyz` returns 503 with `production_model: false` | No model has been promoted. Run `make train` and read `failed_gates` in its output. |
| `DataValidationError: training_set: min_rows` | Too little matured history. Seed first, or lower `simulation.holdback_days`; do not lower `labels.maturity_days` to make it pass. |
| Every decision has `"fallback": true` | The model was refused (feature signature mismatch after editing `features/definitions.yaml`) or is missing. Retrain. |
| `401 invalid token` after a restart | `make setup` regenerated nothing, but a deleted `.env` changes `JWT_SECRET`: sign in again. |
| `429 too many failed attempts` | Five wrong passwords lock the username for five minutes (per API process). |
| `Address already in use` | Another process holds the port: `API_PORT=8010 make serve`. |
| `database is locked` (SQLite) | Two writers for a long time, usually a stuck `make worker`. Stop it; use PostgreSQL for concurrent load. |
| An alert fires in `make monitor` | See [docs/RUNBOOK.md](docs/RUNBOOK.md): each alert has a section with checks and actions. |

## Teardown

```bash
make clean                                                         # local database, registry and logs
rm -rf .venv .env                                                  # the environment and the generated secrets
docker compose -f infrastructure/docker-compose.yml down -v        # Compose profile, including its volumes
kubectl delete namespace realtime-decisioning                      # Kubernetes profile
```
