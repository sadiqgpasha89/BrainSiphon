# Batch Cycle-Time Reduction: data and feature specification

> Generated from the blueprint `manufacturing/batch-cycle-time-reduction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Batch Cycle-Time Reduction · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Batch Cycle-Time Reduction": Predict the shortest safe cycle time for each batch from raw material properties and early readings so batch processes finish sooner without hurting quality. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising time without quality.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Early reaction rate indicators | slope of temperature and conversion in the first phase | Predicts duration | Per recipe |   |   |   |
| Raw material assay values | lab properties of the input lot | Variation driver | From QC |   |   |   |
| Equipment condition | fouling and heating capacity | Slows the process | From maintenance data |   |   |   |
| Ambient conditions | temperature and humidity | Minor driver | Condition on season |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Objective | Time saved at constant quality | Time saved | Faster batches that fail are slower overall |
| Signal | Early-stage readings that predict the end state | Final readings | Final readings are too late to act on |
| Control | Matched comparisons across materials | Raw averages | Material lot changes drive cycle time |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Batch number | an identifier |
| Operator name | not a driver |
| Report timestamp | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Early reaction rate indicators inputs | Plant operations | MES (manufacturing execution system) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: per recipe. |
| Raw material assay values inputs | Quality engineering | ERP and production planning | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from QC. |
| Equipment condition inputs | Reliability and maintenance | CMMS or EAM maintenance system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from maintenance data. |
| Ambient conditions inputs | Plant operations | MES (manufacturing execution system) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: condition on season. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: batch_cycle_time_reduction_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: early_reaction_rate_indicators, type: double, nullable: false }
    - { name: raw_material_assay_values, type: double, nullable: false }
    - { name: equipment_condition, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Early reaction rate indicators and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Raw material assay values against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Early reaction rate indicators, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Avazu Click-Through Rate Prediction | https://www.kaggle.com/c/avazu-ctr-prediction | Competition rules; free Kaggle login | About 40 million mobile ad impressions over 10 days with hourly timestamps | No position or dwell time. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| NASA Prognostics Data Repository (C-MAPSS and others) | https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/ | Public NASA data (see the page) | Run-to-failure sensor data for engines and other components | Simulated or lab data; real fleets are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE batch_cycle_time_reduction_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE batch_cycle_time_reduction_outputs (
  run_id TEXT NOT NULL REFERENCES batch_cycle_time_reduction_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE batch_cycle_time_reduction_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE batch_cycle_time_reduction_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Batch Cycle-Time Reduction": Predict the shortest safe cycle time for each batch from raw material properties and early readings so batch processes finish sooner without hurting quality. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Traceability links parts to materials and settings | Lot and serial numbers connect each finished item to its materials, machine, settings and test results, which makes recalls and root cause analysis possible. | Poor traceability turns a small quality problem into a large recall. |
| Process parameters interact | Temperature, pressure, speed and material properties interact to determine quality, and the best set-point changes with batch and equipment condition. Experiments on a live line are expensive. | Models should recommend set-points inside validated operating windows and let engineers approve changes. |
| Planning and scheduling are constraint problems | Production plans must respect machine capabilities, changeover times, material availability, labour and due dates. Small disruptions force a re-plan. | A forecast alone is not a plan, so models need to feed an optimiser that respects the constraints. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Early reaction rate indicators | Slope of temperature and conversion in the first phase. Predicts duration. | Leakage risk to design against: Per recipe. |
| A signal-versus-noise trap in this use case: Objective | The true signal is time saved at constant quality; the common noise is time saved. | Faster batches that fail are slower overall. |

**Ask the experts**

- [ ] What exactly does "Quality limits are not relaxed" mean in practice for batch cycle-time reduction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Early reaction rate indicators" and "Raw material assay values", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Average cycle time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: optimising time without quality, and who can confirm the cut-off times and splits?
- [ ] How often does "New raw material supplier" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Historian | A database for time-stamped sensor data from plants. |
| Cycle time | The time to complete one unit of work at a station. |
| Control chart | A chart of a process measure with limits that show when it is out of control. |
| SPC | Statistical process control: using control charts to detect process drift. |
| Batch | A quantity of product made together under the same conditions. |
| Lot traceability | Tracking which materials and settings went into each lot. |
| Supplier quality | The quality of incoming materials from suppliers. |
| SCADA | Supervisory control and data acquisition: systems that monitor and control industrial processes. |
| Takt time | The pace of production needed to meet demand. |
| Cp and Cpk | Measures of how well a process fits within specification limits. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Huber loss | A regression loss that is gentle on large errors, limiting the effect of outliers. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
