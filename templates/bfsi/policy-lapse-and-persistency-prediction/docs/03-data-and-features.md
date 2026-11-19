# Policy Lapse & Persistency Prediction: data and feature specification

> Generated from the blueprint `bfsi/policy-lapse-and-persistency-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Policy Lapse & Persistency Prediction · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Policy Lapse & Persistency Prediction": Predict which policies will lapse so retention teams and the actuary can plan interventions and reserves. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Contacted customers differ.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Premium shock | renewal premium change | Price sensitivity | Known at renewal |   |   |   |
| Missed payment count | missed or late payments | Distress | Grace period |   |   |   |
| Surrender charge expiry | months until the charge ends | Timing | Contract data |   |   |   |
| Service contacts | complaints and calls | Dissatisfaction | Logging |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Timing | Hazard by policy year and payment mode | Single yes or no | Lapse peaks around anniversaries and surrender charges ending |
| Cause | Voluntary, non-payment and lapse due to price change | One lapse flag | Treatments differ |
| Cohort | Duration and product vintage | Average persistency | Vintages differ |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Policy number | arbitrary |
| Agent code | cohort |
| Name | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Premium shock inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: known at renewal. |
| Missed payment count inputs | Risk data office | General ledger and risk data warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: grace period. |
| Surrender charge expiry inputs | Operations | Customer master and KYC repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: contract data. |
| Service contacts inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: logging. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: policy_lapse_and_persistency_prediction_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: premium_shock, type: double, nullable: false }
    - { name: missed_payment_count, type: double, nullable: false }
    - { name: surrender_charge_expiry, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Premium shock and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Missed payment count against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Premium shock, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| KKBox Churn Prediction Challenge | https://www.kaggle.com/c/kkbox-churn-prediction-challenge | Competition rules; free Kaggle login | Subscription and listening logs for a music service with a churn label | Music streaming, not B2B SaaS. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Freddie Mac Single-Family Loan-Level Dataset | https://www.freddiemac.com/research/datasets/sf-loanlevel-dataset | Free with registration and acceptance of terms | Origination and monthly performance for millions of US mortgages, including prepayment and default status | Prime US agency loans only; registration required; no borrower-level free text or documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE policy_lapse_and_persistency_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE policy_lapse_and_persistency_outputs (
  run_id TEXT NOT NULL REFERENCES policy_lapse_and_persistency_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE policy_lapse_and_persistency_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE policy_lapse_and_persistency_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Policy Lapse & Persistency Prediction": Predict which policies will lapse so retention teams and the actuary can plan interventions and reserves. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Insurance: pricing, underwriting, claims and reserving | An insurer collects premiums, underwrites risks, pays claims and holds reserves for claims not yet settled. Underwriting selects and prices risk, claims handling pays and investigates, and actuaries estimate ultimate cost from development triangles using methods such as chain-ladder. | Labels arrive years later for long-tail lines, and the same data feed serves pricing, claims and reserving teams with different definitions. |
| Conduct, fairness and customer outcomes | Regulators expect firms to treat customers fairly, identify vulnerable customers and handle complaints properly. Models that route, price or decline must be tested for disparate outcomes, and customers need a route to human review and redress. | A model that raises efficiency but worsens outcomes for one group is a conduct failure, not a success. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Premium shock | Renewal premium change. Price sensitivity. | Leakage risk to design against: Known at renewal. |
| A signal-versus-noise trap in this use case: Timing | The true signal is hazard by policy year and payment mode; the common noise is single yes or no. | Lapse peaks around anniversaries and surrender charges ending. |

**Ask the experts**

- [ ] What exactly does "Retention offers within conduct rules" mean in practice for policy lapse & persistency prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Premium shock" and "Missed payment count", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Persistency uplift" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: contacted customers differ, and who can confirm the cut-off times and splits?
- [ ] How often does "Regulation limits offers" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Persistency | The share of policies that stay in force over time; lapse is its opposite. |
| Chain-ladder | An actuarial method that projects ultimate claims from the development of past claims in a triangle. |
| Complaint root cause | The underlying process, product or system failure behind a customer complaint, not just its topic. |
| Suitability | The requirement that a recommended product fits the client's objectives, risk tolerance and circumstances. |
| Mis-selling | Selling a product that does not suit the client or by misleading them about it. |
| Loss triangle | A table of claims by accident period and development period, used to estimate unpaid claims. |
| IBNR | Incurred but not reported: claims that have happened but have not yet been reported or fully known. |
| Vulnerable customer | A customer who, because of circumstances such as illness or bereavement, is at greater risk of harm and needs extra care. |
| ASR | Automatic speech recognition: converting audio of calls into text. |
| Obligation register | A list of regulatory requirements mapped to the policies and controls that satisfy them. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Lag feature | A past value of the series used as a predictor. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
