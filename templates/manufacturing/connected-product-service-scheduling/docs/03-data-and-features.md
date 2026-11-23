# Connected Product Service Scheduling: data and feature specification

> Generated from the blueprint `manufacturing/connected-product-service-scheduling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Connected Product Service Scheduling · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Connected Product Service Scheduling": Schedule service visits and parts for connected industrial products from usage and condition data so customers have fewer breakdowns and fewer unnecessary visits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fixed intervals only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Usage hours and load | running hours and load profile | Wear exposure | From telemetry |   |   |   |
| Condition indicators | trends in key health measures | Need for service | Per product |   |   |   |
| Service history | last service and parts replaced | Reset | From service records |   |   |   |
| Parts availability by region | depot stock | Feasibility | From the supply system |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Trigger | Condition and usage based service | Fixed intervals | Fixed intervals waste visits and miss early wear |
| Bundle | Parts and skills planned with the visit | The visit only | A visit without the part needs a second visit |
| Consent | Customer-approved data use | Silent collection | Consent is a legal and trust requirement |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer name | irrelevant and private |
| Product serial | an identifier |
| Region name alone | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Usage hours and load inputs | Plant operations | MES (manufacturing execution system) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from telemetry. |
| Condition indicators inputs | Quality engineering | ERP and production planning | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: per product. |
| Service history inputs | Reliability and maintenance | CMMS or EAM maintenance system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from service records. |
| Parts availability by region inputs | Plant operations | MES (manufacturing execution system) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the supply system. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: connected_product_service_scheduling_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: usage_hours_and_load, type: double, nullable: false }
    - { name: condition_indicators, type: double, nullable: false }
    - { name: service_history, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Usage hours and load and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Condition indicators against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Usage hours and load, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE connected_product_service_forecasts (
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
CREATE TABLE connected_product_service_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE connected_product_service_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Connected Product Service Scheduling": Schedule service visits and parts for connected industrial products from usage and condition data so customers have fewer breakdowns and fewer unnecessary visits. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Planning and scheduling are constraint problems | Production plans must respect machine capabilities, changeover times, material availability, labour and due dates. Small disruptions force a re-plan. | A forecast alone is not a plan, so models need to feed an optimiser that respects the constraints. |
| Failures are rare and degrade before they happen | Machines usually show vibration, temperature, current or pressure drift before they fail, but failures are rare and maintenance often replaces parts early, which hides the failure labels. | Training on few failures without care produces models that alarm constantly or never. |
| Process parameters interact | Temperature, pressure, speed and material properties interact to determine quality, and the best set-point changes with batch and equipment condition. Experiments on a live line are expensive. | Models should recommend set-points inside validated operating windows and let engineers approve changes. |
| Seasonality, trend and calendar effects | Most business series repeat daily, weekly and annually, with holidays, promotions and outages on top. Models must separate these from real change, and know which calendar effects are known in advance. | Ignoring seasonality makes a normal Monday look like an incident and hides slow-moving real changes. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Usage hours and load | Running hours and load profile. Wear exposure. | Leakage risk to design against: From telemetry. |
| A signal-versus-noise trap in this use case: Trigger | The true signal is condition and usage based service; the common noise is fixed intervals. | Fixed intervals waste visits and miss early wear. |

**Ask the experts**

- [ ] What exactly does "Customer contract and consent respected" mean in practice for connected product service scheduling: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Usage hours and load" and "Condition indicators", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Unplanned breakdowns" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: fixed intervals only, and who can confirm the cut-off times and splits?
- [ ] How often does "Connectivity gaps" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Predictive maintenance | Servicing equipment based on predicted condition instead of a fixed schedule. |
| Bill of materials | The list of parts and materials needed to make a product. |
| OPC UA | A standard protocol for exchanging industrial data. |
| Historian | A database for time-stamped sensor data from plants. |
| Changeover | The time to switch a machine from one product to another. |
| RUL | Remaining useful life: the time before a component should be replaced. |
| APS | Advanced planning and scheduling software. |
| FMEA | Failure mode and effects analysis: a structured review of how a design or process can fail. |
| Downtime | Time when a machine is not producing. |
| State-space / Kalman filter | A model that tracks a hidden state through noisy observations and updates it over time. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Stationarity | A series whose statistical properties do not change over time. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Platt scaling | Calibrating scores with a logistic curve. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
