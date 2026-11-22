# Healthcare Overtime & Premium Pay Prediction: data and feature specification

> Generated from the blueprint `healthcare/healthcare-overtime-premium-pay-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Overtime & Premium Pay Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Overtime & Premium Pay Prediction": Forecast overtime, agency, premium and incentive labour hours and cost by facility, unit, role and pay period, and name the feasible lower-cost actions that respect labour agreements. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using scheduled hours as the target.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Vacancy hours | open budgeted hours per cost centre and role | The core structural cause of premium labour | Use the vacancy snapshot at forecast time |   |   |   |
| Absence and call-in rate | trailing aggregate sick and unplanned absence by unit-shift | Late absences create the most expensive hours | Aggregate only and no individual health data |   |   |   |
| Census-driven demand gap | forecast demand minus rostered hours | Premium hours fill the gap that rosters leave | Use the forecast snapshot at the time of the scheduling decision |   |   |   |
| Pay-period position | days remaining and hours banked towards threshold | Weekly and bi-weekly thresholds shape when overtime appears | Use payroll calendars as published |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Definition | Pay-code definitions from payroll applied exactly | An analyst-defined overtime flag | Finance and operations then argue about what the number means |
| Scheduled vs realised | Realised hours from timekeeping after approvals | Scheduled hours as the target | Schedules omit call-ins and extended shifts |
| Drivers | Vacancy, absence and census drivers that move premium hours | Pay period totals extrapolated | The forecast misses the cause and the cure |
| Scenarios | What-if cost of filling a vacancy by incentive, float or agency | A single point estimate | The manager cannot choose a lower-cost lever |
| Labour rules | Agreement rules checked before any recommendation | Cost minimisation without rules | A cheap suggestion can breach an agreement |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Employee tenure and age | privacy risk and a route to unfair targeting |
| Single-period spikes from payroll corrections | retroactive pay adjustments distort the series |
| Cost centre rename | breaks series continuity not behaviour |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Vacancy hours inputs | Finance workforce analytics | Timekeeping and payroll system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the vacancy snapshot at forecast time. |
| Absence and call-in rate inputs | Payroll | Workforce management and scheduling system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: aggregate only and no individual health data. |
| Census-driven demand gap inputs | Labour relations | Labour-agreement and pay-rule register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the forecast snapshot at the time of the scheduling decision. |
| Pay-period position inputs | Nursing operations | Agency contract register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use payroll calendars as published. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_overtime_premium_pay_inputs.v1
owner: finance-workforce-analytics@example.com
system_of_record: Timekeeping and payroll system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: vacancy_hours, type: double, nullable: false }
    - { name: absence_and_call_in_rate, type: double, nullable: false }
    - { name: census_driven_demand_gap, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Vacancy hours and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Absence and call-in rate against Timekeeping and payroll system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Vacancy hours, traces back to Timekeeping and payroll system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Rossmann Store Sales | https://www.kaggle.com/c/rossmann-store-sales | Competition rules; free Kaggle login | Daily sales for 1,115 drugstores with promotion, holiday and competitor features | Store-level totals, not SKU level. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE healthcare_overtime_premium_forecasts (
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
CREATE TABLE healthcare_overtime_premium_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE healthcare_overtime_premium_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Overtime & Premium Pay Prediction": Forecast overtime, agency, premium and incentive labour hours and cost by facility, unit, role and pay period, and name the feasible lower-cost actions that respect labour agreements. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Definitions: Sepsis-3, SIRS and qSOFA | Sepsis-3 defines sepsis as suspected infection plus an acute rise of 2 or more points in the SOFA organ-failure score, and septic shock as sepsis that needs vasopressors to keep blood pressure up and has lactate above 2 mmol/L despite fluids. Older screening tools are still used: SIRS (two of abnormal temperature, heart rate, breathing rate or white cell count) and qSOFA (fast breathing, low systolic pressure, altered mentation). | Which definition you label with changes prevalence, onset time and what the model learns, so pick it with clinicians and write it down. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Vacancy hours | Open budgeted hours per cost centre and role. The core structural cause of premium labour. | Leakage risk to design against: Use the vacancy snapshot at forecast time. |
| A signal-versus-noise trap in this use case: Definition | The true signal is pay-code definitions from payroll applied exactly; the common noise is an analyst-defined overtime flag. | Finance and operations then argue about what the number means. |

**Ask the experts**

- [ ] What exactly does "Forecasts 60K cost-centre and role series nightly by pay period" mean in practice for healthcare overtime & premium pay prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Vacancy hours" and "Absence and call-in rate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Premium hours as a share of worked hours" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using scheduled hours as the target, and who can confirm the cut-off times and splits?
- [ ] How often does "Retroactive pay adjustment" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Federated learning | Training a shared model across institutions without moving their data. |
| OR block time | Reserved operating room time given to surgeons or services. |
| eGFR | Estimated glomerular filtration rate: a kidney function measure that falls as chronic kidney disease progresses. |
| Chronic kidney disease (CKD) | Long-term loss of kidney function, tracked in stages by eGFR. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Forecast horizon | How many steps ahead a forecast looks. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Distribution shift | A change in the data a model sees compared with training. |
| p99 latency | The time within which 99% of requests complete. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
