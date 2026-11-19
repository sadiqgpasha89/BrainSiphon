# Mutual Fund Flow Forecasting: data and feature specification

> Generated from the blueprint `bfsi/mutual-fund-flow-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Mutual Fund Flow Forecasting · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Mutual Fund Flow Forecasting": Forecast daily subscriptions and redemptions per fund so portfolio managers hold the right cash and treasury can plan liquidity. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using final data instead of as-known data.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Day-of-month profile | median flow by day type | Seasonality | Calendar shifts |   |   |   |
| Trailing relative performance | 3 and 12 month return versus category | Flow driver | Lagged reporting |   |   |   |
| Market stress indicator | volatility index level | Redemption pressure | Regime changes |   |   |   |
| Distributor activity | orders from the top platforms | Large flows visible early | Data timing |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Net vs gross | Subscriptions and redemptions modelled separately | Net flow only | Offsetting flows hide risk |
| Calendar | Month-end, tax dates and salary cycles | Day of week only | Flows follow investor calendars |
| Performance | Performance relative to peers with a lag | Recent return only | Flows chase past performance |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Fund brand colour | irrelevant |
| Fund manager name | weak |
| Weather | no link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Day-of-month profile inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: calendar shifts. |
| Trailing relative performance inputs | Risk data office | General ledger and risk data warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: lagged reporting. |
| Market stress indicator inputs | Operations | Customer master and KYC repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: regime changes. |
| Distributor activity inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: data timing. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: mutual_fund_flow_forecasting_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: day_of_month_profile, type: double, nullable: false }
    - { name: trailing_relative_performance, type: double, nullable: false }
    - { name: market_stress_indicator, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Day-of-month profile and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Trailing relative performance against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Day-of-month profile, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Rossmann Store Sales | https://www.kaggle.com/c/rossmann-store-sales | Competition rules; free Kaggle login | Daily sales for 1,115 drugstores with promotion, holiday and competitor features | Store-level totals, not SKU level. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE mutual_fund_flow_forecasting_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE mutual_fund_flow_forecasting_outputs (
  run_id TEXT NOT NULL REFERENCES mutual_fund_flow_forecasting_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE mutual_fund_flow_forecasting_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE mutual_fund_flow_forecasting_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Mutual Fund Flow Forecasting": Forecast daily subscriptions and redemptions per fund so portfolio managers hold the right cash and treasury can plan liquidity. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Wealth management, advice and suitability | Advisers recommend products to clients under a duty to act in the client's interest. Suitability requires that a recommendation fits the client's objectives, risk tolerance, knowledge and circumstances, and firms must evidence this and detect mis-selling. | Anything that suggests a product must be filtered by suitability rules, and the adviser, not the model, remains accountable. |
| Treasury, liquidity and interest-rate risk | The treasury funds the bank, keeps enough liquid assets to survive outflows and manages how net interest income reacts to rates. Key ideas are intraday liquidity, deposit run-off, behavioural assumptions for deposits and prepayments, and the liquidity coverage and net stable funding rules. | Forecast errors here are measured in buffers held and funding costs paid, and the tail (a run, a rate shock) matters more than the average. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Seasonality, trend and calendar effects | Most business series repeat daily, weekly and annually, with holidays, promotions and outages on top. Models must separate these from real change, and know which calendar effects are known in advance. | Ignoring seasonality makes a normal Monday look like an incident and hides slow-moving real changes. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Day-of-month profile | Median flow by day type. Seasonality. | Leakage risk to design against: Calendar shifts. |
| A signal-versus-noise trap in this use case: Net vs gross | The true signal is subscriptions and redemptions modelled separately; the common noise is net flow only. | Offsetting flows hide risk. |

**Ask the experts**

- [ ] What exactly does "Forecast by 06:00" mean in practice for mutual fund flow forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Day-of-month profile" and "Trailing relative performance", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Cash drag" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using final data instead of as-known data, and who can confirm the cut-off times and splits?
- [ ] How often does "Large institutional redemption" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| NAV | Net asset value: the value of a fund's assets minus liabilities, divided by units, usually struck daily. |
| LCR | Liquidity coverage ratio: high-quality liquid assets divided by expected 30-day stressed net outflows. |
| Intraday liquidity | The funds a bank needs during the day to make payments before incoming payments arrive. |
| Rebalancing | Trading a portfolio back to its target allocation after market moves. |
| NSFR | Net stable funding ratio: available stable funding relative to required stable funding over a one-year horizon. |
| ALM | Asset-liability management: managing the balance sheet so rate and liquidity risks stay within appetite. |
| Tax lot | A purchase of a security with its own date and cost basis, which determines the tax when sold. |
| Catastrophe model | A simulation of hazard, exposure and vulnerability that estimates insured losses from events such as storms or earthquakes. |
| Longevity risk | The risk that people live longer than assumed, raising the cost of pensions and annuities. |
| Four-eyes principle | A control requiring a second person to approve a sensitive action. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Lag feature | A past value of the series used as a predictor. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Distribution shift | A change in the data a model sees compared with training. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
