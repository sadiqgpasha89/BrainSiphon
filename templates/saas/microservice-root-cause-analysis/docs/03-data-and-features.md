# Microservice Root-Cause Analysis: data and feature specification

> Generated from the blueprint `saas/microservice-root-cause-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Microservice Root-Cause Analysis · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Microservice Root-Cause Analysis": Localise the root cause service or change in a microservice incident using traces, metrics and topology, cutting time to diagnosis. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluation on injected faults only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Anomaly onset ordering | earliest anomaly in the call graph | Root candidate | Clock sync |   |   |   |
| Trace error propagation | where errors originate in traces | Origin | Trace sampling |   |   |   |
| Recent change proximity | change near the candidate | Cause | Change feed |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Causality | Causal graph with fault propagation | Correlation of anomalies | Everything downstream of the root also looks anomalous |
| Changes | Include deploys and config changes | Metrics only | Most incidents originate from a change |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Service name | none |
| Alert count | volume |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Anomaly onset ordering inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: clock sync. |
| Trace error propagation inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: trace sampling. |
| Recent change proximity inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: change feed. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: microservice_root_cause_analysis_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: anomaly_onset_ordering, type: double, nullable: false }
    - { name: trace_error_propagation, type: double, nullable: false }
    - { name: recent_change_proximity, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Anomaly onset ordering and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Trace error propagation against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Anomaly onset ordering, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| LANL Comprehensive Multi-Source Cyber-Security Events | https://csr.lanl.gov/data/cyber1/ | Research release from Los Alamos National Laboratory (see the page) | 58 days of authentication, process, flow and DNS events with a red-team subset | Anonymised and very large. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE microservice_root_cause_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  anomaly_onset_ordering             DOUBLE PRECISION,
  trace_error_propagation            DOUBLE PRECISION,
  recent_change_proximity            DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE microservice_root_cause_decisions (
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
CREATE TABLE microservice_root_cause_labels (
  decision_id    UUID        NOT NULL REFERENCES microservice_root_cause_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Microservice Root-Cause Analysis": Localise the root cause service or change in a microservice incident using traces, metrics and topology, cutting time to diagnosis. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Reliability engineering and AIOps | Operations teams run services against reliability targets (SLOs). Monitoring produces metrics, logs and traces; models detect anomalies, forecast capacity, correlate alerts, find root causes and sample traces. Incidents are rare, labels are scarce and systems change constantly. | Alert noise and unexplained pages burn out on-call engineers, so precision, grouping and actionable context come first. |
| B2B SaaS metrics and the customer lifecycle | Software-as-a-service companies sell subscriptions to businesses. Key quantities are annual recurring revenue (ARR), net revenue retention, churn, expansion and the sales pipeline. Customers move from lead to account, trial, activation, expansion and renewal, with product usage as the leading signal. | Targets like churn and expansion are slow and censored (many accounts have not renewed yet), so models need survival-style handling and care about leakage from billing events. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Anomaly onset ordering | Earliest anomaly in the call graph. Root candidate. | Leakage risk to design against: Clock sync. |
| A signal-versus-noise trap in this use case: Causality | The true signal is causal graph with fault propagation; the common noise is correlation of anomalies. | Everything downstream of the root also looks anomalous. |

**Ask the experts**

- [ ] What exactly does "Dependency graph changes constantly" mean in practice for microservice root-cause analysis: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Anomaly onset ordering" and "Trace error propagation", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Mean time to diagnose" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluation on injected faults only, and who can confirm the cut-off times and splits?
- [ ] How often does "Sampling drops the failing traces" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Root-cause analysis | Finding the underlying cause of an incident rather than its visible symptoms. |
| Incident | An event that degrades a service and needs a response. |
| Distributed trace | A record of one request's path through many services, with timings. |
| Observability | The ability to understand a system's state from its metrics, logs and traces. |
| SLO / SLA | A service level objective (internal target) and agreement (promised to customers) for reliability. |
| LLM-as-judge | Using a language model to grade another model's outputs, calibrated against human labels. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Node / edge | The entities in a graph and the relationships between them. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
