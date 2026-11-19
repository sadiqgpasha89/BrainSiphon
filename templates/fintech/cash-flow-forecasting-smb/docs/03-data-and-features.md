# Cash-Flow Forecasting for Small Businesses: data and feature specification

> Generated from the blueprint `fintech/cash-flow-forecasting-smb` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cash-Flow Forecasting for Small Businesses · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Cash-Flow Forecasting for Small Businesses": Forecast 13-week cash positions per SMB account to power overdraft alerts, lending offers and working-capital advice. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Random cross-validation across time.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Recurring payment schedule | detected periodic outflows with amount and day pattern | Predictable skeleton of cash flow | Detect only on data before forecast origin |   |   |   |
| Receivable ageing | open invoices by days outstanding and payer behaviour | Timing of inflows | Use invoice status as-of origin |   |   |   |
| Seasonality index by sector | normalised monthly pattern for the business sector | Cold-start prior | Fit on rolling windows to avoid regime leakage |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Structure | Decompose into recurring obligations, receivables and discretionary flows | One global ARIMA per account | Aggregate series hide predictable obligations |
| Uncertainty | Quantile forecasts with coverage checks | Point forecasts | Overdraft decisions need the 10th percentile not the mean |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Business name | no information on cash flow |
| Account holder age | weak and unstable |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Recurring payment schedule inputs | Payments engineering | Core banking ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: detect only on data before forecast origin. |
| Receivable ageing inputs | Risk analytics | Card management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use invoice status as-of origin. |
| Seasonality index by sector inputs | Customer data office | Customer identity and KYC (CIAM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: fit on rolling windows to avoid regime leakage. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: cash_flow_forecasting_smb_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: recurring_payment_schedule, type: double, nullable: false }
    - { name: receivable_ageing, type: double, nullable: false }
    - { name: seasonality_index_by_sector, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Recurring payment schedule and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Receivable ageing against Core banking ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Recurring payment schedule, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Rossmann Store Sales | https://www.kaggle.com/c/rossmann-store-sales | Competition rules; free Kaggle login | Daily sales for 1,115 drugstores with promotion, holiday and competitor features | Store-level totals, not SKU level. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE cash_flow_forecasting_smb_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE cash_flow_forecasting_smb_outputs (
  run_id TEXT NOT NULL REFERENCES cash_flow_forecasting_smb_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE cash_flow_forecasting_smb_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE cash_flow_forecasting_smb_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. For this use case, "Cash-Flow Forecasting for Small Businesses": Forecast 13-week cash positions per SMB account to power overdraft alerts, lending offers and working-capital advice. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Anti-money-laundering and know-your-customer | Banks must verify who customers are (KYC), monitor transactions for patterns such as structuring and layering, screen names against sanctions and politically exposed person lists, and file suspicious activity reports with regulators within deadlines. Monitoring generates alerts that investigators review; most are false. | The cost of an alert is analyst time and the cost of a miss is regulatory penalty, so evaluation uses alert-to-report ratios and investigator capacity, not accuracy. |
| Credit risk: the loan lifecycle and what a default is | A lender decides whether to approve an application (underwriting), sets a price and limit, then watches the account: it may stay current, fall behind (delinquency counted in days past due) and eventually be written off (charge-off). Default is defined by a rule, usually 90 days past due or a bankruptcy event, and the definition changes what the model learns. | The label depends on the default definition and the observation window; two teams can build opposite models from the same data without agreeing on it. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Recurring payment schedule | Detected periodic outflows with amount and day pattern. Predictable skeleton of cash flow. | Leakage risk to design against: Detect only on data before forecast origin. |
| A signal-versus-noise trap in this use case: Structure | The true signal is decompose into recurring obligations, receivables and discretionary flows; the common noise is one global ARIMA per account. | Aggregate series hide predictable obligations. |

**Ask the experts**

- [ ] What exactly does "5M businesses forecast nightly" mean in practice for cash-flow forecasting for small businesses: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Recurring payment schedule" and "Receivable ageing", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Avoided overdraft incidents" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: random cross-validation across time, and who can confirm the cut-off times and splits?
- [ ] How often does "Large one-off tax payment" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Cash-flow forecast | A projection of money coming in and going out over time, used for liquidity and lending decisions. |
| Structuring | Splitting transactions into amounts just under reporting thresholds to avoid detection. |
| Volatility | How much an asset's returns vary, usually the standard deviation of returns. |
| Adverse action notice | A required explanation to an applicant who was declined or offered worse terms, listing the main reasons. |
| BNPL | Buy now, pay later: short-term instalment credit offered at checkout, often with limited underwriting. |
| Collections | The process of contacting customers who are behind on payments to recover money, within strict conduct rules. |
| SAR / STR | Suspicious activity report or suspicious transaction report: the filing a bank makes to the regulator when it suspects money laundering. |
| Sanctions screening | Checking customers and payments against lists of sanctioned people, entities and countries. |
| Layering | Moving money through many accounts and transactions to hide its origin. |
| Transaction monitoring | Rules and models that scan account activity for suspicious patterns and raise alerts. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
