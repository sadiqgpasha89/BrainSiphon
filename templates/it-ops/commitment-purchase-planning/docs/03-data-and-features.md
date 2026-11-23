# Commitment Purchase Planning: data and feature specification

> Generated from the blueprint `it-ops/commitment-purchase-planning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Commitment Purchase Planning · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Commitment Purchase Planning": Plan reserved capacity and savings plan purchases from stable baseline usage forecasts, comparing terms and risk so finance approves commitments that will be used. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Average usage as baseline.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Stable usage floor | lowest sustained usage | Core | From billing |   |   |   |
| Growth and migration plans | planned changes | Risk | From planning |   |   |   |
| Price and term options | rates by term | Savings | From the provider |   |   |   |
| Existing commitments | current coverage and expiry | Constraint | From billing |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Baseline | The minimum steady usage | Average usage | Commitments on average cause waste |
| Risk | Demand drop scenarios | Best case only | Commitments are hard to undo |
| Decision | Finance and service owners | The model | Large commitments need accountable owners |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Account name | an identifier |
| Vendor sales contact | irrelevant |
| Invoice number | an identifier |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Stable usage floor inputs | Infrastructure and operations | IT service management platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from billing. |
| Growth and migration plans inputs | Service management | Configuration management database | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from planning. |
| Price and term options inputs | Security operations | Monitoring, logging and cloud billing platforms | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the provider. |
| Existing commitments inputs | Infrastructure and operations | IT service management platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from billing. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: commitment_purchase_planning_inputs.v1
owner: infrastructure-and-operations@example.com
system_of_record: IT service management platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: stable_usage_floor, type: double, nullable: false }
    - { name: growth_and_migration_plans, type: double, nullable: false }
    - { name: price_and_term_options, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Stable usage floor and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Growth and migration plans against IT service management platform
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Stable usage floor, traces back to IT service management platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Azure Public Dataset | https://github.com/Azure/AzurePublicDataset | CC BY 4.0 (see the repository) | Anonymised VM, workload and resource utilisation traces from Azure | One cloud and period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| GH Archive | https://www.gharchive.org/ | Public event data (see the site) | Hourly public GitHub events: pushes, pull requests, issues and reviews | Public repositories only; bot noise. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE commitment_purchase_planning_forecasts (
  series_id      TEXT        NOT NULL,
  origin         TIMESTAMPTZ NOT NULL,   -- the as_of the forecast was made at
  target_period  DATE        NOT NULL,
  horizon_step   SMALLINT    NOT NULL,
  p10            REAL        NOT NULL,
  p50            REAL        NOT NULL,
  p90            REAL        NOT NULL,
  model_version  TEXT        NOT NULL,
  is_fallback    BOOLEAN     NOT NULL DEFAULT FALSE,
  PRIMARY KEY (series_id, origin, target_period)
) PARTITION BY RANGE (origin);

-- actuals land after the fact; joining on (series_id, target_period) gives forecast error by horizon
CREATE TABLE commitment_purchase_planning_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE commitment_purchase_planning_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

IT operations keeps services running and people productive across data centres, clouds, networks and devices. Data arrives as huge volumes of metrics, logs, alerts and tickets, most of it noise, and changes made to production by automation must be controlled as carefully as changes made by people. For this use case, "Commitment Purchase Planning": Plan reserved capacity and savings plan purchases from stable baseline usage forecasts, comparing terms and risk so finance approves commitments that will be used. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Capacity is planned against peaks | Compute, storage and network capacity must cover peak demand with headroom, while lead times for hardware and commitments are long. Forecasts need ranges and business drivers. | Planning on averages leads to outages at peak. |
| Cloud cost follows usage and tagging | Cost depends on instance types, storage, data transfer and commitments, and is attributed to teams by tags. Anomalies and idle resources are common sources of waste. | Cuts that ignore peak usage cause incidents, so recommendations carry risk and an owner. |
| Changes cause most incidents | Releases, configuration changes and patches are the main cause of outages. Risk-based change management, configuration baselines and staged rollouts reduce harm. | Drift between declared and actual configuration hides risk until something fails. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Stable usage floor | Lowest sustained usage. Core. | Leakage risk to design against: From billing. |
| A signal-versus-noise trap in this use case: Baseline | The true signal is the minimum steady usage; the common noise is average usage. | Commitments on average cause waste. |

**Ask the experts**

- [ ] What exactly does "Commitments cover only the stable baseline" mean in practice for commitment purchase planning: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Stable usage floor" and "Growth and migration plans", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Commitment utilisation" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: average usage as baseline, and who can confirm the cut-off times and splits?
- [ ] How often does "Platform migration" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Savings plan | A flexible commitment to spend for a discount. |
| Reserved instance | A cloud commitment for a discount. |
| SLA | Service level agreement: a commitment on service performance. |
| ITIL | A framework of IT service management practices. |
| Change request | A proposal to change a production system. |
| CAB | Change advisory board: a group that reviews significant changes. |
| SLO | Service level objective: a target for a service measure. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Champion / challenger | The model in production and a candidate that must beat it before promotion. |
