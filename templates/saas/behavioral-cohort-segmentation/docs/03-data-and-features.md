# Behavioural Cohorts & User Segmentation: data and feature specification

> Generated from the blueprint `saas/behavioral-cohort-segmentation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Behavioural Cohorts & User Segmentation · **Domain:** saas · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Behavioural Cohorts & User Segmentation": Discover behaviour-based user cohorts that predict retention and expansion to drive lifecycle messaging and product decisions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Internal metrics only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Feature-usage embedding | sequence embedding of actions | Behaviour | Window |   |   |   |
| Frequency and recency profile | usage cadence | Engagement | Window |   |   |   |
| Collaboration breadth | teammates active | Network | Org graph |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Validity | Segments validated on outcome separation | Silhouette score | Internal metrics don't show business value |
| Stability | Soft assignment and versioning | Re-cluster weekly | Segments reshuffle and break campaigns |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Signup date | cohort artefact |
| User ID | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Feature-usage embedding inputs | Product analytics | Tenant and entitlement service | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: window. |
| Frequency and recency profile inputs | Platform engineering | Product event warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: window. |
| Collaboration breadth inputs | Customer success operations | CRM and billing (subscriptions) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: org graph. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: behavioral_cohort_segmentation_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: feature_usage_embedding, type: double, nullable: false }
    - { name: frequency_and_recency_profile, type: double, nullable: false }
    - { name: collaboration_breadth, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Feature-usage embedding and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Frequency and recency profile against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Feature-usage embedding, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Online Retail | https://archive.ics.uci.edu/dataset/352/online+retail | CC BY 4.0 (see the UCI page) | About 540K invoices from a UK gift retailer over a year | Single retailer, no sessions; good for RFM, churn and basket work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE behavioral_cohort_segmentation_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE behavioral_cohort_segmentation_outputs (
  run_id TEXT NOT NULL REFERENCES behavioral_cohort_segmentation_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE behavioral_cohort_segmentation_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE behavioral_cohort_segmentation_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Behavioural Cohorts & User Segmentation": Discover behaviour-based user cohorts that predict retention and expansion to drive lifecycle messaging and product decisions. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| What success means for the business | Docs teams track time to first successful API call, support tickets caused by documentation and search success. An assistant that deflects tickets but sends developers wrong limits or versions moves cost from the support team to the developer's incident. | Measure outcomes for developers, not only answer quality, and decide upfront what the assistant must never answer (billing, security advice, legal terms). |
| The anatomy of API documentation | Docs usually combine an API reference (often generated from an OpenAPI specification), guides and tutorials, a changelog or release notes, and migration guides. Each answers a different kind of question, and they can disagree: a changelog legitimately mentions old values. | Retrieval should know which kind of page it is reading. Factual answers come from the reference for the right version, not from the changelog. |
| Versions and deprecation | APIs have versions (v1, v2), SDKs have their own semantic versions (major.minor.patch) per language, and features are deprecated with a sunset date before being removed. A breaking change is one that makes existing code stop working. | The right answer depends on which version the developer is using, so version must come from context and be shown in the answer. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Feature-usage embedding | Sequence embedding of actions. Behaviour. | Leakage risk to design against: Window. |
| A signal-versus-noise trap in this use case: Validity | The true signal is segments validated on outcome separation; the common noise is silhouette score. | Internal metrics don't show business value. |

**Ask the experts**

- [ ] What exactly does "Stable segments" mean in practice for behavioural cohorts & user segmentation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Feature-usage embedding" and "Frequency and recency profile", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Lifecycle campaign lift by segment" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: internal metrics only, and who can confirm the cut-off times and splits?
- [ ] How often does "Product redesign changes event semantics" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Semantic versioning | A version number scheme (major.minor.patch) in which the major number changes for breaking changes. |
| Breaking change | A change that makes existing client code fail, which normally requires a new major version. |
| Embedding | A vector representing the meaning of text, used for similarity search that tolerates different wording. |
| API | Application programming interface: the way one program calls another, often over HTTP. |
| Endpoint | A specific URL and method of an API, such as POST /v2/payments. |
| SDK | Software development kit: a language-specific library that wraps an API. |
| OpenAPI / Swagger | A standard machine-readable description of a REST API's endpoints, parameters and schemas. |
| REST | A common style of web API built around resources and HTTP methods. |
| Webhook | An HTTP callback in which a service notifies your server when an event happens. |
| Rate limit | The maximum number of requests allowed in a time window, with errors returned when exceeded. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Lag feature | A past value of the series used as a predictor. |
| Remaining useful life | The estimated time before a machine or component fails. |
| State-space / Kalman filter | A model that tracks a hidden state through noisy observations and updates it over time. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
