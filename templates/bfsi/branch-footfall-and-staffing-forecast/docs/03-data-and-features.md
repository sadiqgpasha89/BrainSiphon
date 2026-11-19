# Branch Footfall & Staffing Forecast: data and feature specification

> Generated from the blueprint `bfsi/branch-footfall-and-staffing-forecast` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Branch Footfall & Staffing Forecast · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Branch Footfall & Staffing Forecast": Forecast branch visits by hour so rosters match demand and queues stay short. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Closed days in the history look like zero demand and bias the forecast.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Hourly profile | median visits by hour for each day type, such as normal, pay day or holiday | The core pattern | Closures and refits distort it, so exclude them |   |   |   |
| Pay day effect | days since the last typical pay day | A reliable peak driver | Pay cycles vary by employer in the area |   |   |   |
| Digital trend | monthly change in digital transactions in the catchment | Branch visits decline as customers move online | The trend is slow but real |   |   |   |
| Local events | markets, fairs and sports events within walking distance on the date | Spikes in footfall | The calendar needs a feed |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Hourly | Demand at the hour level | Daily totals | Peaks drive queues, and a day with the right total can still have a lunchtime queue |
| Transaction mix | The visit type, such as cash, advice or loans | The visit count alone | A mortgage advice visit takes an hour and a cash deposit takes two minutes |
| Calendar | Pay days, holidays and local events | Day of week alone | Demand peaks around pay days and holidays that a weekday pattern misses |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Branch name | A label that is not a driver of demand |
| Manager | The branch manager does not change footfall |
| Weather | A small effect once the calendar is known |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Hourly profile inputs | Branch operations analytics | Branch queue-management system (tickets and wait times) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: closures and refits distort it, so exclude them. |
| Pay day effect inputs | Workforce planning | Footfall counters and sensors | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: pay cycles vary by employer in the area. |
| Digital trend inputs | Retail banking data office | Workforce-management and roster system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: the trend is slow but real. |
| Local events inputs | Branch operations analytics | HR system (employees, skills and contracts) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: the calendar needs a feed. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: branch_footfall_and_staffing_forecast_inputs.v1
owner: branch-operations-analytics@example.com
system_of_record: Branch queue-management system (tickets and wait times)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: hourly_profile, type: double, nullable: false }
    - { name: pay_day_effect, type: double, nullable: false }
    - { name: digital_trend, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Hourly profile and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Pay day effect against Branch queue-management system (tickets and wait times)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Hourly profile, traces back to Branch queue-management system (tickets and wait times); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Rossmann Store Sales | https://www.kaggle.com/c/rossmann-store-sales | Competition rules; free Kaggle login | Daily sales for 1,115 drugstores with promotion, holiday and competitor features | Store-level totals, not SKU level. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE branch_footfall_and_staffing_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE branch_footfall_and_staffing_outputs (
  run_id TEXT NOT NULL REFERENCES branch_footfall_and_staffing_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE branch_footfall_and_staffing_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE branch_footfall_and_staffing_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Branch Footfall & Staffing Forecast": Forecast branch visits by hour so rosters match demand and queues stay short. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Treasury, liquidity and interest-rate risk | The treasury funds the bank, keeps enough liquid assets to survive outflows and manages how net interest income reacts to rates. Key ideas are intraday liquidity, deposit run-off, behavioural assumptions for deposits and prepayments, and the liquidity coverage and net stable funding rules. | Forecast errors here are measured in buffers held and funding costs paid, and the tail (a run, a rate shock) matters more than the average. |
| Conduct, fairness and customer outcomes | Regulators expect firms to treat customers fairly, identify vulnerable customers and handle complaints properly. Models that route, price or decline must be tested for disparate outcomes, and customers need a route to human review and redress. | A model that raises efficiency but worsens outcomes for one group is a conduct failure, not a success. |
| How a bank lends: origination, servicing and workout | A loan is originated (application, underwriting, approval, documents), serviced for years (payments, covenants, reviews) and, if the borrower struggles, moved to collections or workout. Each stage has its own data, owner and model: underwriting models see applicants, behaviour models see accounts, early-warning models see covenant and cash-flow signals. | Which stage you are modelling decides the label, the delay before you learn the outcome and which team acts on your score. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Hourly profile | Median visits by hour for each day type, such as normal, pay day or holiday. The core pattern. | Leakage risk to design against: Closures and refits distort it, so exclude them. |
| A signal-versus-noise trap in this use case: Hourly | The true signal is demand at the hour level; the common noise is daily totals. | Peaks drive queues, and a day with the right total can still have a lunchtime queue. |

**Ask the experts**

- [ ] What exactly does "Rosters are fixed three weeks ahead, so forecasts are needed for 3 to 6 weeks out" mean in practice for branch footfall & staffing forecast: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Hourly profile" and "Pay day effect", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Wait time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: closed days in the history look like zero demand and bias the forecast, and who can confirm the cut-off times and splits?
- [ ] How often does "Branch refit" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| LTV | Loan-to-value: the loan balance divided by the property value; a higher LTV means less equity cushion. |
| DTI | Debt-to-income: total monthly debt payments divided by monthly income, a standard affordability measure. |
| Catastrophe model | A simulation of hazard, exposure and vulnerability that estimates insured losses from events such as storms or earthquakes. |
| Four-eyes principle | A control requiring a second person to approve a sensitive action. |
| Covenant | A condition in a loan agreement, such as a maximum leverage ratio, that the borrower must keep to; a breach lets the lender act. |
| RAROC | Risk-adjusted return on capital: income minus costs and expected loss, divided by the capital held against the risk. |
| LCR | Liquidity coverage ratio: high-quality liquid assets divided by expected 30-day stressed net outflows. |
| NSFR | Net stable funding ratio: available stable funding relative to required stable funding over a one-year horizon. |
| NII | Net interest income: interest earned on assets minus interest paid on liabilities. |
| Deposit beta | How much of a change in the policy rate the bank passes on to depositors. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Forecast horizon | How many steps ahead a forecast looks. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
