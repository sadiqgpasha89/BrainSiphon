# Market Regime Detection: data and feature specification

> Generated from the blueprint `fintech/market-regime-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Market Regime Detection · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Market Regime Detection": Identify volatility and correlation regimes early so risk limits and strategy weights adapt before drawdowns compound. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using smoothed state probabilities in backtests.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Realised vs implied vol spread | 20d realised vol minus implied vol | Stress onset signal | Align timestamps across sources |   |   |   |
| Cross-asset correlation spike | rolling average pairwise correlation | Diversification failure | Window excludes decision day close |   |   |   |
| Credit spread momentum | 5-day change in IG-HY spread | Risk-off indicator | Use as-published spreads |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Persistence | Regime-switching models with sticky transition priors | Thresholds on VIX | Single-indicator thresholds whipsaw at boundaries |
| Lag | Posterior regime probabilities used probabilistically | Hard labels from smoothed fits | Smoothed regimes use future data and cannot be traded |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Calendar month | spurious seasonality |
| Single-day return extremes | outliers without persistence |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Realised vs implied vol spread inputs | Payments engineering | Core banking ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: align timestamps across sources. |
| Cross-asset correlation spike inputs | Risk analytics | Card management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: window excludes decision day close. |
| Credit spread momentum inputs | Customer data office | Customer identity and KYC (CIAM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use as-published spreads. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: market_regime_detection_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: realised_vs_implied_vol_spread, type: double, nullable: false }
    - { name: cross_asset_correlation_spike, type: double, nullable: false }
    - { name: credit_spread_momentum, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Realised vs implied vol spread and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Cross-asset correlation spike against Core banking ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Realised vs implied vol spread, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCR Time Series Archive | https://www.cs.ucr.edu/~eamonn/time_series_data_2018/ | Research use with citation (see the page) | 128 labelled time-series classification datasets | Short curated series. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE market_regime_detection_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE market_regime_detection_outputs (
  run_id TEXT NOT NULL REFERENCES market_regime_detection_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE market_regime_detection_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE market_regime_detection_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. For this use case, "Market Regime Detection": Identify volatility and correlation regimes early so risk limits and strategy weights adapt before drawdowns compound. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Markets, execution and backtesting | Trading models forecast returns, volatility or the cost of trading. Orders move prices (market impact), the gap between expected and achieved price is slippage, and a strategy's apparent performance in history is easily inflated by look-ahead bias, survivorship bias and trying many variants (overfitting the backtest). | Evaluation must respect time, include transaction costs and treat any number from a backtest as an upper bound. |
| Credit risk: the loan lifecycle and what a default is | A lender decides whether to approve an application (underwriting), sets a price and limit, then watches the account: it may stay current, fall behind (delinquency counted in days past due) and eventually be written off (charge-off). Default is defined by a rule, usually 90 days past due or a bankruptcy event, and the definition changes what the model learns. | The label depends on the default definition and the observation window; two teams can build opposite models from the same data without agreeing on it. |
| Selection bias in lending data | You only observe repayment for applicants you approved. Rejected applicants have no outcome, so models trained on approved customers can be wrong for the people they would reject. Techniques such as reject inference and random approval experiments try to correct it. | A scorecard that looks accurate on past approvals can fail on the new applicants a policy change lets in. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Realised vs implied vol spread | 20d realised vol minus implied vol. Stress onset signal. | Leakage risk to design against: Align timestamps across sources. |
| A signal-versus-noise trap in this use case: Persistence | The true signal is regime-switching models with sticky transition priors; the common noise is thresholds on VIX. | Single-indicator thresholds whipsaw at boundaries. |

**Ask the experts**

- [ ] What exactly does "Decision lag under 1 day" mean in practice for market regime detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Realised vs implied vol spread" and "Cross-asset correlation spike", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Drawdown reduction vs static" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using smoothed state probabilities in backtests, and who can confirm the cut-off times and splits?
- [ ] How often does "Flash crash day" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Market regime | A period with distinct statistical behaviour, such as calm, trending or crisis conditions. |
| Fair lending | Laws that prohibit credit decisions that discriminate on protected characteristics, directly or through proxies. |
| Credit limit | The maximum balance a customer may carry on a revolving account. |
| Limit order book | The list of buy and sell orders at each price for a security, which defines the market's liquidity. |
| Bid-ask spread | The difference between the highest price buyers offer and the lowest price sellers ask; a cost of trading. |
| Market making | Quoting both buy and sell prices continuously to earn the spread while managing inventory risk. |
| Inventory risk | The risk a market maker carries from holding a position whose price may move against it. |
| Look-ahead bias | Using information in a backtest that would not have been available at decision time. |
| Survivorship bias | Testing only on assets that still exist today, which hides those that failed. |
| Spoofing | Placing orders with no intention to execute them to mislead other traders, a form of market abuse. |
| Hidden Markov model | A model in which a hidden state switches over time and generates the observations. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
