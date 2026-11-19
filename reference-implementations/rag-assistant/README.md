# RAG assistant: developer documentation

A complete, runnable reference implementation of the **retrieval-augmented generation** family: answers come from a
document collection, every sentence cites its source, and the system declines when the documents do not hold the answer.
The worked use case is the
[Developer Documentation Assistant](https://sadiqgpasha89.github.io/BrainSiphon/saas/developer-docs-assistant/).
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#adapting-it) says what to change for another grounded-QA use case.

`make demo` runs the whole system on your machine in a few seconds, with no cloud account, no API key and no Docker. The
default generator is extractive and deterministic; switching to Claude is one configuration line and one credential.

## What is implemented

| Capability | Where | What it does |
|---|---|---|
| Source-system integration | `data/source_system.py`, `data/contracts/document.yaml` | A simulated documentation CMS that writes every publish, update and delete with an outbox row, under a versioned contract |
| Ingestion and CDC | `src/bsref/cdc.py`, `src/bsref/bus.py`, `data/worker.py`, `data/ingest.py` | Outbox relay with checkpoints; updates and deletes are applied; unchanged content is skipped by hash; stale versions are ignored |
| Validation and transformation | `src/bsref/validation.py`, `features/chunking.py` | Contract check with quarantine; paragraph screening for text addressed to the model; sentence-aware chunking with overlap |
| Feature engineering and storage | `features/definitions.yaml`, `serving/model.py` | The chunk schema is the registered "feature view"; the index stores lexical statistics and dense vectors for every chunk |
| Training and evaluation | `training/train.py`, `training/evalset.py` | "Training" is building the index; evaluation runs the whole answer pipeline: recall@5, MRR, correctness, faithfulness, abstention, access leaks |
| Packaging and registry | `serving/model.py`, `src/bsref/registry.py`, `models/` | The index as a versioned artefact with checksum, source-document hashes, promotion history and rollback |
| Online inference | `serving/answer.py`, `serving/llm.py` | Retrieve with access control, decide whether to answer, generate, verify every citation, abstain; hot index swap |
| Backend API and business logic | `api/app.py`, `api/service.py` | Ask, rate, review, index operations; the reader's audience comes from the token, never from the request |
| Consuming application | `api/ui/index.html` | An ask box with sources and rating buttons; for staff, the review queue, live statistics and index versions |
| Authentication and authorisation | `src/bsref/auth.py`, `configs/users.yaml` | OAuth2 bearer tokens (local issuer or your OIDC provider); document-level access control enforced before ranking |
| Human in the loop | `src/bsref/hitl.py`, `api/service.py` | Declined and down-voted answers go to the documentation team; each decision becomes an evaluation example |
| Monitoring, logging, alerting | `monitoring/job.py`, `monitoring/alerts.yaml`, `src/bsref/observability.py` | Index staleness, live re-evaluation, abstain and thumbs-down rates, unsupported sentences, latency; nine alert rules |
| CI/CD and infrastructure | `infrastructure/`, `../../.github/workflows/reference-implementations.yml` | Dockerfile, Compose (PostgreSQL, Prometheus, Grafana), Kubernetes manifests, CI that runs tests and the demo |
| Feedback and retraining | `POST /v1/answers/{id}/feedback`, `training/retrain.py` | Ratings and reviews grow the evaluation set; document changes or new examples trigger a gated re-index; the API hot-swaps |

What is simulated, and what you replace for production, is listed in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#what-is-real-and-what-you-replace).

## Repository structure

```
rag-assistant/
├── README.md  Makefile  requirements.txt  .env.example
├── configs/          pipeline.yaml (every tunable), users.yaml (users and roles)
├── data/             source system (CMS), CDC worker, ingestion, schema, contracts/
├── features/         definitions.yaml (chunk schema), chunking.py (chunking and injection screening)
├── training/         train.py (index build, evaluation, gates), evalset.py, retrain.py (re-index trigger)
├── models/           registry/ is created here at run time (git-ignored); system card
├── serving/          model.py (the retrieval index), answer.py (the answer pipeline), llm.py (generators)
├── api/              app.py (routes), service.py (business logic), ui/ (ask box and staff page)
├── monitoring/       job.py, alerts.yaml, prometheus-rules.yml, prometheus.yml, grafana/
├── infrastructure/   Dockerfile, docker-compose.yml, k8s/
├── scripts/          demo.py, verify.py, bootstrap.py
├── tests/            15 tests: ingestion and screening, retrieval and answers, API and closed loop
├── docs/             ARCHITECTURE.md, RUNBOOK.md
└── src/bsref/        the platform layer shared by all reference implementations (vendored copy)
```

## Prerequisites

- Python 3.11 or newer (developed and tested on 3.13), `make`, about 1 GB of disk for the virtual environment.
- Optional: Docker with the Compose plugin (Compose profile); Anthropic credentials (only for the Claude generator).

## Quick start

```bash
cd reference-implementations/rag-assistant
make setup      # .venv, pinned dependencies, and .env with a generated JWT secret and demo passwords
make demo       # seed -> CDC -> index -> serve -> verify -> docs change -> monitor -> re-index -> hot swap
```

`make demo` ends with `DEMO PASSED`. To run the steps yourself:

```bash
make seed       # 1. the CMS publishes 31 documents (and one malformed event)
make ingest     # 2. CDC relay + ingestion: validate, screen, chunk
make index      # 3. build the index, evaluate the answer pipeline, promote
make serve      # 4. API on http://127.0.0.1:8000  (docs: /docs, application: /ui/)   [leave running]
# in a second terminal:
make verify     # 5. 21 end-to-end checks through the API
make advance && make ingest   # 6. the docs team edits the site
make monitor    # 7. the RagIndexStale alert fires: 3 documents differ from the serving index
make reindex    # 8. rebuilds, evaluates and promotes; the running API picks up the new index
make test       # the test suite
```

## Environment variables

`make setup` writes `.env` from `.env.example`. Nothing else needs to be configured for the local profile.

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | SQLite file `var/app.db` | The platform database. PostgreSQL: `postgresql+psycopg://user:pass@host:5432/db` |
| `SOURCE_DATABASE_URL` | same as `DATABASE_URL` | The CMS's database, where the outbox lives |
| `MODEL_REGISTRY_DIR` | `models/registry` | Where index versions are stored |
| `AUTH_MODE` | `local` | `local`: this service issues HS256 tokens. `oidc`: verify RS256 tokens from your identity provider |
| `JWT_SECRET` | generated | Signing key for `AUTH_MODE=local` (at least 32 characters) |
| `OIDC_JWKS_URL`, `OIDC_ISSUER`, `OIDC_AUDIENCE` | empty | Identity-provider settings for `AUTH_MODE=oidc` (or `JWT_PUBLIC_KEY_FILE` for a static key) |
| `USER_CUSTOMER_PASSWORD`, `USER_EMPLOYEE_PASSWORD`, `USER_WRITER_PASSWORD`, `USER_ML_ADMIN_PASSWORD` | generated | Passwords of the four demo users in `configs/users.yaml` |
| `ANTHROPIC_API_KEY` | empty | Only for `generation.provider: anthropic`. The SDK also accepts an `ant auth login` profile |
| `ALERT_WEBHOOK_URL` | empty | If set, firing and resolved alerts are POSTed here as JSON |
| `API_PORT`, `LOG_LEVEL`, `TOKEN_TTL_SECONDS` | `8000`, `INFO`, `3600` | Port, log level, token lifetime |
| `POSTGRES_PASSWORD` | generated | Compose profile only |

## Invoke the endpoint

With `make serve` running:

```bash
set -a; source .env; set +a
TOKEN=$(curl -s -X POST localhost:8000/auth/token -d "username=customer" --data-urlencode "password=$USER_CUSTOMER_PASSWORD" | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')
curl -s -X POST localhost:8000/v1/ask -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"question":"How long are idempotency keys stored?"}'
```

Response from the run that produced the numbers below (the `answer_id` differs every time):

```json
{"answer_id":"512c79e1433e47698339bda16b05c266","status":"answered",
 "answer":"Idempotency keys are stored for 24 hours. [idempotency#1]",
 "citations":[{"chunk_id":"idempotency#1","doc_id":"idempotency","title":"Idempotent requests","doc_version":1}],
 "index_version":"v0002","provider":"extractive","latency_ms":2.51}
```

Try `{"question":"Who has to approve a discount above 20 percent?"}` as `customer` (declined) and as `employee` (answered from
the internal page). The application is at <http://127.0.0.1:8000/ui/>.

## Using Claude as the generator

Set `generation.provider: anthropic` in `configs/pipeline.yaml`, put `ANTHROPIC_API_KEY` in `.env` (or run `ant auth login`),
then `make index` to re-evaluate and `make serve`. The model defaults to `claude-opus-5-5` (`generation.anthropic_model`). The
call constrains the output to a JSON schema in which every sentence names the chunk it relies on, and opts into the API's
server-side refusal fallback. Retrieval, access control, citation verification, abstention, feedback and monitoring are
unchanged, and the same gates apply.

This path was written from the API reference and has **not** been run in this repository's tests, demo or CI (no key was
available). Treat the first `make index` with it as the test: read the `failures` it prints before relying on it.

