# Credit Model Drift & Fairness Monitoring: data and feature specification

> Generated from the blueprint `fintech/credit-model-drift-and-fairness-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Credit Model Drift & Fairness Monitoring · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Credit Model Drift & Fairness Monitoring": Continuously monitor credit models for performance decay, population shift and disparate impact, with automated retraining triggers and audit reports. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using immature cohorts as performance evidence.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Population stability by feature | PSI per feature and score | Input shift | Reference window fixed by model version |   |   |   |
| Delay-adjusted default estimate | expected defaults on immature cohorts via survival | Early performance | Use hazard model not simple rates |   |   |   |
| Adverse-impact ratio | approval ratio protected vs reference group | Fairness | Use proxy or surveyed attributes lawfully |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Performance | Matured-outcome performance with delay-aware estimates | Raw recent default rates | Recent cohorts have not had time to default |
| Drift | Concept drift (relationship) vs covariate drift (inputs) | Reporting PSI only | PSI flags inputs but not whether the model is wrong |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Daily PSI fluctuations | sampling noise |
| Single-feature drift in unused features | no decision impact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Population stability by feature inputs | Payments engineering | Core banking ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: reference window fixed by model version. |
| Delay-adjusted default estimate inputs | Risk analytics | Card management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use hazard model not simple rates. |
| Adverse-impact ratio inputs | Customer data office | Customer identity and KYC (CIAM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use proxy or surveyed attributes lawfully. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: credit_model_drift_and_fairness_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: population_stability_by_feature, type: double, nullable: false }
    - { name: delay_adjusted_default_estimate, type: double, nullable: false }
    - { name: adverse_impact_ratio, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Population stability by feature and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Delay-adjusted default estimate against Core banking ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Population stability by feature, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Statlog German Credit Data (UCI) | https://archive.ics.uci.edu/dataset/144/statlog+german+credit+data | CC BY 4.0 (see the UCI page) | 1,000 credit applicants with a good or bad label and a cost matrix | Tiny and old; useful for fairness and explainability exercises, not scale. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE credit_model_drift_and_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE credit_model_drift_and_outputs (
  run_id TEXT NOT NULL REFERENCES credit_model_drift_and_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE credit_model_drift_and_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE credit_model_drift_and_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "Credit Model Drift & Fairness Monitoring": Continuously monitor credit models for performance decay, population shift and disparate impact, with automated retraining triggers and audit reports. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Expected loss, provisioning and regulation | Lenders estimate probability of default (PD), loss given default (LGD) and exposure at default (EAD); expected loss is their product. Accounting rules such as IFRS 9 and CECL require provisions for expected losses over the life of a loan, and fair-lending laws restrict which features can drive decisions and require explanations for rejections. | Models are governed: they need monotonic, explainable behaviour, validation by an independent team and a documented reason for every adverse decision. |
| Credit risk: the loan lifecycle and what a default is | A lender decides whether to approve an application (underwriting), sets a price and limit, then watches the account: it may stay current, fall behind (delinquency counted in days past due) and eventually be written off (charge-off). Default is defined by a rule, usually 90 days past due or a bankruptcy event, and the definition changes what the model learns. | The label depends on the default definition and the observation window; two teams can build opposite models from the same data without agreeing on it. |
| Selection bias in lending data | You only observe repayment for applicants you approved. Rejected applicants have no outcome, so models trained on approved customers can be wrong for the people they would reject. Techniques such as reject inference and random approval experiments try to correct it. | A scorecard that looks accurate on past approvals can fail on the new applicants a policy change lets in. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Population stability by feature | PSI per feature and score. Input shift. | Leakage risk to design against: Reference window fixed by model version. |
| A signal-versus-noise trap in this use case: Performance | The true signal is matured-outcome performance with delay-aware estimates; the common noise is raw recent default rates. | Recent cohorts have not had time to default. |

**Ask the experts**

- [ ] What exactly does "Regulator-grade documentation" mean in practice for credit model drift & fairness monitoring: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Population stability by feature" and "Delay-adjusted default estimate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to detect degradation" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using immature cohorts as performance evidence, and who can confirm the cut-off times and splits?
- [ ] How often does "Policy change shifts population" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| IFRS 9 / CECL | Accounting standards that require banks to book provisions for expected future credit losses. |
| Vintage | A group of loans originated in the same period, tracked together over time to compare performance. |
| Adverse action notice | A required explanation to an applicant who was declined or offered worse terms, listing the main reasons. |
| Fair lending | Laws that prohibit credit decisions that discriminate on protected characteristics, directly or through proxies. |
| PD / LGD / EAD | Probability of default, loss given default and exposure at default: the three components of expected credit loss. |
| Days past due (DPD) | How many days a payment is overdue; 30, 60 and 90 DPD are common delinquency buckets. |
| Charge-off | Writing a loan off as a loss after prolonged non-payment. |
| Roll rate | The share of accounts that move from one delinquency bucket to the next, such as 30 to 60 days. |
| Transaction monitoring | Rules and models that scan account activity for suspicious patterns and raise alerts. |
| Underwriting | The process of deciding whether to lend or insure and on what terms. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| F1 score | The harmonic mean of precision and recall. |
