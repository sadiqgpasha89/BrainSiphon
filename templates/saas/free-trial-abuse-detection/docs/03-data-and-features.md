# Free-Trial & Promo Abuse Detection: data and feature specification

> Generated from the blueprint `saas/free-trial-abuse-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Free-Trial & Promo Abuse Detection · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Free-Trial & Promo Abuse Detection": Detect repeat trials, referral fraud and credit farming at signup to protect revenue without blocking genuine users. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels only from caught abuse.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Device and payment linkage count | accounts sharing device or card | Repeat trials | Hashing |   |   |   |
| Disposable email indicator | domain reputation | Fake accounts | Lists |   |   |   |
| Referral graph anomalies | reciprocal and cyclical referrals | Referral fraud | Graph |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Linkage | Identity linkage across email, device and payment | Per-account checks | Abusers create many accounts |
| Economics | Cost-aware friction by trial value | Block all suspicious | Over-blocking hurts conversion |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Signup hour | weak |
| Browser language | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Device and payment linkage count inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: hashing. |
| Disposable email indicator inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: lists. |
| Referral graph anomalies inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: graph. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: free_trial_abuse_detection_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: device_and_payment_linkage_count, type: double, nullable: false }
    - { name: disposable_email_indicator, type: double, nullable: false }
    - { name: referral_graph_anomalies, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Device and payment linkage count and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Disposable email indicator against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Device and payment linkage count, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| IEEE-CIS Fraud Detection | https://www.kaggle.com/c/ieee-fraud-detection | Competition rules; free Kaggle login | About 590K e-commerce transactions with card, address, email-domain and device fields over six months | Columns are masked and identity is joined by a hashed key; build time-based splits. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Credit Card Fraud Detection (ULB / Worldline) | https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud | Database Contents License (DbCL) v1.0; free Kaggle login | 284,807 European card transactions over two days with 492 frauds; a clean imbalanced benchmark for model and metric code | Features are PCA-anonymised and only 48 hours long: no velocity windows, merchants or label delay. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EMBER malware dataset | https://github.com/elastic/ember | AGPL-3.0 (see the repository) | 1 million Windows PE file feature vectors with benign and malicious labels and a time split | Features, not raw files; labelling cut-off artefacts. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE free_trial_abuse_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  device_and_payment_linkage_count   DOUBLE PRECISION,
  disposable_email_indicator         DOUBLE PRECISION,
  referral_graph_anomalies           DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE free_trial_abuse_detection_decisions (
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
CREATE TABLE free_trial_abuse_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES free_trial_abuse_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Free-Trial & Promo Abuse Detection": Detect repeat trials, referral fraud and credit farming at signup to protect revenue without blocking genuine users. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Product-led growth, pricing and experimentation | Many products grow by letting users try before they buy. Activation (reaching first value), usage depth and team spread predict conversion; pricing and packaging decide who pays for what. A/B tests with few accounts and long horizons need variance reduction and sequential methods. | Underpowered experiments and peeking produce false wins, so experimentation platforms enforce rules about duration and metrics. |
| What success means for the business | Docs teams track time to first successful API call, support tickets caused by documentation and search success. An assistant that deflects tickets but sends developers wrong limits or versions moves cost from the support team to the developer's incident. | Measure outcomes for developers, not only answer quality, and decide upfront what the assistant must never answer (billing, security advice, legal terms). |
| B2B SaaS metrics and the customer lifecycle | Software-as-a-service companies sell subscriptions to businesses. Key quantities are annual recurring revenue (ARR), net revenue retention, churn, expansion and the sales pipeline. Customers move from lead to account, trial, activation, expansion and renewal, with product usage as the leading signal. | Targets like churn and expansion are slow and censored (many accounts have not renewed yet), so models need survival-style handling and care about leakage from billing events. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Device and payment linkage count | Accounts sharing device or card. Repeat trials. | Leakage risk to design against: Hashing. |
| A signal-versus-noise trap in this use case: Linkage | The true signal is identity linkage across email, device and payment; the common noise is per-account checks. | Abusers create many accounts. |

**Ask the experts**

- [ ] What exactly does "Decision at signup within 50 ms" mean in practice for free-trial & promo abuse detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Device and payment linkage count" and "Disposable email indicator", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Trial abuse rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labels only from caught abuse, and who can confirm the cut-off times and splits?
- [ ] How often does "Families or teams share a device" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Activation | A user reaching the first moment of real value in a product. |
| CUPED | A method that reduces experiment variance by adjusting for pre-experiment behaviour. |
| Sequential testing | Statistical methods that allow results to be checked repeatedly without inflating false positives. |
| Feature flag | A switch that turns a feature on for chosen users, used for gradual rollouts and experiments. |
| FinOps | Managing cloud spend by tracking, allocating and optimising costs. |
| Entity resolution | Deciding which records refer to the same real-world entity. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| F1 score | The harmonic mean of precision and recall. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Link prediction | Predicting whether an edge exists or will form between two nodes. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
