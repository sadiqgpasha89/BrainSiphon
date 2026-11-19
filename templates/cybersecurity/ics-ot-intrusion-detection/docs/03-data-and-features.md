# ICS/OT Intrusion Detection: data and feature specification

> Generated from the blueprint `cybersecurity/ics-ot-intrusion-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** ICS/OT Intrusion Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "ICS/OT Intrusion Detection": Detect malicious commands and process manipulation in industrial control networks using protocol-aware and physics-based models without disrupting operations. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Testbed attacks lacking plant realism.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Command-sequence deviation | unexpected function codes | Unauthorised control | Protocol parsing |   |   |   |
| Sensor-physics residual | residual from process model | Spoofed sensors | Model |   |   |   |
| New communicator | previously unseen device pair | Lateral movement | Baseline |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Physics | Process-physics residual models | IT-style network anomaly only | Attacks that manipulate setpoints look like normal traffic |
| Allow-lists | Learned communication allow-lists | Generic signatures | OT communications are highly regular |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Packet timing jitter | network |
| Vendor banner | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Command-sequence deviation inputs | Detection engineering | SIEM and security data lake | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: protocol parsing. |
| Sensor-physics residual inputs | Security data platform | Asset inventory (CMDB) and identity directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: model. |
| New communicator inputs | Identity and access team | Case and ticketing system (SOAR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: baseline. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: ics_ot_intrusion_detection_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: command_sequence_deviation, type: double, nullable: false }
    - { name: sensor_physics_residual, type: double, nullable: false }
    - { name: new_communicator, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Command-sequence deviation and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Sensor-physics residual against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Command-sequence deviation, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Loghub system log collection | https://github.com/logpai/loghub | Research use (see the repository) | Real log datasets from distributed systems, supercomputers and applications | Labels are sparse and system-specific. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE ics_ot_intrusion_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  command_sequence_deviation         DOUBLE PRECISION,
  sensor_physics_residual            DOUBLE PRECISION,
  new_communicator                   DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE ics_ot_intrusion_detection_decisions (
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
CREATE TABLE ics_ot_intrusion_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES ics_ot_intrusion_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "ICS/OT Intrusion Detection": Detect malicious commands and process manipulation in industrial control networks using protocol-aware and physics-based models without disrupting operations. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Operational technology and IoT security | Industrial control systems and IoT devices run physical processes with strict safety and availability requirements and little room for active probing. Detection relies on knowing normal process behaviour and physics. | False alarms or interference can halt a plant, so detection is passive and conservative. |
| Network and endpoint detection | Network detectors inspect flows, DNS and protocol behaviour for intrusions, scanning, tunnelling and denial of service; endpoint detectors watch processes, files, registry and memory for malware and ransomware. Training data come from labs and public captures, while production traffic is mostly benign and constantly changing. | Class imbalance, distribution shift and adversaries who adapt make detection rates on public datasets a poor guide to production performance. |
| What an alert verdict means | A true positive is a real malicious event, a false positive is a mistaken detection and a benign true positive is a correct detection of authorised activity, such as a pentest or an administrator's script. Closing an alert as benign without evidence is the most dangerous mistake, because an active attack then goes unnoticed. | Define verdicts with the SOC. Ground truth for evaluation must come from analyst conclusions backed by cited log lines, not satisfaction scores. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Command-sequence deviation | Unexpected function codes. Unauthorised control. | Leakage risk to design against: Protocol parsing. |
| A signal-versus-noise trap in this use case: Physics | The true signal is process-physics residual models; the common noise is iT-style network anomaly only. | Attacks that manipulate setpoints look like normal traffic. |

**Ask the experts**

- [ ] What exactly does "Passive monitoring only" mean in practice for ics/ot intrusion detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Command-sequence deviation" and "Sensor-physics residual", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to detect OT anomalies" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: testbed attacks lacking plant realism, and who can confirm the cut-off times and splits?
- [ ] How often does "Planned maintenance changes setpoints" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| NIDS / IDS | Network intrusion detection system: monitors traffic for attacks and policy violations. |
| SCADA / ICS | Supervisory control systems and industrial control systems that run physical processes. |
| Lateral movement | An attacker moving from one compromised system to others inside the network. |
| True / false positive | A real attack correctly detected, or a harmless event wrongly flagged. |
| NetFlow | A summary record of a network conversation (addresses, ports, bytes) rather than the full packets. |
| Kill chain | A model of attack stages from reconnaissance to action on objectives. |
| Alert correlation | Grouping related alerts into one incident so analysts see the whole story. |
| Benign true positive | A correct detection of activity that is authorised, such as a scheduled scan or administrator task. |
| DDoS | Distributed denial of service: flooding a service with traffic from many sources to make it unavailable. |
| Ransomware | Malware that encrypts files and demands payment for the key. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Node / edge | The entities in a graph and the relationships between them. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
