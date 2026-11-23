# IT Asset Lifecycle and Refresh Planning: data and feature specification

> Generated from the blueprint `it-ops/it-asset-lifecycle-refresh-planning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** IT Asset Lifecycle and Refresh Planning · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "IT Asset Lifecycle and Refresh Planning": Forecast device and server refresh needs from age, failure risk and support dates and plan purchases and disposal across the year within budget. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Age-only cycles.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Failure risk | predicted failure probability | Core | From device models |   |   |   |
| Vendor support end dates | end of support | Constraint | From vendors |   |   |   |
| Utilisation and role needs | workload needs | Fit | From monitoring |   |   |   |
| Budget limits | approved spend | Constraint | From finance |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Basis | Risk and support dates | Age only | Some old devices are fine and some new ones fail |
| Disposal | Certified wipe and recycling | Unlogged disposal | Data can leak from old devices |
| Plan | Budget scenarios | A single plan | Budgets change |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Employee name | personal data |
| Asset tag | an identifier |
| Vendor brand | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Failure risk inputs | Infrastructure and operations | IT service management platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from device models. |
| Vendor support end dates inputs | Service management | Configuration management database | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from vendors. |
| Utilisation and role needs inputs | Security operations | Monitoring, logging and cloud billing platforms | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from monitoring. |
| Budget limits inputs | Infrastructure and operations | IT service management platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from finance. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: it_asset_lifecycle_refresh_planning_inputs.v1
owner: infrastructure-and-operations@example.com
system_of_record: IT service management platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: failure_risk, type: double, nullable: false }
    - { name: vendor_support_end_dates, type: double, nullable: false }
    - { name: utilisation_and_role_needs, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Failure risk and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Vendor support end dates against IT service management platform
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Failure risk, traces back to IT service management platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Azure Public Dataset | https://github.com/Azure/AzurePublicDataset | CC BY 4.0 (see the repository) | Anonymised VM, workload and resource utilisation traces from Azure | One cloud and period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DataCo Smart Supply Chain | https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis | See the dataset page; free Kaggle login | 180K order lines with shipping modes, delivery status, late-delivery risk and customers | Synthetic-looking and single company; use for pipeline work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE it_asset_lifecycle_refresh_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE it_asset_lifecycle_refresh_outputs (
  run_id TEXT NOT NULL REFERENCES it_asset_lifecycle_refresh_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE it_asset_lifecycle_refresh_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE it_asset_lifecycle_refresh_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

IT operations keeps services running and people productive across data centres, clouds, networks and devices. Data arrives as huge volumes of metrics, logs, alerts and tickets, most of it noise, and changes made to production by automation must be controlled as carefully as changes made by people. For this use case, "IT Asset Lifecycle and Refresh Planning": Forecast device and server refresh needs from age, failure risk and support dates and plan purchases and disposal across the year within budget. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Capacity is planned against peaks | Compute, storage and network capacity must cover peak demand with headroom, while lead times for hardware and commitments are long. Forecasts need ranges and business drivers. | Planning on averages leads to outages at peak. |
| Changes cause most incidents | Releases, configuration changes and patches are the main cause of outages. Risk-based change management, configuration baselines and staged rollouts reduce harm. | Drift between declared and actual configuration hides risk until something fails. |
| Cloud cost follows usage and tagging | Cost depends on instance types, storage, data transfer and commitments, and is attributed to teams by tags. Anomalies and idle resources are common sources of waste. | Cuts that ignore peak usage cause incidents, so recommendations carry risk and an owner. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Failure risk | Predicted failure probability. Core. | Leakage risk to design against: From device models. |
| A signal-versus-noise trap in this use case: Basis | The true signal is risk and support dates; the common noise is age only. | Some old devices are fine and some new ones fail. |

**Ask the experts**

- [ ] What exactly does "Refresh plans within the approved budget" mean in practice for it asset lifecycle and refresh planning: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Failure risk" and "Vendor support end dates", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Unplanned device failures" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: age-only cycles, and who can confirm the cut-off times and splits?
- [ ] How often does "Supply delay" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Asset lifecycle | The stages from buying a device to disposing of it. |
| CMDB | Configuration management database: records of IT assets and their relationships. |
| Configuration item | A component such as a server or application tracked in the CMDB. |
| Change request | A proposal to change a production system. |
| CAB | Change advisory board: a group that reviews significant changes. |
| Telemetry | Data sent from systems about their state. |
| Savings plan | A flexible commitment to spend for a discount. |
| Tagging | Labels on resources used to assign cost and owners. |
| Maintenance window | An agreed time for planned work. |
| JML | Joiner, mover, leaver: the lifecycle of a person's access. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Platt scaling | Calibrating scores with a logistic curve. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| p99 latency | The time within which 99% of requests complete. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
