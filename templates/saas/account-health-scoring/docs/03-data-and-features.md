# Customer Account Health Scoring: data and feature specification

> Generated from the blueprint `saas/account-health-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Customer Account Health Scoring · **Domain:** saas · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Customer Account Health Scoring": Combine usage, support, billing and relationship signals into an interpretable health score that CSMs trust and act on. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Weights set by hand never validated.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Product adoption breadth | share of core features used | Value realisation | Feature definitions |   |   |   |
| Time to value | days from contract to first key outcome | Onboarding quality | Event definitions |   |   |   |
| Executive engagement | sponsor meetings and QBRs held | Relationship | CRM |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Validity | Back-test score against realised renewals | Weights set by committee | Unvalidated health scores drift into noise |
| Segments | Segment-specific baselines (SMB, enterprise) | One global scoring | Healthy enterprise usage differs from healthy SMB usage |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Total contract value | scale not health |
| CSM name | personal |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Product adoption breadth inputs | Product analytics | Tenant and entitlement service | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: feature definitions. |
| Time to value inputs | Platform engineering | Product event warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: event definitions. |
| Executive engagement inputs | Customer success operations | CRM and billing (subscriptions) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: CRM. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: account_health_scoring_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: product_adoption_breadth, type: double, nullable: false }
    - { name: time_to_value, type: double, nullable: false }
    - { name: executive_engagement, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Product adoption breadth and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Time to value against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Product adoption breadth, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| KKBox Churn Prediction Challenge | https://www.kaggle.com/c/kkbox-churn-prediction-challenge | Competition rules; free Kaggle login | Subscription and listening logs for a music service with a churn label | Music streaming, not B2B SaaS. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE account_health_scoring_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE account_health_scoring_outputs (
  run_id TEXT NOT NULL REFERENCES account_health_scoring_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE account_health_scoring_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE account_health_scoring_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Customer Account Health Scoring": Combine usage, support, billing and relationship signals into an interpretable health score that CSMs trust and act on. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| B2B SaaS metrics and the customer lifecycle | Software-as-a-service companies sell subscriptions to businesses. Key quantities are annual recurring revenue (ARR), net revenue retention, churn, expansion and the sales pipeline. Customers move from lead to account, trial, activation, expansion and renewal, with product usage as the leading signal. | Targets like churn and expansion are slow and censored (many accounts have not renewed yet), so models need survival-style handling and care about leakage from billing events. |
| Identity resolution and the customer data platform | Customer data platforms merge records from many sources into one profile. Matching leads to accounts, cleaning duplicates and resolving identities are entity-resolution problems with strict privacy rules. | A wrong merge combines two real customers, with privacy consequences, so precision comes before recall. |
| Support, success and the copilots that help them | Support teams answer tickets with help-centre articles and past replies; success managers prepare reviews for customers. Assistants draft replies, route tickets and summarise calls, with accuracy, tone and policy compliance as constraints. | Deflection that hides a wrong answer costs more than a ticket, so assistants must cite sources and escalate when unsure. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Product adoption breadth | Share of core features used. Value realisation. | Leakage risk to design against: Feature definitions. |
| A signal-versus-noise trap in this use case: Validity | The true signal is back-test score against realised renewals; the common noise is weights set by committee. | Unvalidated health scores drift into noise. |

**Ask the experts**

- [ ] What exactly does "Explainable drivers" mean in practice for customer account health scoring: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Product adoption breadth" and "Time to value", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Renewal rate of healthy vs unhealthy" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: weights set by hand never validated, and who can confirm the cut-off times and splits?
- [ ] How often does "Product telemetry gap after instrumentation change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Churn | Customers or revenue lost over a period; logo churn counts accounts, revenue churn counts money. |
| Renewal | The point at which a customer decides whether to continue a subscription. |
| NRR / GRR | Net and gross revenue retention: how much of last period's revenue remains, with or without expansion. |
| Expansion / upsell | Revenue growth from existing customers buying more seats, features or tiers. |
| QBR | Quarterly business review: a meeting where a customer success manager reviews value delivered with a customer. |
| Usage-based billing | Charging according to consumption, such as API calls or storage, which makes revenue less predictable. |
| Sequential testing | Statistical methods that allow results to be checked repeatedly without inflating false positives. |
| Feature flag | A switch that turns a feature on for chosen users, used for gradual rollouts and experiments. |
| CDP | Customer data platform: a system that unifies customer data from many sources into profiles. |
| Entity resolution | Deciding which records refer to the same real-world entity. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