## Expected results

From a clean run of `make demo` with the committed configuration. The corpus is fixed, so these should match exactly.

| Step | Expected |
|---|---|
| Seed | `published: 31`, `malformed: 1` |
| Ingest | `processed: 32`, `indexed_documents: 31`, `chunks: 59`, `quarantined_documents: 1`, `quarantined_chunks: 1` |
| Index v0001 | `promoted: true`; 35 evaluation examples; recall@5 1.00, MRR 1.00, answer correctness 1.00, faithfulness 1.00, abstention accuracy 0.857 (6 of 7), access-control leaks 0 |
| Verify | 21 lines of `PASS`, then `VERIFICATION PASSED` |
| Before the edit | `Sandbox data is reset every Sunday at 00:00 UTC, ... [sandbox#0]` |
| Advance + ingest | `updated: 1, deleted: 1, published: 1`; `indexed_documents: 2`, `deleted: 1` |
| Monitor | `stale_documents: 3`, `new_eval_examples: 2`; the `RagIndexStale` alert fires |
| Re-index | `rebuilt: true` because 3 documents changed; `v0002` is promoted; 37 evaluation examples |
| After the edit | the running API serves `v0002` and answers `Sandbox data is reset every day at 00:00 UTC, ... [sandbox#0]`; the alert resolves |

