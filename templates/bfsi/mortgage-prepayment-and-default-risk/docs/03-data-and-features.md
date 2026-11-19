# Mortgage Prepayment & Default Risk Modelling: data and feature specification

> Generated from the blueprint `bfsi/mortgage-prepayment-and-default-risk` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Mortgage Prepayment & Default Risk Modelling · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Mortgage Prepayment & Default Risk Modelling": Forecast monthly prepayment and default for each mortgage so pricing, hedging, provisioning and servicing capacity use the right cash flows. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Random split leaks vintages across train and test.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Refinance incentive | current coupon minus prevailing offer rate for the borrower's LTV and score band | Drives rate-sensitive prepayment | Market rate must be as at the month, not today |   |   |   |
| Loan seasoning curve | piecewise hazard by months since origination | Prepayment ramps over the first 30 months | Vintage and seasoning mix if not stratified |   |   |   |
| Current LTV with house price index | balance divided by indexed property value using the local HPI | Negative equity blocks refinancing and raises default | HPI release lags the decision date |   |   |   |
| Payment shock | scheduled payment change at the next reset divided by current payment | Reset shocks cause both prepayment and distress | The reset date must be known contractually, not learned from the outcome |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Competing risk | Prepayment and default treated as competing exits with separate hazards | Predicting one outcome and discarding the other | Ignoring prepayment overstates default exposure on loans that would have left |
| Rate incentive | Refinance incentive as current rate minus the market rate available to this borrower | Using the coupon alone | Coupon without the market rate cannot see a refinancing wave |
| Burnout | Loans that skipped past refinancing waves are less sensitive later | Treating all borrowers as equally rate-sensitive | Pools look stable until a second wave arrives and prepayment undershoots |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Broker name | proxies for vintage and product, not for behaviour |
| Month-end balance rounding | numerical noise below any decision threshold |
| Application channel | correlates with cohort effects that change every year |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Refinance incentive inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: market rate must be as at the month, not today. |
| Loan seasoning curve inputs | Risk data office | General ledger and risk data warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: vintage and seasoning mix if not stratified. |
| Current LTV with house price index inputs | Operations | Customer master and KYC repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: HPI release lags the decision date. |
| Payment shock inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: the reset date must be known contractually, not learned from the outcome. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: mortgage_prepayment_and_default_risk_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: refinance_incentive, type: double, nullable: false }
    - { name: loan_seasoning_curve, type: double, nullable: false }
    - { name: current_ltv_with_house_price_index, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Refinance incentive and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Loan seasoning curve against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Refinance incentive, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Freddie Mac Single-Family Loan-Level Dataset | https://www.freddiemac.com/research/datasets/sf-loanlevel-dataset | Free with registration and acceptance of terms | Origination and monthly performance for millions of US mortgages, including prepayment and default status | Prime US agency loans only; registration required; no borrower-level free text or documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| KKBox Churn Prediction Challenge | https://www.kaggle.com/c/kkbox-churn-prediction-challenge | Competition rules; free Kaggle login | Subscription and listening logs for a music service with a churn label | Music streaming, not B2B SaaS. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE mortgage_prepayment_and_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE mortgage_prepayment_and_outputs (
  run_id TEXT NOT NULL REFERENCES mortgage_prepayment_and_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE mortgage_prepayment_and_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE mortgage_prepayment_and_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Mortgage Prepayment & Default Risk Modelling": Forecast monthly prepayment and default for each mortgage so pricing, hedging, provisioning and servicing capacity use the right cash flows. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| How a bank lends: origination, servicing and workout | A loan is originated (application, underwriting, approval, documents), serviced for years (payments, covenants, reviews) and, if the borrower struggles, moved to collections or workout. Each stage has its own data, owner and model: underwriting models see applicants, behaviour models see accounts, early-warning models see covenant and cash-flow signals. | Which stage you are modelling decides the label, the delay before you learn the outcome and which team acts on your score. |
| Expected credit loss, IFRS 9 staging and provisions | Banks hold provisions against expected credit losses: twelve-month loss for performing loans (stage 1), lifetime loss once credit risk has increased significantly (stage 2) and for impaired loans (stage 3). Probability of default, loss given default and exposure at default are combined across scenarios, and a stage change can move provisions sharply. | A model that is slightly wrong near a stage boundary can move reported profit, so stability, hysteresis and explainability matter as much as discrimination. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Refinance incentive | Current coupon minus prevailing offer rate for the borrower's LTV and score band. Drives rate-sensitive prepayment. | Leakage risk to design against: Market rate must be as at the month, not today. |
| A signal-versus-noise trap in this use case: Competing risk | The true signal is prepayment and default treated as competing exits with separate hazards; the common noise is predicting one outcome and discarding the other. | Ignoring prepayment overstates default exposure on loans that would have left. |

**Ask the experts**

- [ ] What exactly does "Competing risks, prepayment versus default, modelled jointly" mean in practice for mortgage prepayment & default risk modelling: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Refinance incentive" and "Loan seasoning curve", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Forecast error of monthly cash flow" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: random split leaks vintages across train and test, and who can confirm the cut-off times and splits?
- [ ] How often does "Rate regime never seen in training" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| LTV | Loan-to-value: the loan balance divided by the property value; a higher LTV means less equity cushion. |
| Model tier | A classification of a model by its materiality, which sets how deeply it is validated. |
| DTI | Debt-to-income: total monthly debt payments divided by monthly income, a standard affordability measure. |
| PD, LGD, EAD | Probability of default, loss given default and exposure at default: the three inputs to expected credit loss. |
| Intraday liquidity | The funds a bank needs during the day to make payments before incoming payments arrive. |
| RAROC | Risk-adjusted return on capital: income minus costs and expected loss, divided by the capital held against the risk. |
| LCR | Liquidity coverage ratio: high-quality liquid assets divided by expected 30-day stressed net outflows. |
| NII | Net interest income: interest earned on assets minus interest paid on liabilities. |
| Deposit beta | How much of a change in the policy rate the bank passes on to depositors. |
| Underwriting | Assessing a risk and deciding whether to accept it and at what price. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| Concordance index | A ranking measure for survival models: the chance the unit that fails first is ranked as riskier. |
| Right-censoring | Observation ending before the event happens, so only a lower bound on the time is known. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Lag feature | A past value of the series used as a predictor. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Distribution shift | A change in the data a model sees compared with training. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
