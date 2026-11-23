# Water Main Break Prediction: data and feature specification

> Generated from the blueprint `public-sector/water-main-break-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Water Main Break Prediction · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Water Main Break Prediction": Predict which pipes are likely to break so renewal and pressure management target the pipes with the highest risk and consequence. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Age-only replacement.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Pipe material and age | material, diameter and install year | Baseline hazard | From the register |   |   |   |
| Break history | past breaks on the pipe and neighbours | Strong predictor | From records |   |   |   |
| Soil and traffic load | corrosive soil and road loading | Stress | From geospatial data |   |   |   |
| Pressure and transients | pressure range and surges | Stress | From sensors |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Recorded breaks with cause | Complaints | Complaints do not locate breaks |
| Censoring | Pipes that have not failed are censored | Failed pipes only | Training on failures alone overstates risk |
| Action | A renewal and pressure plan | A risk map | Utilities act on lists and budgets |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Pipe id | an identifier |
| Contractor name | irrelevant |
| Map layer | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Pipe material and age inputs | Digital service delivery | Case management and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the register. |
| Break history inputs | Programme and policy owners | Tax, benefits and licensing systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from records. |
| Soil and traffic load inputs | City operations | GIS and asset management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from geospatial data. |
| Pressure and transients inputs | Digital service delivery | Case management and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from sensors. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: water_main_break_prediction_inputs.v1
owner: digital-service-delivery@example.com
system_of_record: Case management and CRM
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: pipe_material_and_age, type: double, nullable: false }
    - { name: break_history, type: double, nullable: false }
    - { name: soil_and_traffic_load, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Pipe material and age and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Break history against Case management and CRM
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Pipe material and age, traces back to Case management and CRM; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EPSS data and statistics | https://www.first.org/epss/ | Free to use with attribution (see the page) | Daily exploit prediction scores for all CVEs with historical data | Predicts exploitation probability, which you may want to improve on. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE water_main_break_prediction_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE water_main_break_prediction_outputs (
  run_id TEXT NOT NULL REFERENCES water_main_break_prediction_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE water_main_break_prediction_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE water_main_break_prediction_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Public sector and smart city systems decide on people's entitlements, services and shared infrastructure, so every decision must be lawful, explainable and open to appeal. Data is spread across agencies, equity matters as much as efficiency, and caseworkers and officials remain accountable for decisions about individuals. For this use case, "Water Main Break Prediction": Predict which pipes are likely to break so renewal and pressure management target the pipes with the highest risk and consequence. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Cities run on shared infrastructure data | Traffic, transit, lighting, waste, water and buildings produce sensor and operational data owned by different departments. Value comes from joining them for operations and planning. | Without shared identifiers and governance, every project builds its own isolated pipeline. |
| Decisions about people need a legal basis and an appeal | Benefits, permits, tax and enforcement decisions follow statute and policy, and citizens can challenge them. Automated systems support officials and cannot replace the reasoning a decision must record. | A model that cannot give reasons that match the law cannot be used for the final decision. |
| Planning relies on forecasts with uncertainty | Housing, schools, transport and services are planned from population, demand and land-use forecasts that carry wide uncertainty, so scenarios matter more than single numbers. | A single forecast presented as certain can lock in the wrong capacity. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Pipe material and age | Material, diameter and install year. Baseline hazard. | Leakage risk to design against: From the register. |
| A signal-versus-noise trap in this use case: Label | The true signal is recorded breaks with cause; the common noise is complaints. | Complaints do not locate breaks. |

**Ask the experts**

- [ ] What exactly does "Break probability per pipe for the next year" mean in practice for water main break prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Pipe material and age" and "Break history", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Breaks per 100 km" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: age-only replacement, and who can confirm the cut-off times and splits?
- [ ] How often does "Missing install year" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Case management | Systems for tracking cases through a process. |
| Smart city | A city that uses connected sensors and data to run services. |
| Congestion | Slow traffic caused by too much demand for road space. |
| Asset register | A list of infrastructure assets and their condition. |
| Pothole | A road surface defect that needs repair. |
| Pseudonymisation | Replacing identifiers with codes to reduce identification risk. |
| Policy simulation | Testing how a policy change would affect people and budgets. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Platt scaling | Calibrating scores with a logistic curve. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
