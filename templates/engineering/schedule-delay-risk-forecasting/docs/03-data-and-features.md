# Schedule Delay Risk Forecasting: data and feature specification

> Generated from the blueprint `engineering/schedule-delay-risk-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Schedule Delay Risk Forecasting · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Schedule Delay Risk Forecasting": Forecast project completion dates as ranges from progress, float and risk drivers and name the activities most likely to cause delay, for project managers to act on. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Planned dates as forecasts.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Progress and float | completion and slack | Core | From the schedule |   |   |   |
| Duration performance | actual versus planned durations | Core | From updates |   |   |   |
| Weather and site constraints | days lost to weather | Risk | From weather data |   |   |   |
| Supplier and permit status | deliveries and approvals | Risk | From project records |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Method | Monte Carlo schedule risk with learned durations | Planned dates | Plans are optimistic |
| Label | Actual activity durations and delays | Reported percent complete | Percent complete is optimistic |
| Use | Early warning and recovery planning | A commitment | Forecasts are not promises |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Planner name | personal data |
| Activity description wording | weak link |
| Report date | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Progress and float inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the schedule. |
| Duration performance inputs | Project delivery | Project scheduling and cost control platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from updates. |
| Weather and site constraints inputs | Health, safety and quality | Quality, safety and inspection records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from weather data. |
| Supplier and permit status inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from project records. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: schedule_delay_risk_forecasting_inputs.v1
owner: engineering-management@example.com
system_of_record: CAD, BIM and document management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: progress_and_float, type: double, nullable: false }
    - { name: duration_performance, type: double, nullable: false }
    - { name: weather_and_site_constraints, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Progress and float and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Duration performance against CAD, BIM and document management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Progress and float, traces back to CAD, BIM and document management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| GH Archive | https://www.gharchive.org/ | Public event data (see the site) | Hourly public GitHub events: pushes, pull requests, issues and reviews | Public repositories only; bot noise. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE schedule_delay_risk_forecasts (
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
CREATE TABLE schedule_delay_risk_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE schedule_delay_risk_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Engineering and construction deliver one-off projects with long lead times, many parties and high consequences of error. Data lives in drawings, models, schedules and site records of uneven quality, and licensed engineers carry professional liability, so tools assist and verify and people sign. For this use case, "Schedule Delay Risk Forecasting": Forecast project completion dates as ranges from progress, float and risk drivers and name the activities most likely to cause delay, for project managers to act on. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Schedules slip for reasons that can be seen early | Delay comes from late design, supply, weather, access and productivity. Progress reports are often optimistic, so forecasts should use durations, float and risk drivers. | A single completion date presented as certain misleads decisions. |
| Contracts allocate risk | Contract terms decide who pays for delay, change and defects, and disputes depend on records kept at the time. Contemporaneous, linked records are the evidence. | Missing records weaken a claim long after the work is done. |
| Professional engineers are accountable for the design | Codes and law require a licensed engineer to design, check and seal critical work. Software supports calculations and checks, and responsibility cannot be handed to a tool. | Any AI output used in design needs independent verification and a named signer. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Progress and float | Completion and slack. Core. | Leakage risk to design against: From the schedule. |
| A signal-versus-noise trap in this use case: Method | The true signal is monte Carlo schedule risk with learned durations; the common noise is planned dates. | Plans are optimistic. |

**Ask the experts**

- [ ] What exactly does "Forecast shown as a range with probabilities" mean in practice for schedule delay risk forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Progress and float" and "Duration performance", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Late completion" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: planned dates as forecasts, and who can confirm the cut-off times and splits?
- [ ] How often does "Re-baselined schedule" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Critical path | The chain of activities that sets the project end date. |
| Float | The time an activity can slip without delaying the project. |
| Baseline schedule | The approved plan against which progress is measured. |
| Health and safety plan | A plan for managing risk on a project. |
| Earned value | A method that compares work done with plan and cost. |
| Contingency | An allowance for uncertain costs. |
| Delay analysis | Methods to find the causes and effects of delay. |
| Finite element analysis | A numerical method for stress and heat analysis. |
| Surrogate model | A fast model trained to approximate a simulation. |
| Lessons learned | Knowledge captured from past projects. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Exogenous variable | An input from outside the series, such as price or weather, used to explain it. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Champion / challenger | The model in production and a candidate that must beat it before promotion. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Forecast horizon | How many steps ahead a forecast looks. |
