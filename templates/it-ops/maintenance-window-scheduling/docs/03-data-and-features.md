# Maintenance Window Scheduling: data and feature specification

> Generated from the blueprint `it-ops/maintenance-window-scheduling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Maintenance Window Scheduling · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Maintenance Window Scheduling": Choose maintenance windows that minimise user impact by combining traffic forecasts, change calendars and dependencies, and propose them to service owners for approval. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Habit-based windows.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Traffic forecast by hour | expected load | Impact | From capacity forecasts |   |   |   |
| Change calendar | other planned changes | Conflicts | From ITSM |   |   |   |
| Dependency graph | upstream and downstream services | Order | From the CMDB |   |   |   |
| Business blackout dates | freezes and events | Constraint | From planning |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Objective | Low user impact and no conflicts | Earliest slot | The earliest slot may be at peak |
| Constraint | Dependency order and freezes | Independent scheduling | Dependent changes can collide |
| Control | Owner approval | Automatic booking | Owners know local constraints |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Requester name | personal data |
| Change number | an identifier |
| Team name | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Traffic forecast by hour inputs | Infrastructure and operations | IT service management platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from capacity forecasts. |
| Change calendar inputs | Service management | Configuration management database | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from ITSM. |
| Dependency graph inputs | Security operations | Monitoring, logging and cloud billing platforms | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the CMDB. |
| Business blackout dates inputs | Infrastructure and operations | IT service management platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from planning. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: maintenance_window_scheduling_inputs.v1
owner: infrastructure-and-operations@example.com
system_of_record: IT service management platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: traffic_forecast_by_hour, type: double, nullable: false }
    - { name: change_calendar, type: double, nullable: false }
    - { name: dependency_graph, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Traffic forecast by hour and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Change calendar against IT service management platform
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Traffic forecast by hour, traces back to IT service management platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ETT electricity transformer dataset | https://github.com/zhouhaoyi/ETDataset | CC BY-ND 4.0 (see the repository) | Multivariate transformer temperature and load data used for long-horizon forecasting benchmarks | One asset type. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Duolingo half-life regression data | https://github.com/duolingo/halflife-regression | CC BY-NC 4.0 (see the repository) | Learner review logs with recall outcomes for spaced-repetition modelling | One app and language-learning domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE maintenance_window_scheduling_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE maintenance_window_scheduling_outputs (
  run_id TEXT NOT NULL REFERENCES maintenance_window_scheduling_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE maintenance_window_scheduling_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE maintenance_window_scheduling_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

IT operations keeps services running and people productive across data centres, clouds, networks and devices. Data arrives as huge volumes of metrics, logs, alerts and tickets, most of it noise, and changes made to production by automation must be controlled as carefully as changes made by people. For this use case, "Maintenance Window Scheduling": Choose maintenance windows that minimise user impact by combining traffic forecasts, change calendars and dependencies, and propose them to service owners for approval. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Changes cause most incidents | Releases, configuration changes and patches are the main cause of outages. Risk-based change management, configuration baselines and staged rollouts reduce harm. | Drift between declared and actual configuration hides risk until something fails. |
| Capacity is planned against peaks | Compute, storage and network capacity must cover peak demand with headroom, while lead times for hardware and commitments are long. Forecasts need ranges and business drivers. | Planning on averages leads to outages at peak. |
| Alerts are mostly noise | Monitoring tools raise thousands of alerts, many duplicate or symptoms of one fault. Grouping alerts by topology and time into incidents reduces pages and speeds diagnosis. | Suppressing alerts without visibility can hide a real outage, so grouped alerts must stay inspectable. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Traffic forecast by hour | Expected load. Impact. | Leakage risk to design against: From capacity forecasts. |
| A signal-versus-noise trap in this use case: Objective | The true signal is low user impact and no conflicts; the common noise is earliest slot. | The earliest slot may be at peak. |

**Ask the experts**

- [ ] What exactly does "Windows avoid freeze periods and peak traffic" mean in practice for maintenance window scheduling: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Traffic forecast by hour" and "Change calendar", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "User impact during maintenance" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: habit-based windows, and who can confirm the cut-off times and splits?
- [ ] How often does "Global user base" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Maintenance window | An agreed time for planned work. |
| Change request | A proposal to change a production system. |
| SLO | Service level objective: a target for a service measure. |
| ITSM | IT service management: the practice and tools for managing IT services. |
| CMDB | Configuration management database: records of IT assets and their relationships. |
| CAB | Change advisory board: a group that reviews significant changes. |
| Topology | The map of how systems depend on each other. |
| Autoscaling | Adding or removing capacity automatically with load. |
| Separation of duties | Splitting a task so no one person can complete it alone. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Model registry | A versioned store of models with metadata, used for promotion and rollback. |
