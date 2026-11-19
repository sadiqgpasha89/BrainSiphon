# Log Anomaly Detection: data and feature specification

> Generated from the blueprint `saas/log-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Log Anomaly Detection · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Log Anomaly Detection": Detect abnormal log patterns (new error templates, rate shifts) at scale without manual rules. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Logs from one service only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| New template appearance | previously unseen templates | Novel failure | Template store |   |   |   |
| Template frequency shift | rate vs baseline | Behaviour change | Baseline |   |   |   |
| Sequence perplexity | next-template surprise | Abnormal flow | Model |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Parsing | Template mining (Drain) then sequence models | Raw text models | Raw text is too expensive and noisy |
| Drift | Robust to version-driven template changes | Static template sets | Deploys change templates constantly |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Timestamps in text | parsed out |
| Request IDs | variable |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| New template appearance inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: template store. |
| Template frequency shift inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: baseline. |
| Sequence perplexity inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: model. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: log_anomaly_detection_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: new_template_appearance, type: double, nullable: false }
    - { name: template_frequency_shift, type: double, nullable: false }
    - { name: sequence_perplexity, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on New template appearance and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Template frequency shift against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as New template appearance, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Loghub system log collection | https://github.com/logpai/loghub | Research use (see the repository) | Real log datasets from distributed systems, supercomputers and applications | Labels are sparse and system-specific. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE log_anomaly_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  new_template_appearance            DOUBLE PRECISION,
  template_frequency_shift           DOUBLE PRECISION,
  sequence_perplexity                DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE log_anomaly_detection_decisions (
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
CREATE TABLE log_anomaly_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES log_anomaly_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Log Anomaly Detection": Detect abnormal log patterns (new error templates, rate shifts) at scale without manual rules. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Reliability engineering and AIOps | Operations teams run services against reliability targets (SLOs). Monitoring produces metrics, logs and traces; models detect anomalies, forecast capacity, correlate alerts, find root causes and sample traces. Incidents are rare, labels are scarce and systems change constantly. | Alert noise and unexplained pages burn out on-call engineers, so precision, grouping and actionable context come first. |
| Data platforms, quality and ML operations | Data pipelines move events into warehouses; data quality checks catch schema and volume problems; ML platforms track models, drift, evaluation of language-model applications and costs. Gateways route requests between models by cost and quality. | Many model failures are data failures; monitoring inputs and outputs is as important as the model. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: New template appearance | Previously unseen templates. Novel failure. | Leakage risk to design against: Template store. |
| A signal-versus-noise trap in this use case: Parsing | The true signal is template mining (Drain) then sequence models; the common noise is raw text models. | Raw text is too expensive and noisy. |

**Ask the experts**

- [ ] What exactly does "Billions of lines per day" mean in practice for log anomaly detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "New template appearance" and "Template frequency shift", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Incidents detected via logs first" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: logs from one service only, and who can confirm the cut-off times and splits?
- [ ] How often does "Deploy introduces many new templates" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Observability | The ability to understand a system's state from its metrics, logs and traces. |
| Time to first successful call | How long a new developer takes to make a working API request, a common docs-quality metric. |
| FinOps | Managing cloud spend by tracking, allocating and optimising costs. |
| Breaking change | A change that makes existing client code fail, which normally requires a new major version. |
| Usage-based billing | Charging according to consumption, such as API calls or storage, which makes revenue less predictable. |
| SLO / SLA | A service level objective (internal target) and agreement (promised to customers) for reliability. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
| Level shift | An abrupt, lasting change in a series' average. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Distribution shift | A change in the data a model sees compared with training. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
