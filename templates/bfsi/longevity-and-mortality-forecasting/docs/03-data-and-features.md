# Longevity & Mortality Forecasting: data and feature specification

> Generated from the blueprint `bfsi/longevity-and-mortality-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Longevity & Mortality Forecasting · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Longevity & Mortality Forecasting": Forecast mortality improvement by age and cohort for pension and annuity pricing and reserving. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: A back-test through stable years makes any trend model look accurate.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Age-period-cohort effects | decomposition of log mortality into age, period and cohort terms | Gives the structure for projection | The three effects are not fully identifiable, so impose a documented constraint |   |   |   |
| Population improvement | national mortality improvement rate by age band over the last 10 years | Anchors the projection to a published trend | Revisions change past values |   |   |   |
| Portfolio experience ratio | actual deaths divided by expected deaths for the portfolio | Adjusts the population to the portfolio | Credibility is low for small portfolios, so blend |   |   |   |
| Cause-of-death mix | share of deaths due to cardiovascular disease and cancer by age | Drivers of future improvement | Data lag by one to two years |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Improvement | The trend in mortality improvement by age and cohort | The current level of mortality | Reserves depend on how fast mortality changes in future, not where it is today |
| Shock | One-off shocks such as pandemics treated explicitly | Averaging through the shock years | A shock biases the trend if it is treated as a permanent change or ignored |
| Portfolio | The portfolio's own experience relative to the population | Population mortality only | Annuitants live longer than the general population, so population rates under-price the liability |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Policy ID | An identifier with no relation to mortality |
| Broker | The sales channel does not change mortality once the product is known |
| Month of death | Seasonal noise that does not matter for annual rates |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Age-period-cohort effects inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: the three effects are not fully identifiable, so impose a documented constraint. |
| Population improvement inputs | Risk data office | General ledger and risk data warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: revisions change past values. |
| Portfolio experience ratio inputs | Operations | Customer master and KYC repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: credibility is low for small portfolios, so blend. |
| Cause-of-death mix inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: data lag by one to two years. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: longevity_and_mortality_forecasting_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: age_period_cohort_effects, type: double, nullable: false }
    - { name: population_improvement, type: double, nullable: false }
    - { name: portfolio_experience_ratio, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Age-period-cohort effects and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Population improvement against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Age-period-cohort effects, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Corporacion Favorita Grocery Sales Forecasting | https://www.kaggle.com/c/favorita-grocery-sales-forecasting | Competition rules; free Kaggle login | Daily sales for thousands of items across 54 stores with promotions, holidays and oil prices | Real stock-outs are unlabelled. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Rossmann Store Sales | https://www.kaggle.com/c/rossmann-store-sales | Competition rules; free Kaggle login | Daily sales for 1,115 drugstores with promotion, holiday and competitor features | Store-level totals, not SKU level. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE longevity_and_mortality_forecasts (
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
CREATE TABLE longevity_and_mortality_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE longevity_and_mortality_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Longevity & Mortality Forecasting": Forecast mortality improvement by age and cohort for pension and annuity pricing and reserving. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Insurance: pricing, underwriting, claims and reserving | An insurer collects premiums, underwrites risks, pays claims and holds reserves for claims not yet settled. Underwriting selects and prices risk, claims handling pays and investigates, and actuaries estimate ultimate cost from development triangles using methods such as chain-ladder. | Labels arrive years later for long-tail lines, and the same data feed serves pricing, claims and reserving teams with different definitions. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Capital: risk-weighted assets and the capital ratio | Regulators require banks to hold capital against risk-weighted assets, where each exposure's weight depends on its type, rating and collateral. Reducing RWA by selling, hedging or restructuring frees capital but costs income, so the choice is a trade-off between capital use and return. | Optimisation models must use the regulatory definitions exactly, and a reduction that cannot be executed is not a reduction. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Age-period-cohort effects | Decomposition of log mortality into age, period and cohort terms. Gives the structure for projection. | Leakage risk to design against: The three effects are not fully identifiable, so impose a documented constraint. |
| A signal-versus-noise trap in this use case: Improvement | The true signal is the trend in mortality improvement by age and cohort; the common noise is the current level of mortality. | Reserves depend on how fast mortality changes in future, not where it is today. |

**Ask the experts**

- [ ] What exactly does "Methods and assumptions align with actuarial standards for reserving and pricing" mean in practice for longevity & mortality forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Age-period-cohort effects" and "Population improvement", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Reserve movement from assumptions" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: a back-test through stable years makes any trend model look accurate, and who can confirm the cut-off times and splits?
- [ ] How often does "Pandemic years" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Longevity risk | The risk that people live longer than assumed, raising the cost of pensions and annuities. |
| Chain-ladder | An actuarial method that projects ultimate claims from the development of past claims in a triangle. |
| Loss triangle | A table of claims by accident period and development period, used to estimate unpaid claims. |
| IBNR | Incurred but not reported: claims that have happened but have not yet been reported or fully known. |
| Model tier | A classification of a model by its materiality, which sets how deeply it is validated. |
| Forecast horizon | How many steps ahead a forecast looks. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
