# Agentic workflow: SOC alert triage

A complete, runnable reference implementation of the **agentic workflow** family: a model plans a multi-step task with
tools, and what it may read, decide and change is bounded by a harness rather than by its prompt. The worked use case is the
[SOC Copilot for LLM-Assisted Investigation](https://sadiqgpasha89.github.io/BrainSiphon/cybersecurity/soc-copilot-llm-investigation/).
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#adapting-it) says what to change for another agent that proposes actions.

`make demo` runs the whole system on your machine in a few seconds, with no cloud account, no API key and no Docker. The
default planner is a deterministic set of investigation playbooks; switching to Claude is one configuration line and one
credential, and the harness around it does not change.

## What is implemented

| Capability | Where | What it does |
|---|---|---|
| Source-system integration | `data/source_system.py`, `data/contracts/alert.yaml`, `serving/tools.py`, `serving/actions.py` | A simulated SIEM, EDR, identity provider and threat-intelligence feed: alerts arrive through an outbox, evidence through read-only tools, containment through a separate executor |
| Ingestion and CDC | `src/bsref/cdc.py`, `src/bsref/bus.py`, `data/worker.py`, `data/ingest.py` | Outbox relay with checkpoints; one case per alert; a re-sent alert opens nothing |
| Validation and transformation | `src/bsref/validation.py`, `serving/tools.py`, `serving/agent.py` | Alert contract with quarantine; every tool validates its arguments; every disposition is validated before anything is stored |
| Feature engineering and storage | `features/definitions.yaml`, `serving/tools.py`, `agent_steps` table | The evidence an investigation may collect is declared; every collected item is stored in the trace |
| Training and evaluation | `training/train.py` | Replays labelled incidents through the production harness: decided accuracy, escalations, missed threats, unsafe actions, action recall, injection resistance, steps |
| Packaging and registry | `src/bsref/registry.py`, `models/` | The agent configuration as a versioned artefact with its evaluation, promotion history and rollback |
| Online inference | `serving/agent.py`, `serving/planners.py` | Planner inside a harness: tool allow-list, step budget, full trace, five guardrails applied after the planner |
| Backend API and business logic | `api/app.py`, `api/service.py` | Cases and traces, approvals, final verdicts, agent versions; OpenAPI at `/docs` |
| Consuming application | `api/ui/index.html` | Analyst console: cases, the agent's trace, the approval queue with required approvers, final verdicts |
| Authentication and authorisation | `src/bsref/auth.py`, `configs/users.yaml` | OAuth2 bearer tokens; analysts cannot approve; the requester can never approve; separate read and write paths to the stack |
| Human in the loop | `src/bsref/hitl.py`, `serving/actions.py` | Every containment action needs approval; critical assets need two different approvers; rejected or expired means not executed |
| Monitoring, logging, alerting | `monitoring/job.py`, `monitoring/alerts.yaml`, `src/bsref/observability.py` | Override rate, missed threats, escalations, approval rejections, tool errors, budget exhaustion, overdue approvals; nine alert rules |
| CI/CD and infrastructure | `infrastructure/`, `../../.github/workflows/reference-implementations.yml` | Dockerfile, Compose (PostgreSQL, Prometheus, Grafana), Kubernetes manifests, CI that runs tests and the demo |
| Feedback and retraining | `POST /v1/cases/{id}/verdict`, `training/retrain.py` | Each analyst verdict is feedback and a new labelled incident; enough of them, a high override rate or a config change triggers a gated re-evaluation |

What is simulated, and what you replace for production, is listed in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#what-is-real-and-what-you-replace).

## Repository structure

```
agentic-workflow/
├── README.md  Makefile  requirements.txt  .env.example
├── configs/          pipeline.yaml (the agent configuration, action approval rules, gates), users.yaml
├── data/             source systems (simulated security stack), CDC worker, ingestion, schema, contracts/
├── features/         definitions.yaml (the evidence an investigation may collect)
├── training/         train.py (evaluation on labelled incidents, gates), retrain.py (re-evaluation trigger)
├── models/           registry/ is created here at run time (git-ignored); system card
├── serving/          agent.py (harness and guardrails), planners.py, tools.py (read-only), actions.py (executor)
├── api/              app.py (routes), service.py (business logic), ui/ (analyst console)
├── monitoring/       job.py, alerts.yaml, prometheus-rules.yml, prometheus.yml, grafana/
├── infrastructure/   Dockerfile, docker-compose.yml, k8s/
├── scripts/          demo.py, verify.py, bootstrap.py
├── tests/            17 tests: harness and guardrails, evaluation and gates, API, approvals and closed loop
├── docs/             ARCHITECTURE.md, RUNBOOK.md
└── src/bsref/        the platform layer shared by all reference implementations (vendored copy)
```

## Prerequisites

- Python 3.11 or newer (developed and tested on 3.13), `make`, about 1 GB of disk for the virtual environment.
- Optional: Docker with the Compose plugin (Compose profile); Anthropic credentials (only for the Claude planner).

## Quick start

```bash
cd reference-implementations/agentic-workflow
make setup      # .venv, pinned dependencies, and .env with a generated JWT secret and demo passwords
make demo       # seed -> evaluate -> ingest + investigate -> serve -> more alerts -> verify -> monitor -> re-evaluate
```

`make demo` ends with `DEMO PASSED`. To run the steps yourself:

```bash
make seed        # 1. the security stack: 24 past incidents with signed-off verdicts, 6 live alerts
make evaluate    # 2. replay the past incidents through the agent, register the version, promote if the gates hold
make ingest      # 3. CDC relay + case ingestion; the agent investigates each new case
make serve       # 4. API on http://127.0.0.1:8000  (docs: /docs, console: /ui/)   [leave running]
# in a second terminal:
make advance && make ingest   # 5. six more alerts, one with text addressed to the agent
make verify      # 6. 23 end-to-end checks: traces, approvals, four-eyes, verdicts
make monitor     # 7. override rate, missed threats, tool errors, alerts
make reevaluate  # 8. the agent is measured again on the suite the analysts' verdicts have grown
make test        # the test suite
```

## Environment variables

`make setup` writes `.env` from `.env.example`. Nothing else needs to be configured for the local profile.

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | SQLite file `var/app.db` | The platform database. PostgreSQL: `postgresql+psycopg://user:pass@host:5432/db` |
| `SOURCE_DATABASE_URL` | same as `DATABASE_URL` | The simulated security stack's database (outbox, telemetry, response controls) |
| `MODEL_REGISTRY_DIR` | `models/registry` | Where agent versions are stored |
| `AUTH_MODE` | `local` | `local`: this service issues HS256 tokens. `oidc`: verify RS256 tokens from your identity provider |
| `JWT_SECRET` | generated | Signing key for `AUTH_MODE=local` (at least 32 characters) |
| `OIDC_JWKS_URL`, `OIDC_ISSUER`, `OIDC_AUDIENCE` | empty | Identity-provider settings for `AUTH_MODE=oidc` (or `JWT_PUBLIC_KEY_FILE` for a static key) |
| `USER_ANALYST_PASSWORD`, `USER_RESPONDER_PASSWORD`, `USER_SOC_LEAD_PASSWORD` | generated | Passwords of the three demo users in `configs/users.yaml` |
| `ANTHROPIC_API_KEY` | empty | Only for `agent.planner: anthropic`. The SDK also accepts an `ant auth login` profile |
| `ALERT_WEBHOOK_URL` | empty | If set, firing and resolved alerts are POSTed here as JSON |
| `API_PORT`, `LOG_LEVEL`, `TOKEN_TTL_SECONDS`, `WORKER_POLL_SECONDS` | `8000`, `INFO`, `3600`, `2` | Port, log level, token lifetime, worker polling interval |
| `POSTGRES_PASSWORD` | generated | Compose profile only |

## Invoke the endpoint

With `make serve` running, after `make ingest`:

```bash
set -a; source .env; set +a
TOKEN=$(curl -s -X POST localhost:8000/auth/token -d "username=analyst" --data-urlencode "password=$USER_ANALYST_PASSWORD" | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')
curl -s localhost:8000/v1/cases/L-0004 -H "Authorization: Bearer $TOKEN"
```

Response after `make demo`, shortened (the full response also has each tool's result and timing):

```json
{"case_id": "L-0004", "rule": "suspicious_process", "status": "contained", "agent_verdict": "true_positive",
 "agent_confidence": 0.95, "agent_version": "v0001", "steps": 3,
 "agent_summary": "powershell.exe started by winword.exe with an encoded command line (hash intel: malicious).",
 "trace": [{"step": 1, "tool": "get_host", "arguments": {"host": "dc-l004"}},
           {"step": 2, "tool": "process_tree", "arguments": {"host": "dc-l004"}},
           {"step": 3, "tool": "intel_lookup", "arguments": {"indicator": "bad0bad0...bad0"}}],
 "actions": [{"action": "isolate_host", "target": "dc-l004", "status": "executed"}]}
```

`dc-l004` is a critical asset: right after `make ingest` its action is `pending`, and it becomes `executed` only when two
different approvers have approved it (`responder` and `soc-lead`; try it in the console at <http://127.0.0.1:8000/ui/>).

## Using Claude as the planner

Set `agent.planner: anthropic` in `configs/pipeline.yaml`, put `ANTHROPIC_API_KEY` in `.env` (or run `ant auth login`), then
`make evaluate`. The model defaults to `claude-opus-5-5` (`agent.anthropic_model`). Claude receives the same four tools with
strict schemas plus a `propose_disposition` tool, runs in a manual tool loop under the same step budget, and opts into the
API's server-side refusal fallback. Everything after the planner is unchanged: the allow-list, the trace, the injection
check, the confidence rule, the action-scope rule, the approvals and the gates.

This path was written from the API reference and has **not** been run in this repository's tests, demo or CI (no key was
available). The first `make evaluate` with it is the test: it will not be promoted unless it passes the same gates, and
its failed cases are printed.

## Expected results

From a clean run of `make demo` with the committed configuration. The scenarios are fixed, so these should match exactly.

| Step | Expected |
|---|---|
| Seed | `historical_incidents: 24`, `live_alerts: 6`, `duplicates: 1`, `malformed: 1` |
| Evaluate v0001 | `promoted: true`; decided accuracy 1.00, escalation rate 0.25, verdict accuracy 0.75, missed threats 0, unsafe action rate 0.00, action recall 1.00, injection resistance 1.00, mean steps 3.0 |
| Ingest | `cases_opened: 6`, `duplicates: 1`, `quarantined: 1`; `investigated: 6` |
| Advance + ingest | `cases_opened: 6`, `investigated: 6` |
| Verify | 23 lines of `PASS` (12 cases, 7 actions pending approval, 3 cases left to a person), then `VERIFICATION PASSED` |
| Monitor | `uninvestigated_cases: 0`, `escalation_rate: 0.25`, `override_rate: 0`, `live_missed_threats: 0`, `tool_error_rate: 0`, `labelled_incidents: 36`, no alert firing |
| Re-evaluate | `evaluated: true` because 12 cases were labelled by analysts; `v0002` measured on 36 incidents; missed threats 0 |

Read these honestly. The scenarios are synthetic and the default planner's playbooks were written with them in view, so
"decided accuracy 1.00" says the harness and the evaluation are wired correctly, not that this agent is good at triage. The
number to look at is the 25% escalation rate: the agent declines to decide the cases a careful analyst would also hesitate
on (stolen credentials used through the corporate VPN, unknown hashes, ambiguous travel), and that is the behaviour the gates
reward. `tests/test_02_evaluation.py` shows the gates rejecting an agent that closes everything, one that escalates
everything and one that isolates everything.

## The Compose profile (PostgreSQL, Prometheus, Grafana)

```bash
make setup
docker compose -f infrastructure/docker-compose.yml --env-file .env up -d --build
docker compose -f infrastructure/docker-compose.yml --env-file .env run --rm job python scripts/bootstrap.py
docker compose -f infrastructure/docker-compose.yml --env-file .env run --rm job python -m data.source_system advance
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
| `make ingest` prints `"skipped_no_agent": 1` | No agent version is in production, so cases are opened and wait. Run `make evaluate`, then `make ingest` again. |
| `make evaluate` prints `promoted: false` | Read `failed_gates` and `failures`. A planner that misses a threat or proposes containment on a benign incident is never promoted. |
| A case stays `awaiting_approval` | An approval is missing: critical assets need two different approvers, and the requester cannot approve. See `GET /v1/approvals`. |
| `409 ... has already decided this task` | The same person tried to give both approvals. Sign in as the second approver. |
| A case is `needs_human` with "text addressed to the agent" in its summary | Telemetry contained instruction-like text. This is by design: such a case is never auto-closed as benign. |
| A case is `needs_human` with "step budget" in its summary | The planner did not conclude within `agent.max_steps`. Read the trace; raise the budget only if the calls were useful. |
| `anthropic.AuthenticationError` | `agent.planner` is `anthropic` and no valid credential was found. Set `ANTHROPIC_API_KEY`, or switch back to `policy`. |
| `401 invalid token`, `429 too many failed attempts`, `Address already in use` | Sign in again; wait five minutes; `API_PORT=8010 make serve`. |
| Any alert | See [docs/RUNBOOK.md](docs/RUNBOOK.md): each alert has a section with checks and actions. |

## Teardown

```bash
make clean                                                         # local database, registry and logs
rm -rf .venv .env                                                  # the environment and the generated secrets
docker compose -f infrastructure/docker-compose.yml down -v        # Compose profile, including its volumes
kubectl delete namespace agentic-workflow                          # Kubernetes profile
```
