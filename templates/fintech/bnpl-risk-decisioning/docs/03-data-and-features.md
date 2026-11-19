# BNPL Instant Risk Decisioning: data and feature specification

> Generated from the blueprint `fintech/bnpl-risk-decisioning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** BNPL Instant Risk Decisioning · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "BNPL Instant Risk Decisioning": Approve or decline buy-now-pay-later at checkout in under 100 ms with loss targets per merchant cohort and fair outcomes. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on approved orders only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Stacked exposure | total open BNPL obligations from consortium data | Overextension | Snapshot at checkout time |   |   |   |
| First-payment risk | probability of failing the first instalment | Early default is the dominant loss | Label horizon 30 days |   |   |   |
| Basket and merchant risk | category, value and merchant default history | Order-level risk | Merchant history as-of |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Affordability | Cash-flow-based affordability checks | Bureau score alone | Thin-file users have no score but have stable cash flow |
| Stacking | Outstanding BNPL exposure across providers | Own-book exposure only | Loan stacking drives early defaults |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Device battery level | spurious |
| Time on checkout page | friction artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Stacked exposure inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: snapshot at checkout time. |
| First-payment risk inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: label horizon 30 days. |
| Basket and merchant risk inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: merchant history as-of. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: bnpl_risk_decisioning_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: stacked_exposure, type: double, nullable: false }
    - { name: first_payment_risk, type: double, nullable: false }
    - { name: basket_and_merchant_risk, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Stacked exposure and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for First-payment risk against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Stacked exposure, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Porto Seguro Safe Driver Prediction | https://www.kaggle.com/c/porto-seguro-safe-driver-prediction | Competition rules; free Kaggle login | 600K insurance policies with anonymised features and a claim-filed label | Anonymised features limit domain feature work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE bnpl_risk_decisioning_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  stacked_exposure                   DOUBLE PRECISION,
  first_payment_risk                 DOUBLE PRECISION,
  basket_and_merchant_risk           DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE bnpl_risk_decisioning_decisions (
  decision_id    UUID PRIMARY KEY,
  entity_id      TEXT        NOT NULL,
  decided_at     TIMESTAMPTZ NOT NULL,
  model_version  TEXT        NOT NULL,
  score          REAL,
  decision       TEXT        NOT NULL,
  reason_codes   JSONB,
  latency_ms     REAL,
  degraded       BOOLEAN     NOT NULL DEFAULT FALSE
) PARTITION BY RANGE (decided_at);

-- labels arrive late and may be revised; keep source + delay for survival-aware training
CREATE TABLE bnpl_risk_decisioning_labels (
  decision_id    UUID        NOT NULL REFERENCES bnpl_risk_decisioning_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "BNPL Instant Risk Decisioning": Approve or decline buy-now-pay-later at checkout in under 100 ms with loss targets per merchant cohort and fair outcomes. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Credit risk: the loan lifecycle and what a default is | A lender decides whether to approve an application (underwriting), sets a price and limit, then watches the account: it may stay current, fall behind (delinquency counted in days past due) and eventually be written off (charge-off). Default is defined by a rule, usually 90 days past due or a bankruptcy event, and the definition changes what the model learns. | The label depends on the default definition and the observation window; two teams can build opposite models from the same data without agreeing on it. |
| Chargebacks, reason codes and label delay | A cardholder disputes a transaction with their bank, which can reverse it through the card network (a chargeback) weeks or months later. The network's reason codes say why, and only some codes mean fraud. Fraud that nobody notices is never labelled, and fraud that customers notice quickly is over-represented in recent data. | Labels are late and biased. Train only on matured labels and keep a maturity gap before the test period, or you teach the model that recent fraud is genuine. |
| Selection bias in lending data | You only observe repayment for applicants you approved. Rejected applicants have no outcome, so models trained on approved customers can be wrong for the people they would reject. Techniques such as reject inference and random approval experiments try to correct it. | A scorecard that looks accurate on past approvals can fail on the new applicants a policy change lets in. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Stacked exposure | Total open BNPL obligations from consortium data. Overextension. | Leakage risk to design against: Snapshot at checkout time. |
| A signal-versus-noise trap in this use case: Affordability | The true signal is cash-flow-based affordability checks; the common noise is bureau score alone. | Thin-file users have no score but have stable cash flow. |

**Ask the experts**

- [ ] What exactly does "100 ms total checkout budget" mean in practice for bnpl instant risk decisioning: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Stacked exposure" and "First-payment risk", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Loss rate per GMV" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on approved orders only, and who can confirm the cut-off times and splits?
- [ ] How often does "Merchant promotion causes volume surge" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| BNPL | Buy now, pay later: short-term instalment credit offered at checkout, often with limited underwriting. |
| Reason code | The network's code on a dispute that says why it was raised, for example fraud, goods not received or processing error. |
| False decline | A genuine transaction that is wrongly refused, also called a false positive, and a direct cost in revenue and customer trust. |
| Credit bureau | A company that collects borrowers' credit histories and sells reports and scores to lenders. |
| Days past due (DPD) | How many days a payment is overdue; 30, 60 and 90 DPD are common delinquency buckets. |
| Vintage | A group of loans originated in the same period, tracked together over time to compare performance. |
| Charge-off | Writing a loan off as a loss after prolonged non-payment. |
| Roll rate | The share of accounts that move from one delinquency bucket to the next, such as 30 to 60 days. |
| Collections | The process of contacting customers who are behind on payments to recover money, within strict conduct rules. |
| Reconciliation | Matching records between two systems, for example bank statements and ledger entries, and investigating differences. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Platt scaling | Calibrating scores with a logistic curve. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
