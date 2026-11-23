# Cost Overrun Prediction: data and feature specification

> Generated from the blueprint `engineering/cost-overrun-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cost Overrun Prediction · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Cost Overrun Prediction": Predict final project cost and the likelihood of overrun from commitments, progress and change orders, naming drivers so cost managers can act early. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Linear extrapolation.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Earned value indicators | cost and schedule performance indices | Core | From cost control |   |   |   |
| Committed cost and change orders | commitments and approved changes | Core | From the ledger |   |   |   |
| Productivity rates | actual versus planned | Driver | From site data |   |   |   |
| Market price indices | material and labour inflation | Driver | From indices |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Final cost compared with the approved budget | Mid-project forecasts | Forecasts can be wrong |
| Level | Project and cost code | Individual manager comparison | Individual rankings distort reporting |
| Method | Earned value with learned adjustments | Linear extrapolation | Cost rarely grows linearly |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Manager name | personal data |
| Invoice number | an identifier |
| Report layout | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Earned value indicators inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from cost control. |
| Committed cost and change orders inputs | Project delivery | Project scheduling and cost control platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the ledger. |
| Productivity rates inputs | Health, safety and quality | Quality, safety and inspection records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from site data. |
| Market price indices inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from indices. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: cost_overrun_prediction_inputs.v1
owner: engineering-management@example.com
system_of_record: CAD, BIM and document management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: earned_value_indicators, type: double, nullable: false }
    - { name: committed_cost_and_change_orders, type: double, nullable: false }
    - { name: productivity_rates, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Earned value indicators and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Committed cost and change orders against CAD, BIM and document management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Earned value indicators, traces back to CAD, BIM and document management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| GH Archive | https://www.gharchive.org/ | Public event data (see the site) | Hourly public GitHub events: pushes, pull requests, issues and reviews | Public repositories only; bot noise. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EPSS data and statistics | https://www.first.org/epss/ | Free to use with attribution (see the page) | Daily exploit prediction scores for all CVEs with historical data | Predicts exploitation probability, which you may want to improve on. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE cost_overrun_prediction_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE cost_overrun_prediction_outputs (
  run_id TEXT NOT NULL REFERENCES cost_overrun_prediction_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE cost_overrun_prediction_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE cost_overrun_prediction_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Engineering and construction deliver one-off projects with long lead times, many parties and high consequences of error. Data lives in drawings, models, schedules and site records of uneven quality, and licensed engineers carry professional liability, so tools assist and verify and people sign. For this use case, "Cost Overrun Prediction": Predict final project cost and the likelihood of overrun from commitments, progress and change orders, naming drivers so cost managers can act early. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Cost grows through change | Cost overruns come from scope change, design maturity, market prices and productivity. Early estimates carry wide uncertainty that narrows as design matures. | Reporting a single number at an early stage hides the range. |
| Schedules slip for reasons that can be seen early | Delay comes from late design, supply, weather, access and productivity. Progress reports are often optimistic, so forecasts should use durations, float and risk drivers. | A single completion date presented as certain misleads decisions. |
| Contracts allocate risk | Contract terms decide who pays for delay, change and defects, and disputes depend on records kept at the time. Contemporaneous, linked records are the evidence. | Missing records weaken a claim long after the work is done. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Earned value indicators | Cost and schedule performance indices. Core. | Leakage risk to design against: From cost control. |
| A signal-versus-noise trap in this use case: Label | The true signal is final cost compared with the approved budget; the common noise is mid-project forecasts. | Forecasts can be wrong. |

**Ask the experts**

- [ ] What exactly does "Forecast shown as a range" mean in practice for cost overrun prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Earned value indicators" and "Committed cost and change orders", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Cost overrun rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: linear extrapolation, and who can confirm the cut-off times and splits?
- [ ] How often does "Large claim" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Earned value | A method that compares work done with plan and cost. |
| Estimate | A prediction of project cost. |
| Change order | A formal change to scope, cost or time. |
| Contingency | An allowance for uncertain costs. |
| Claim | A request for extra time or money under a contract. |
| Baseline schedule | The approved plan against which progress is measured. |
| Health and safety plan | A plan for managing risk on a project. |
| IFC | An open file format for exchanging BIM data. |
| Delay analysis | Methods to find the causes and effects of delay. |
| Lessons learned | Knowledge captured from past projects. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Lag feature | A past value of the series used as a predictor. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
