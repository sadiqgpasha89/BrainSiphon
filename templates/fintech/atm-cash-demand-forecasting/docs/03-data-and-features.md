# ATM Cash Demand Forecasting & Replenishment: data and feature specification

> Generated from the blueprint `fintech/atm-cash-demand-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** ATM Cash Demand Forecasting & Replenishment · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "ATM Cash Demand Forecasting & Replenishment": Forecast per-ATM cash demand to cut cash-out incidents while reducing idle cash and cash-in-transit visits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating censored days as true demand.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Payday proximity | days to local salary dates | Withdrawal surge | Region-specific calendars |   |   |   |
| Location type | branch, mall, transit, rural cluster | Demand profile | Cluster by behaviour not label |   |   |   |
| Recent cash-out censoring flag | hours out of cash in prior weeks | Demand correction | Use for de-censoring only |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Asymmetry | Newsvendor-style asymmetric cost with quantile forecasts | Symmetric MSE | Running out costs far more than holding extra cash |
| Censoring | Estimate true demand when ATM was empty | Using dispensed cash as demand | Cash-outs censor demand and bias forecasts down |

## Features to drop

| Feature | Why it is noise |
|---|---|
| ATM serial number | arbitrary |
| Weather daily noise | marginal after calendar |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Payday proximity inputs | Payments engineering | Core banking ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: region-specific calendars. |
| Location type inputs | Risk analytics | Card management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: cluster by behaviour not label. |
| Recent cash-out censoring flag inputs | Customer data office | Customer identity and KYC (CIAM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use for de-censoring only. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: atm_cash_demand_forecasting_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: payday_proximity, type: double, nullable: false }
    - { name: location_type, type: double, nullable: false }
    - { name: recent_cash_out_censoring_flag, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Payday proximity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Location type against Core banking ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Payday proximity, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Corporacion Favorita Grocery Sales Forecasting | https://www.kaggle.com/c/favorita-grocery-sales-forecasting | Competition rules; free Kaggle login | Daily sales for thousands of items across 54 stores with promotions, holidays and oil prices | Real stock-outs are unlabelled. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE atm_cash_demand_forecasting_forecasts (
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
CREATE TABLE atm_cash_demand_forecasting_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE atm_cash_demand_forecasting_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "ATM Cash Demand Forecasting & Replenishment": Forecast per-ATM cash demand to cut cash-out incidents while reducing idle cash and cash-in-transit visits. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| The cost asymmetry and the operating point | A missed fraud costs the transaction amount plus fees and handling. A false decline costs the margin, a frustrated customer and sometimes the customer. The business chooses a point on the trade-off, expressed as fraud basis points (fraud loss per 10,000 currency units of sales) and a false-decline rate, not as accuracy. | Metrics like accuracy or ROC-AUC mean nothing at a 0.4% fraud rate. Everything is evaluated at the fixed false-positive rate the business agrees in M0. |
| Chargebacks, reason codes and label delay | A cardholder disputes a transaction with their bank, which can reverse it through the card network (a chargeback) weeks or months later. The network's reason codes say why, and only some codes mean fraud. Fraud that nobody notices is never labelled, and fraud that customers notice quickly is over-represented in recent data. | Labels are late and biased. Train only on matured labels and keep a maturity gap before the test period, or you teach the model that recent fraud is genuine. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Payday proximity | Days to local salary dates. Withdrawal surge. | Leakage risk to design against: Region-specific calendars. |
| A signal-versus-noise trap in this use case: Asymmetry | The true signal is newsvendor-style asymmetric cost with quantile forecasts; the common noise is symmetric MSE. | Running out costs far more than holding extra cash. |

**Ask the experts**

- [ ] What exactly does "Replenishment cost per visit" mean in practice for atm cash demand forecasting & replenishment: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Payday proximity" and "Location type", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Cash-out incidents" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: treating censored days as true demand, and who can confirm the cut-off times and splits?
- [ ] How often does "Local event (festival) drives demand" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Cash-flow forecast | A projection of money coming in and going out over time, used for liquidity and lending decisions. |
| Volatility | How much an asset's returns vary, usually the standard deviation of returns. |
| Interchange | The fee that a merchant's bank pays the card issuer on each card transaction. |
| Payment routing | Choosing which processor or acquirer sends a transaction, to maximise approval and minimise cost. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Intermittent demand | A series with many zeros and occasional spikes, such as slow-moving items. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Brier score | The mean squared difference between predicted probability and the 0/1 outcome. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
