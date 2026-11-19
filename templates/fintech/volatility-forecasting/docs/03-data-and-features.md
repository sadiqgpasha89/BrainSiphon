# Volatility Forecasting for Risk & Options: data and feature specification

> Generated from the blueprint `fintech/volatility-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Volatility Forecasting for Risk & Options · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Volatility Forecasting for Risk & Options": Forecast 1-day to 3-month volatility per instrument for VaR, margining and options pricing with calibrated coverage. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating against squared returns instead of RV.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Realised variance components | daily, weekly, monthly RV averages | HAR structure | Intraday RV needs clean tick data |   |   |   |
| Jump component | bipower variation difference | Separates jumps from diffusion | Use consistent sampling frequency |   |   |   |
| Implied vol term structure | at-the-money implied vol by tenor | Forward-looking | Use end-of-day mid not stale quotes |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Benchmark | HAR-RV and GARCH baselines as the bar | Complex nets without baseline | Deep nets often fail to beat HAR on realised variance |
| Target | Realised variance from intraday data | Squared daily returns | Squared returns are an extremely noisy volatility proxy |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Raw volume | co-moves with vol without added info |
| Previous-day sign of return | little vol information |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Realised variance components inputs | Payments engineering | Core banking ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: intraday RV needs clean tick data. |
| Jump component inputs | Risk analytics | Card management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use consistent sampling frequency. |
| Implied vol term structure inputs | Customer data office | Customer identity and KYC (CIAM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use end-of-day mid not stale quotes. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: volatility_forecasting_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: realised_variance_components, type: double, nullable: false }
    - { name: jump_component, type: double, nullable: false }
    - { name: implied_vol_term_structure, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Realised variance components and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Jump component against Core banking ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Realised variance components, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Rossmann Store Sales | https://www.kaggle.com/c/rossmann-store-sales | Competition rules; free Kaggle login | Daily sales for 1,115 drugstores with promotion, holiday and competitor features | Store-level totals, not SKU level. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE volatility_forecasting_forecasts (
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
CREATE TABLE volatility_forecasting_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE volatility_forecasting_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. For this use case, "Volatility Forecasting for Risk & Options": Forecast 1-day to 3-month volatility per instrument for VaR, margining and options pricing with calibrated coverage. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Markets, execution and backtesting | Trading models forecast returns, volatility or the cost of trading. Orders move prices (market impact), the gap between expected and achieved price is slippage, and a strategy's apparent performance in history is easily inflated by look-ahead bias, survivorship bias and trying many variants (overfitting the backtest). | Evaluation must respect time, include transaction costs and treat any number from a backtest as an upper bound. |
| Credit risk: the loan lifecycle and what a default is | A lender decides whether to approve an application (underwriting), sets a price and limit, then watches the account: it may stay current, fall behind (delinquency counted in days past due) and eventually be written off (charge-off). Default is defined by a rule, usually 90 days past due or a bankruptcy event, and the definition changes what the model learns. | The label depends on the default definition and the observation window; two teams can build opposite models from the same data without agreeing on it. |
| Seasonality, trend and calendar effects | Most business series repeat daily, weekly and annually, with holidays, promotions and outages on top. Models must separate these from real change, and know which calendar effects are known in advance. | Ignoring seasonality makes a normal Monday look like an incident and hides slow-moving real changes. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Realised variance components | Daily, weekly, monthly RV averages. HAR structure. | Leakage risk to design against: Intraday RV needs clean tick data. |
| A signal-versus-noise trap in this use case: Benchmark | The true signal is hAR-RV and GARCH baselines as the bar; the common noise is complex nets without baseline. | Deep nets often fail to beat HAR on realised variance. |

**Ask the experts**

- [ ] What exactly does "Coverage tests for VaR (Kupiec)" mean in practice for volatility forecasting for risk & options: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Realised variance components" and "Jump component", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Margin efficiency" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating against squared returns instead of RV, and who can confirm the cut-off times and splits?
- [ ] How often does "Bad ticks inflate realised vol" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Volatility | How much an asset's returns vary, usually the standard deviation of returns. |
| Market regime | A period with distinct statistical behaviour, such as calm, trending or crisis conditions. |
| Limit order book | The list of buy and sell orders at each price for a security, which defines the market's liquidity. |
| Bid-ask spread | The difference between the highest price buyers offer and the lowest price sellers ask; a cost of trading. |
| Market making | Quoting both buy and sell prices continuously to earn the spread while managing inventory risk. |
| Inventory risk | The risk a market maker carries from holding a position whose price may move against it. |
| Cash-flow forecast | A projection of money coming in and going out over time, used for liquidity and lending decisions. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
