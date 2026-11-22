# Healthcare Workforce Absence & Sick Leave Forecasting: data and feature specification

> Generated from the blueprint `healthcare/healthcare-workforce-absence-sick-leave-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Workforce Absence & Sick Leave Forecasting · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Workforce Absence & Sick Leave Forecasting": Forecast aggregate absence levels by role, unit, location and shift so leaders can size contingency staffing, using aggregate data only and never inferring any individual's health. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training with individual reasons.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Weekday and season profile | day-of-week and week-of-year effects per unit | Absence is highly regular | Fit on past periods only |   |   |   |
| Recent absence trend | trailing 7 and 28 day aggregate absence rate | Absence clusters in time | Aggregate and lag |   |   |   |
| Shift-pattern load | share of night and long shifts in the unit | Patterns relate to absence | Use the roster snapshot |   |   |   |
| Holiday proximity | days to and from public holidays | Holiday bridging changes absence | Public calendar only |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Aggregation | Counts per unit-shift-role with minimum size | Individual absence histories | Individual histories are sensitive and unnecessary |
| Seasonality | Weekly, annual and holiday patterns learned explicitly | A flat average | Absence rises on Mondays and in winter |
| Reasons | No reason codes used | Absence reason as a feature | Reasons are health data and add no planning value |
| Intervals | Calibrated intervals feeding contingency sizing | Point forecast only | Contingency needs the tail not the mean |
| Externalities | Aggregate community illness signals where lawful | Individual diagnoses | Population signals are sufficient and privacy-safe |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Individual health or leave reasons | sensitive data |
| Past absence counts per person | privacy risk and stigma |
| Manager identity | not a stable driver |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Weekday and season profile inputs | Workforce planning | HR information system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: fit on past periods only. |
| Recent absence trend inputs | HR analytics | Timekeeping and leave records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: aggregate and lag. |
| Shift-pattern load inputs | Privacy office | Workforce management and scheduling system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the roster snapshot. |
| Holiday proximity inputs | Workforce planning | HR information system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: public calendar only. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_workforce_absence_sick_leave_inputs.v1
owner: workforce-planning@example.com
system_of_record: HR information system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: weekday_and_season_profile, type: double, nullable: false }
    - { name: recent_absence_trend, type: double, nullable: false }
    - { name: shift_pattern_load, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Weekday and season profile and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Recent absence trend against HR information system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Weekday and season profile, traces back to HR information system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Rossmann Store Sales | https://www.kaggle.com/c/rossmann-store-sales | Competition rules; free Kaggle login | Daily sales for 1,115 drugstores with promotion, holiday and competitor features | Store-level totals, not SKU level. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE healthcare_workforce_absence_forecasts (
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
CREATE TABLE healthcare_workforce_absence_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE healthcare_workforce_absence_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Workforce Absence & Sick Leave Forecasting": Forecast aggregate absence levels by role, unit, location and shift so leaders can size contingency staffing, using aggregate data only and never inferring any individual's health. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Definitions: Sepsis-3, SIRS and qSOFA | Sepsis-3 defines sepsis as suspected infection plus an acute rise of 2 or more points in the SOFA organ-failure score, and septic shock as sepsis that needs vasopressors to keep blood pressure up and has lactate above 2 mmol/L despite fluids. Older screening tools are still used: SIRS (two of abnormal temperature, heart rate, breathing rate or white cell count) and qSOFA (fast breathing, low systolic pressure, altered mentation). | Which definition you label with changes prevalence, onset time and what the model learns, so pick it with clinicians and write it down. |
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Seasonality, trend and calendar effects | Most business series repeat daily, weekly and annually, with holidays, promotions and outages on top. Models must separate these from real change, and know which calendar effects are known in advance. | Ignoring seasonality makes a normal Monday look like an incident and hides slow-moving real changes. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Weekday and season profile | Day-of-week and week-of-year effects per unit. Absence is highly regular. | Leakage risk to design against: Fit on past periods only. |
| A signal-versus-noise trap in this use case: Aggregation | The true signal is counts per unit-shift-role with minimum size; the common noise is individual absence histories. | Individual histories are sensitive and unnecessary. |

**Ask the experts**

- [ ] What exactly does "Forecasts 30K unit-shift-role series nightly of absence counts and rates" mean in practice for healthcare workforce absence & sick leave forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Weekday and season profile" and "Recent absence trend", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Contingency cover available when needed" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training with individual reasons, and who can confirm the cut-off times and splits?
- [ ] How often does "Small unit with sparse counts" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| eGFR | Estimated glomerular filtration rate: a kidney function measure that falls as chronic kidney disease progresses. |
| Chronic kidney disease (CKD) | Long-term loss of kidney function, tracked in stages by eGFR. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| HCC | Hierarchical condition category: a risk-adjustment grouping of diagnoses that determines payments. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Federated learning | Training a shared model across institutions without moving their data. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Single-cell RNA sequencing | A technique that measures gene activity in individual cells, used to identify cell types. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Forecast horizon | How many steps ahead a forecast looks. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
