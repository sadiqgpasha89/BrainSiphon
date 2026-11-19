# Retail Banking Churn Prediction: data and feature specification

> Generated from the blueprint `fintech/retail-banking-churn-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Retail Banking Churn Prediction · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Retail Banking Churn Prediction": Identify customers likely to leave within 90 days and trigger the right retention action at net-positive ROI. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Predicting churn and treating without holdout.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Salary-credit shift | share of incoming salary arriving to this account vs prior | Earliest abandonment cue | Detect before closure date |   |   |   |
| Digital engagement decay | 4-week trend of logins and transactions | Disengagement | Exclude outage weeks |   |   |   |
| Product depth | number of active products and their stickiness | Retention driver | Count active, not opened |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Targeting | Uplift modelling to find persuadable customers | Targeting highest churn probability | The likeliest churners often cannot be saved |
| Definition | Churn as primary-account abandonment, not inactivity alone | Account closure only | Customers silently shift salary credit first |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer tenure alone | already captured by product depth |
| Branch assigned | stale, unrelated to digital behaviour |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Salary-credit shift inputs | Payments engineering | Core banking ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: detect before closure date. |
| Digital engagement decay inputs | Risk analytics | Card management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: exclude outage weeks. |
| Product depth inputs | Customer data office | Customer identity and KYC (CIAM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: count active, not opened. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: retail_banking_churn_prediction_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: salary_credit_shift, type: double, nullable: false }
    - { name: digital_engagement_decay, type: double, nullable: false }
    - { name: product_depth, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Salary-credit shift and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Digital engagement decay against Core banking ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Salary-credit shift, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| KKBox Churn Prediction Challenge | https://www.kaggle.com/c/kkbox-churn-prediction-challenge | Competition rules; free Kaggle login | Subscription and listening logs for a music service with a churn label | Music streaming, not B2B SaaS. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Online Retail | https://archive.ics.uci.edu/dataset/352/online+retail | CC BY 4.0 (see the UCI page) | About 540K invoices from a UK gift retailer over a year | Single retailer, no sessions; good for RFM, churn and basket work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE retail_banking_churn_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE retail_banking_churn_outputs (
  run_id TEXT NOT NULL REFERENCES retail_banking_churn_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE retail_banking_churn_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE retail_banking_churn_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. For this use case, "Retail Banking Churn Prediction": Identify customers likely to leave within 90 days and trigger the right retention action at net-positive ROI. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Credit risk: the loan lifecycle and what a default is | A lender decides whether to approve an application (underwriting), sets a price and limit, then watches the account: it may stay current, fall behind (delinquency counted in days past due) and eventually be written off (charge-off). Default is defined by a rule, usually 90 days past due or a bankruptcy event, and the definition changes what the model learns. | The label depends on the default definition and the observation window; two teams can build opposite models from the same data without agreeing on it. |
| Expected loss, provisioning and regulation | Lenders estimate probability of default (PD), loss given default (LGD) and exposure at default (EAD); expected loss is their product. Accounting rules such as IFRS 9 and CECL require provisions for expected losses over the life of a loan, and fair-lending laws restrict which features can drive decisions and require explanations for rejections. | Models are governed: they need monotonic, explainable behaviour, validation by an independent team and a documented reason for every adverse decision. |
| Selection bias in lending data | You only observe repayment for applicants you approved. Rejected applicants have no outcome, so models trained on approved customers can be wrong for the people they would reject. Techniques such as reject inference and random approval experiments try to correct it. | A scorecard that looks accurate on past approvals can fail on the new applicants a policy change lets in. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Salary-credit shift | Share of incoming salary arriving to this account vs prior. Earliest abandonment cue. | Leakage risk to design against: Detect before closure date. |
| A signal-versus-noise trap in this use case: Targeting | The true signal is uplift modelling to find persuadable customers; the common noise is targeting highest churn probability. | The likeliest churners often cannot be saved. |

**Ask the experts**

- [ ] What exactly does "Marketing consent" mean in practice for retail banking churn prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Salary-credit shift" and "Digital engagement decay", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Retained revenue net of offer cost" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: predicting churn and treating without holdout, and who can confirm the cut-off times and splits?
- [ ] How often does "Product repricing event" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Underwriting | The process of deciding whether to lend or insure and on what terms. |
| Credit bureau | A company that collects borrowers' credit histories and sells reports and scores to lenders. |
| Thin file | A customer with little or no credit history, for whom bureau data say little. |
| Adverse action notice | A required explanation to an applicant who was declined or offered worse terms, listing the main reasons. |
| Fair lending | Laws that prohibit credit decisions that discriminate on protected characteristics, directly or through proxies. |
| Reject inference | Methods that estimate how declined applicants would have performed, to reduce selection bias in scorecards. |
| Scorecard | A points-based credit model, often built from binned features with monotonic weights, that regulators and underwriters can read. |
| Collections | The process of contacting customers who are behind on payments to recover money, within strict conduct rules. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| Stationarity | A series whose statistical properties do not change over time. |
| Level shift | An abrupt, lasting change in a series' average. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Lag feature | A past value of the series used as a predictor. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
