# Endpoint Threat Detection: data and feature specification

> Generated from the blueprint `it-ops/endpoint-threat-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Endpoint Threat Detection · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Endpoint Threat Detection": Detect malicious behaviour on devices from process, file and network events and alert analysts with the process tree, using device and process signals and not employee activity profiles. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Content monitoring.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Process lineage anomaly | unusual parent and child processes | Core | From endpoint events |   |   |   |
| Persistence and credential access behaviour | registry and credential store access | Core | From endpoint events |   |   |   |
| Network destination reputation | rarity and reputation of destinations | Support | From threat feeds |   |   |   |
| Device role and software baseline | normal tools on this type of device | Context | From the CMDB |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Confirmed incidents and red team activity | Detection rule hits | Rules include benign tools |
| Scope | Process and file behaviour | Employee browsing or content | Content monitoring raises privacy and legal issues |
| Action | Alert with the process tree | Automatic wipe | Wrong containment disrupts work |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Employee name | personal data |
| Hostname | an identifier |
| Browser history | privacy-invasive |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Process lineage anomaly inputs | Infrastructure and operations | IT service management platform | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from endpoint events. |
| Persistence and credential access behaviour inputs | Service management | Configuration management database | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from endpoint events. |
| Network destination reputation inputs | Security operations | Monitoring, logging and cloud billing platforms | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from threat feeds. |
| Device role and software baseline inputs | Infrastructure and operations | IT service management platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the CMDB. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: endpoint_threat_detection_inputs.v1
owner: infrastructure-and-operations@example.com
system_of_record: IT service management platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: process_lineage_anomaly, type: double, nullable: false }
    - { name: persistence_and_credential_access, type: double, nullable: false }
    - { name: network_destination_reputation, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Process lineage anomaly and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Persistence and credential access behaviour against IT service management platform
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Process lineage anomaly, traces back to IT service management platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Server Machine Dataset (OmniAnomaly) | https://github.com/NetManAIOps/OmniAnomaly | MIT licence (see the repository) | Multivariate server metrics from an internet company with labelled anomalies | One company; coarse labels. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE endpoint_threat_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  process_lineage_anomaly            DOUBLE PRECISION,
  persistence_and_credential_access  DOUBLE PRECISION,
  network_destination_reputation     DOUBLE PRECISION,
  device_role_and_software_baseline  DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE endpoint_threat_detection_decisions (
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
CREATE TABLE endpoint_threat_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES endpoint_threat_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

IT operations keeps services running and people productive across data centres, clouds, networks and devices. Data arrives as huge volumes of metrics, logs, alerts and tickets, most of it noise, and changes made to production by automation must be controlled as carefully as changes made by people. For this use case, "Endpoint Threat Detection": Detect malicious behaviour on devices from process, file and network events and alert analysts with the process tree, using device and process signals and not employee activity profiles. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Security operations is a triage problem | Security tools raise far more alerts than analysts can read. Context from identity, endpoint and network data decides which alerts matter, and containment is a human decision. | Automatic containment on a wrong alert can stop the business. |
| Alerts are mostly noise | Monitoring tools raise thousands of alerts, many duplicate or symptoms of one fault. Grouping alerts by topology and time into incidents reduces pages and speeds diagnosis. | Suppressing alerts without visibility can hide a real outage, so grouped alerts must stay inspectable. |
| Changes cause most incidents | Releases, configuration changes and patches are the main cause of outages. Risk-based change management, configuration baselines and staged rollouts reduce harm. | Drift between declared and actual configuration hides risk until something fails. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Process lineage anomaly | Unusual parent and child processes. Core. | Leakage risk to design against: From endpoint events. |
| A signal-versus-noise trap in this use case: Label | The true signal is confirmed incidents and red team activity; the common noise is detection rule hits. | Rules include benign tools. |

**Ask the experts**

- [ ] What exactly does "Detection within 60 s of the behaviour" mean in practice for endpoint threat detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Process lineage anomaly" and "Persistence and credential access behaviour", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Incidents detected" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: content monitoring, and who can confirm the cut-off times and splits?
- [ ] How often does "Admin tools" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| MTTD | Mean time to detect a problem. |
| EDR | Endpoint detection and response software. |
| Postmortem | A blameless review after an incident. |
| Telemetry | Data sent from systems about their state. |
| Privileged access | Powerful accounts that can change systems. |
| Recertification | Periodic review of who should keep access. |
| Digital employee experience | How well technology works for employees. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Node / edge | The entities in a graph and the relationships between them. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
