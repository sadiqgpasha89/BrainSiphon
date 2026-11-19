# SaaS Account Security Anomaly Detection: data and feature specification

> Generated from the blueprint `saas/saas-account-security-anomalies` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SaaS Account Security Anomaly Detection · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "SaaS Account Security Anomaly Detection": Detect compromised end-user and admin accounts in a multi-tenant SaaS and offer tenants risk signals and automated responses. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels only from reported takeovers.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| New device or location for user | novelty vs history | Compromise | History |   |   |   |
| Sensitive action burst | exports, permission changes in short time | Takeover | Window |   |   |   |
| API token creation anomalies | new tokens after login | Persistence | Event |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Baselines | Per-user and per-tenant baselines | Global anomaly model | Normal differs by tenant and role |
| Response | Customer-defined policy actions | Fixed vendor action | Tenants have different risk appetite |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Browser version | noisy |
| Login hour | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| New device or location for user inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: history. |
| Sensitive action burst inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: window. |
| API token creation anomalies inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: event. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: saas_account_security_anomalies_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: new_device_or_location_for_user, type: double, nullable: false }
    - { name: sensitive_action_burst, type: double, nullable: false }
    - { name: api_token_creation_anomalies, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on New device or location for user and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Sensitive action burst against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as New device or location for user, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| NSL-KDD | https://www.unb.ca/cic/datasets/nsl.html | Research use with citation (see the page) | A cleaned version of the classic KDD Cup 99 intrusion data | Very old; use only to test code. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE saas_account_security_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  new_device_or_location_for_user    DOUBLE PRECISION,
  sensitive_action_burst             DOUBLE PRECISION,
  api_token_creation_anomalies       DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE saas_account_security_decisions (
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
CREATE TABLE saas_account_security_labels (
  decision_id    UUID        NOT NULL REFERENCES saas_account_security_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "SaaS Account Security Anomaly Detection": Detect compromised end-user and admin accounts in a multi-tenant SaaS and offer tenants risk signals and automated responses. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| B2B SaaS metrics and the customer lifecycle | Software-as-a-service companies sell subscriptions to businesses. Key quantities are annual recurring revenue (ARR), net revenue retention, churn, expansion and the sales pipeline. Customers move from lead to account, trial, activation, expansion and renewal, with product usage as the leading signal. | Targets like churn and expansion are slow and censored (many accounts have not renewed yet), so models need survival-style handling and care about leakage from billing events. |
| Reliability engineering and AIOps | Operations teams run services against reliability targets (SLOs). Monitoring produces metrics, logs and traces; models detect anomalies, forecast capacity, correlate alerts, find root causes and sample traces. Incidents are rare, labels are scarce and systems change constantly. | Alert noise and unexplained pages burn out on-call engineers, so precision, grouping and actionable context come first. |
| Identity resolution and the customer data platform | Customer data platforms merge records from many sources into one profile. Matching leads to accounts, cleaning duplicates and resolving identities are entity-resolution problems with strict privacy rules. | A wrong merge combines two real customers, with privacy consequences, so precision comes before recall. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: New device or location for user | Novelty vs history. Compromise. | Leakage risk to design against: History. |
| A signal-versus-noise trap in this use case: Baselines | The true signal is per-user and per-tenant baselines; the common noise is global anomaly model. | Normal differs by tenant and role. |

**Ask the experts**

- [ ] What exactly does "Per-tenant privacy" mean in practice for saas account security anomaly detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "New device or location for user" and "Sensitive action burst", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Account takeovers detected" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labels only from reported takeovers, and who can confirm the cut-off times and splits?
- [ ] How often does "Tenant uses a VPN that changes IP constantly" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Breaking change | A change that makes existing client code fail, which normally requires a new major version. |
| QBR | Quarterly business review: a meeting where a customer success manager reviews value delivered with a customer. |
| Observability | The ability to understand a system's state from its metrics, logs and traces. |
| API | Application programming interface: the way one program calls another, often over HTTP. |
| Endpoint | A specific URL and method of an API, such as POST /v2/payments. |
| SDK | Software development kit: a language-specific library that wraps an API. |
| OpenAPI / Swagger | A standard machine-readable description of a REST API's endpoints, parameters and schemas. |
| REST | A common style of web API built around resources and HTTP methods. |
| Webhook | An HTTP callback in which a service notifies your server when an event happens. |
| Rate limit | The maximum number of requests allowed in a time window, with errors returned when exceeded. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Stationarity | A series whose statistical properties do not change over time. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