Read these honestly. The corpus is 31 short synthetic pages and the questions were written alongside them, so perfect
retrieval is expected and says the pipeline is wired correctly, not that retrieval is solved. The one failing seed example
is real and instructive: "What is the admin API key?" shares the words "API key" with the authentication page, passes the
lexical abstention threshold and gets a grounded but irrelevant sentence. Nothing leaks (the planted instruction is
quarantined at ingestion), but a production system needs a stronger answerability check than word overlap.

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
| `/readyz` returns 503 with `production_index: false` | No index was promoted. Run `make index` and read `failed_gates` and `failures`. |
| Every answer is "I can't find that..." | The index is empty or `retrieval.min_score` is too high for your corpus. Check `chunks` in `make index`; tune the threshold on your evaluation set, not by feel. |
| An answer is out of date | The index is stale. `make monitor` shows `stale_documents`; `make reindex`. |
| A reader sees less than expected | Access is decided by the token's roles (`employee` unlocks internal documents). Check `GET /auth/me`. |
| `index refused: chunk schema mismatch` in the log | `features/definitions.yaml` changed since the index was built. `make index`. |
| `anthropic.AuthenticationError` | `generation.provider` is `anthropic` and no valid credential was found. Set `ANTHROPIC_API_KEY`, or switch back to `extractive`. |
| An answer has `status: refused` | The model declined the request (Claude generator only). The question and status are in the `answers` table. |
| `401 invalid token`, `429 too many failed attempts`, `Address already in use` | Sign in again; wait five minutes; `API_PORT=8010 make serve`. |
| Any alert | See [docs/RUNBOOK.md](docs/RUNBOOK.md): each alert has a section with checks and actions. |

## Teardown

```bash
make clean                                                         # local database, registry and logs
rm -rf .venv .env                                                  # the environment and the generated secrets
docker compose -f infrastructure/docker-compose.yml down -v        # Compose profile, including its volumes
kubectl delete namespace rag-assistant                             # Kubernetes profile
```
