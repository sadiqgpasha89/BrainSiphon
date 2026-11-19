# Network Intrusion Detection via Flow Anomalies: data and feature specification

> Generated from the blueprint `cybersecurity/network-intrusion-detection-flow-anomaly` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Network Intrusion Detection via Flow Anomalies · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Network Intrusion Detection via Flow Anomalies": Detect lateral movement, scanning and command-and-control from network flow metadata at line rate, including in encrypted traffic. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on public datasets with unrealistic attacks.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Fan-out and new-destination rate | distinct new peers per host per hour | Scanning and lateral movement | Window and baseline exclude the alert |   |   |   |
| Beaconing periodicity | autocorrelation of connection intervals | C2 beacons | Jitter handling |   |   |   |
| Byte ratio asymmetry | upload to download ratio | Exfiltration | Direction labelling |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Features | Flow-level behavioural features (fan-out, periodicity, byte ratios) | Payload signatures | TLS hides payloads and signatures lag new attacks |
| Benchmarks | Evaluate on recent real traffic with temporal splits | Public datasets like KDD/CICIDS | Public datasets are years old with artefacts that inflate accuracy |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Source port | ephemeral and random |
| Absolute packet counts | scale with host role not intent |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Fan-out and new-destination rate inputs | Detection engineering | SIEM and security data lake | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: window and baseline exclude the alert. |
| Beaconing periodicity inputs | Security data platform | Asset inventory (CMDB) and identity directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: jitter handling. |
| Byte ratio asymmetry inputs | Identity and access team | Case and ticketing system (SOAR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: direction labelling. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: network_intrusion_detection_flow_anomaly_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: fan_out_and_new_destination_rate, type: double, nullable: false }
    - { name: beaconing_periodicity, type: double, nullable: false }
    - { name: byte_ratio_asymmetry, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Fan-out and new-destination rate and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Beaconing periodicity against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Fan-out and new-destination rate, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UNSW-NB15 | https://research.unsw.edu.au/projects/unsw-nb15-dataset | Research use with citation (see the page) | Network packets and flows with modern attack types and labels | Synthetic attack generation; class imbalance varies by split. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| NSL-KDD | https://www.unb.ca/cic/datasets/nsl.html | Research use with citation (see the page) | A cleaned version of the classic KDD Cup 99 intrusion data | Very old; use only to test code. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE network_intrusion_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  fan_out_and_new_destination_rate   DOUBLE PRECISION,
  beaconing_periodicity              DOUBLE PRECISION,
  byte_ratio_asymmetry               DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE network_intrusion_detection_decisions (
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
CREATE TABLE network_intrusion_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES network_intrusion_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Network Intrusion Detection via Flow Anomalies": Detect lateral movement, scanning and command-and-control from network flow metadata at line rate, including in encrypted traffic. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| What an alert verdict means | A true positive is a real malicious event, a false positive is a mistaken detection and a benign true positive is a correct detection of authorised activity, such as a pentest or an administrator's script. Closing an alert as benign without evidence is the most dangerous mistake, because an active attack then goes unnoticed. | Define verdicts with the SOC. Ground truth for evaluation must come from analyst conclusions backed by cited log lines, not satisfaction scores. |
| Network and endpoint detection | Network detectors inspect flows, DNS and protocol behaviour for intrusions, scanning, tunnelling and denial of service; endpoint detectors watch processes, files, registry and memory for malware and ransomware. Training data come from labs and public captures, while production traffic is mostly benign and constantly changing. | Class imbalance, distribution shift and adversaries who adapt make detection rates on public datasets a poor guide to production performance. |
| Evidence and context | Decisions rest on logs (process, authentication, network, DNS), threat intelligence about addresses and files, asset criticality, and identity context such as whether a user is travelling. Logs have retention limits, clock differences and gaps, and the same behaviour can be malicious or benign depending on context, for example encoded PowerShell from a document versus from a management agent. | An agent that cannot get the deciding evidence must say so and escalate, not infer. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Fan-out and new-destination rate | Distinct new peers per host per hour. Scanning and lateral movement. | Leakage risk to design against: Window and baseline exclude the alert. |
| A signal-versus-noise trap in this use case: Features | The true signal is flow-level behavioural features (fan-out, periodicity, byte ratios); the common noise is payload signatures. | TLS hides payloads and signatures lag new attacks. |

**Ask the experts**

- [ ] What exactly does "100 Gbps links" mean in practice for network intrusion detection via flow anomalies: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Fan-out and new-destination rate" and "Beaconing periodicity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Mean time to detect" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on public datasets with unrealistic attacks, and who can confirm the cut-off times and splits?
- [ ] How often does "New backup job creates huge uploads" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| NIDS / IDS | Network intrusion detection system: monitors traffic for attacks and policy violations. |
| Lateral movement | An attacker moving from one compromised system to others inside the network. |
| True / false positive | A real attack correctly detected, or a harmless event wrongly flagged. |
| NetFlow | A summary record of a network conversation (addresses, ports, bytes) rather than the full packets. |
| UEBA | User and entity behaviour analytics: detecting deviations from a person's or device's normal behaviour. |
| C2 / beaconing | Command and control traffic, often a compromised host contacting an attacker's server at regular intervals. |
| Exfiltration | Stealing data out of the network, sometimes hidden inside DNS or web traffic. |
| Benign true positive | A correct detection of activity that is authorised, such as a scheduled scan or administrator task. |
| DDoS | Distributed denial of service: flooding a service with traffic from many sources to make it unavailable. |
| Kill chain | A model of attack stages from reconnaissance to action on objectives. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| F1 score | The harmonic mean of precision and recall. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Stationarity | A series whose statistical properties do not change over time. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
