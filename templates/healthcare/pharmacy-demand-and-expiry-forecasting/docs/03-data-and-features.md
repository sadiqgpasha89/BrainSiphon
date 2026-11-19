# Pharmacy Demand & Expiry Forecasting: data and feature specification

> Generated from the blueprint `healthcare/pharmacy-demand-and-expiry-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Pharmacy Demand & Expiry Forecasting · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Pharmacy Demand & Expiry Forecasting": Forecast drug demand and manage expiry across pharmacy locations to balance availability and waste, including cold-chain items. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Backtests ignoring shortage events.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Prescription trend signals | new prescriptions and refills | Demand | Rx data lag |   |   |   |
| Shortage and recall alerts | supplier shortage feed | Substitution | Feed latency |   |   |   |
| Days-to-expiry distribution | stock by expiry bucket | Waste risk | Batch tracking |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Substitution | Generic and therapeutic substitution modelled | Per-NDC independent forecasts | Shortages shift demand between equivalents |
| Age | Stock by expiry date in the state | Total inventory | Short-dated stock must move first |

## Features to drop

| Feature | Why it is noise |
|---|---|
| NDC code digits | identifier |
| Pharmacy name | encoded |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Prescription trend signals inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: rx data lag. |
| Shortage and recall alerts inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: feed latency. |
| Days-to-expiry distribution inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: batch tracking. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: pharmacy_demand_and_expiry_forecasting_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: prescription_trend_signals, type: double, nullable: false }
    - { name: shortage_and_recall_alerts, type: double, nullable: false }
    - { name: days_to_expiry_distribution, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Prescription trend signals and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Shortage and recall alerts against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Prescription trend signals, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Rossmann Store Sales | https://www.kaggle.com/c/rossmann-store-sales | Competition rules; free Kaggle login | Daily sales for 1,115 drugstores with promotion, holiday and competitor features | Store-level totals, not SKU level. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE pharmacy_demand_and_expiry_forecasts (
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
CREATE TABLE pharmacy_demand_and_expiry_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE pharmacy_demand_and_expiry_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Pharmacy Demand & Expiry Forecasting": Forecast drug demand and manage expiry across pharmacy locations to balance availability and waste, including cold-chain items. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Prescription trend signals | New prescriptions and refills. Demand. | Leakage risk to design against: Rx data lag. |
| A signal-versus-noise trap in this use case: Substitution | The true signal is generic and therapeutic substitution modelled; the common noise is per-NDC independent forecasts. | Shortages shift demand between equivalents. |

**Ask the experts**

- [ ] What exactly does "Controlled substances rules" mean in practice for pharmacy demand & expiry forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Prescription trend signals" and "Shortage and recall alerts", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Out-of-stock rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: backtests ignoring shortage events, and who can confirm the cut-off times and splits?
- [ ] How often does "Drug shortage announced" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| eGFR | Estimated glomerular filtration rate: a kidney function measure that falls as chronic kidney disease progresses. |
| Chronic kidney disease (CKD) | Long-term loss of kidney function, tracked in stages by eGFR. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| ADMET | Absorption, distribution, metabolism, excretion and toxicity: properties that decide whether a molecule can be a drug. |
| Docking | Simulating how a molecule fits into a protein's binding site to estimate binding strength. |
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Intermittent demand | A series with many zeros and occasional spikes, such as slow-moving items. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Distribution shift | A change in the data a model sees compared with training. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
