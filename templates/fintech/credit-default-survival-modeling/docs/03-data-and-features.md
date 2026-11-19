# Credit Default Survival Modeling: data and feature specification

> Generated from the blueprint `fintech/credit-default-survival-modeling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Credit Default Survival Modeling · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Credit Default Survival Modeling": Estimate time-to-default curves per borrower to set provisions, pricing and limits under IFRS 9 / CECL. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using current delinquency status instead of status as-of observation time.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Months-on-book hazard shape | baseline hazard as piecewise-constant by account age | Default risk peaks at known seasoning points | Vintage effects mix with age if not stratified |   |   |   |
| Utilisation trend 6m | slope of revolving utilisation over 6 months | Distress shows as creeping utilisation | Use statement-date values, never month-end after the fact |   |   |   |
| Payment-to-minimum ratio | payment divided by minimum due, 3-month rolling | Minimum-only payers default earlier | Delinquency flags computed after default leak the label |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Censoring | Right-censored observations modelled explicitly in the likelihood | Dropping open accounts or treating them as non-default | Dropping open loans biases default rates downward by 20-40% |
| Macro | Macro covariates as scenario inputs for stress tests | Fitting on the last 3 benign years | Benign-era fit collapses at the first downturn |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Raw ZIP code | proxy for protected classes and unstable, use regional macro features instead |
| Marketing channel of acquisition | correlates with vintage, not with repayment behaviour |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Months-on-book hazard shape inputs | Payments engineering | Core banking ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: vintage effects mix with age if not stratified. |
| Utilisation trend 6m inputs | Risk analytics | Card management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use statement-date values, never month-end after the fact. |
| Payment-to-minimum ratio inputs | Customer data office | Customer identity and KYC (CIAM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: delinquency flags computed after default leak the label. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: credit_default_survival_modeling_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: months_on_book_hazard_shape, type: double, nullable: false }
    - { name: utilisation_trend_6m, type: double, nullable: false }
    - { name: payment_to_minimum_ratio, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Months-on-book hazard shape and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Utilisation trend 6m against Core banking ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Months-on-book hazard shape, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Freddie Mac Single-Family Loan-Level Dataset | https://www.freddiemac.com/research/datasets/sf-loanlevel-dataset | Free with registration and acceptance of terms | Origination and monthly performance for millions of US mortgages, including prepayment and default status | Prime US agency loans only; registration required; no borrower-level free text or documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| KKBox Churn Prediction Challenge | https://www.kaggle.com/c/kkbox-churn-prediction-challenge | Competition rules; free Kaggle login | Subscription and listening logs for a music service with a churn label | Music streaming, not B2B SaaS. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE credit_default_survival_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE credit_default_survival_outputs (
  run_id TEXT NOT NULL REFERENCES credit_default_survival_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE credit_default_survival_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE credit_default_survival_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. For this use case, "Credit Default Survival Modeling": Estimate time-to-default curves per borrower to set provisions, pricing and limits under IFRS 9 / CECL. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Expected loss, provisioning and regulation | Lenders estimate probability of default (PD), loss given default (LGD) and exposure at default (EAD); expected loss is their product. Accounting rules such as IFRS 9 and CECL require provisions for expected losses over the life of a loan, and fair-lending laws restrict which features can drive decisions and require explanations for rejections. | Models are governed: they need monotonic, explainable behaviour, validation by an independent team and a documented reason for every adverse decision. |
| Credit risk: the loan lifecycle and what a default is | A lender decides whether to approve an application (underwriting), sets a price and limit, then watches the account: it may stay current, fall behind (delinquency counted in days past due) and eventually be written off (charge-off). Default is defined by a rule, usually 90 days past due or a bankruptcy event, and the definition changes what the model learns. | The label depends on the default definition and the observation window; two teams can build opposite models from the same data without agreeing on it. |
| Selection bias in lending data | You only observe repayment for applicants you approved. Rejected applicants have no outcome, so models trained on approved customers can be wrong for the people they would reject. Techniques such as reject inference and random approval experiments try to correct it. | A scorecard that looks accurate on past approvals can fail on the new applicants a policy change lets in. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Months-on-book hazard shape | Baseline hazard as piecewise-constant by account age. Default risk peaks at known seasoning points. | Leakage risk to design against: Vintage effects mix with age if not stratified. |
| A signal-versus-noise trap in this use case: Censoring | The true signal is right-censored observations modelled explicitly in the likelihood; the common noise is dropping open accounts or treating them as non-default. | Dropping open loans biases default rates downward by 20-40%. |

**Ask the experts**

- [ ] What exactly does "Regulatory explainability and monotonic constraints" mean in practice for credit default survival modeling: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Months-on-book hazard shape" and "Utilisation trend 6m", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Provision accuracy versus realised loss" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using current delinquency status instead of status as-of observation time, and who can confirm the cut-off times and splits?
- [ ] How often does "Policy change mid-vintage" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| IFRS 9 / CECL | Accounting standards that require banks to book provisions for expected future credit losses. |
| Vintage | A group of loans originated in the same period, tracked together over time to compare performance. |
| PD / LGD / EAD | Probability of default, loss given default and exposure at default: the three components of expected credit loss. |
| Days past due (DPD) | How many days a payment is overdue; 30, 60 and 90 DPD are common delinquency buckets. |
| Charge-off | Writing a loan off as a loss after prolonged non-payment. |
| Adverse action notice | A required explanation to an applicant who was declined or offered worse terms, listing the main reasons. |
| Roll rate | The share of accounts that move from one delinquency bucket to the next, such as 30 to 60 days. |
| Underwriting | The process of deciding whether to lend or insure and on what terms. |
| Credit bureau | A company that collects borrowers' credit histories and sells reports and scores to lenders. |
| Fair lending | Laws that prohibit credit decisions that discriminate on protected characteristics, directly or through proxies. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| Right-censoring | Observation ending before the event happens, so only a lower bound on the time is known. |
| Concordance index | A ranking measure for survival models: the chance the unit that fails first is ranked as riskier. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| Hidden Markov model | A model in which a hidden state switches over time and generates the observations. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
