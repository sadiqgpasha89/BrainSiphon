# Alpha Signal Research Pipeline: data and feature specification

> Generated from the blueprint `fintech/algorithmic-trading-signal-research` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Alpha Signal Research Pipeline · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Alpha Signal Research Pipeline": Discover and validate cross-sectional return signals that survive costs and decay, and promote them to production with strict overfitting control. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Look-ahead via restated fundamentals.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Cross-sectional rank momentum | rank of 12-1 month return across the universe | Documented persistent premium | Skip the most recent month to avoid reversal contamination |   |   |   |
| Earnings surprise drift | standardised surprise vs consensus at announcement | Post-announcement drift | Use consensus snapshot before the release |   |   |   |
| Liquidity-adjusted turnover | alpha divided by participation-rate cost estimate | Capacity realism | Volume must be same-period not future |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Overfitting | Purged and embargoed cross-validation with multiple-testing correction | Choosing the best of 500 backtests | The best of many random signals always looks great |
| Costs | Net-of-cost returns with realistic impact | Gross backtest Sharpe | High-turnover signals vanish after costs |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Raw price level | not stationary, no cross-sectional meaning |
| Last-day return | microstructure noise that reverses |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Cross-sectional rank momentum inputs | Payments engineering | Core banking ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: skip the most recent month to avoid reversal contamination. |
| Earnings surprise drift inputs | Risk analytics | Card management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use consensus snapshot before the release. |
| Liquidity-adjusted turnover inputs | Customer data office | Customer identity and KYC (CIAM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: volume must be same-period not future. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: algorithmic_trading_signal_research_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: cross_sectional_rank_momentum, type: double, nullable: false }
    - { name: earnings_surprise_drift, type: double, nullable: false }
    - { name: liquidity_adjusted_turnover, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Cross-sectional rank momentum and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Earnings surprise drift against Core banking ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Cross-sectional rank momentum, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Jane Street Market Prediction | https://www.kaggle.com/c/jane-street-market-prediction | Competition rules; free Kaggle login | Anonymised market features with returns and a trade-or-not decision target | Anonymised and from one firm; check the data terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Statlog German Credit Data (UCI) | https://archive.ics.uci.edu/dataset/144/statlog+german+credit+data | CC BY 4.0 (see the UCI page) | 1,000 credit applicants with a good or bad label and a cost matrix | Tiny and old; useful for fairness and explainability exercises, not scale. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE algorithmic_trading_signal_forecasts (
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
CREATE TABLE algorithmic_trading_signal_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE algorithmic_trading_signal_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. For this use case, "Alpha Signal Research Pipeline": Discover and validate cross-sectional return signals that survive costs and decay, and promote them to production with strict overfitting control. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Markets, execution and backtesting | Trading models forecast returns, volatility or the cost of trading. Orders move prices (market impact), the gap between expected and achieved price is slippage, and a strategy's apparent performance in history is easily inflated by look-ahead bias, survivorship bias and trying many variants (overfitting the backtest). | Evaluation must respect time, include transaction costs and treat any number from a backtest as an upper bound. |
| Credit risk: the loan lifecycle and what a default is | A lender decides whether to approve an application (underwriting), sets a price and limit, then watches the account: it may stay current, fall behind (delinquency counted in days past due) and eventually be written off (charge-off). Default is defined by a rule, usually 90 days past due or a bankruptcy event, and the definition changes what the model learns. | The label depends on the default definition and the observation window; two teams can build opposite models from the same data without agreeing on it. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Cross-sectional rank momentum | Rank of 12-1 month return across the universe. Documented persistent premium. | Leakage risk to design against: Skip the most recent month to avoid reversal contamination. |
| A signal-versus-noise trap in this use case: Overfitting | The true signal is purged and embargoed cross-validation with multiple-testing correction; the common noise is choosing the best of 500 backtests. | The best of many random signals always looks great. |

**Ask the experts**

- [ ] What exactly does "Point-in-time universe including delisted names" mean in practice for alpha signal research pipeline: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Cross-sectional rank momentum" and "Earnings surprise drift", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Live vs backtest slippage gap" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: look-ahead via restated fundamentals, and who can confirm the cut-off times and splits?
- [ ] How often does "Delisting and survivorship" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Sharpe ratio | Excess return per unit of risk; a common but easily inflated measure of strategy quality. |
| Look-ahead bias | Using information in a backtest that would not have been available at decision time. |
| Survivorship bias | Testing only on assets that still exist today, which hides those that failed. |
| Alpha | Return that is not explained by exposure to broad market factors; what a signal is trying to find. |
| Turnover | How much of a portfolio is traded over a period, which drives transaction costs. |
| Limit order book | The list of buy and sell orders at each price for a security, which defines the market's liquidity. |
| Bid-ask spread | The difference between the highest price buyers offer and the lowest price sellers ask; a cost of trading. |
| Slippage | The difference between the price expected when an order is decided and the price actually obtained. |
| Market impact | The adverse price movement caused by one's own trading. |
| VWAP / TWAP | Volume-weighted and time-weighted average price: benchmarks and simple schedules for executing large orders. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Stationarity | A series whose statistical properties do not change over time. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
| Exogenous variable | An input from outside the series, such as price or weather, used to explain it. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
