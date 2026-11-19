# DDoS Detection & Mitigation: data and feature specification

> Generated from the blueprint `cybersecurity/ddos-detection-and-mitigation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** DDoS Detection & Mitigation · **Domain:** cybersecurity · **Latency tier:** sub-10ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "DDoS Detection & Mitigation": Detect volumetric and application-layer DDoS within seconds and drive mitigation without dropping legitimate traffic. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Lab floods unlike real attacks.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Packet-rate deviation per destination | z-score vs seasonal baseline | Volumetric attack | Seasonal model |   |   |   |
| Source entropy | distribution of source IPs | Spoofed or botnet | Window |   |   |   |
| Header/payload pattern clustering | dominant patterns in sampled traffic | Filter signature | Sampling |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Baseline | Traffic baselines by destination and time | Static thresholds | Legitimate flash crowds exceed static thresholds |
| Mitigation | Surgical signature extraction for filtering | Block whole sources or prefixes | Broad blocks drop customers |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Source country | spoofed |
| Packet size alone | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Packet-rate deviation per destination inputs | Detection engineering | SIEM and security data lake | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: seasonal model. |
| Source entropy inputs | Security data platform | Asset inventory (CMDB) and identity directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: window. |
| Header/payload pattern clustering inputs | Identity and access team | Case and ticketing system (SOAR) | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: sampling. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: ddos_detection_and_mitigation_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: packet_rate_deviation_per_destination, type: double, nullable: false }
    - { name: source_entropy, type: double, nullable: false }
    - { name: header_payload_pattern_clustering, type: double, nullable: false }
sla:
  freshness_p95: 5 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Packet-rate deviation per destination and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Source entropy against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 5 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Packet-rate deviation per destination, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE ddos_detection_and_mitigation_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  packet_rate_deviation_per_destination DOUBLE PRECISION,
  source_entropy                     DOUBLE PRECISION,
  header_payload_pattern_clustering  DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE ddos_detection_and_mitigation_decisions (
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
CREATE TABLE ddos_detection_and_mitigation_labels (
  decision_id    UUID        NOT NULL REFERENCES ddos_detection_and_mitigation_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "DDoS Detection & Mitigation": Detect volumetric and application-layer DDoS within seconds and drive mitigation without dropping legitimate traffic. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Network and endpoint detection | Network detectors inspect flows, DNS and protocol behaviour for intrusions, scanning, tunnelling and denial of service; endpoint detectors watch processes, files, registry and memory for malware and ransomware. Training data come from labs and public captures, while production traffic is mostly benign and constantly changing. | Class imbalance, distribution shift and adversaries who adapt make detection rates on public datasets a poor guide to production performance. |
| Vulnerability and risk management | Organisations track thousands of software vulnerabilities (CVEs), score their severity, and decide what to patch first. Few are ever exploited; exploit likelihood, asset criticality, exposure and compensating controls decide priority. Attack-path analysis shows how weaknesses chain together. | Prioritising by severity alone creates unmanageable lists; prioritising by exploit evidence and asset value cuts work and risk. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Packet-rate deviation per destination | Z-score vs seasonal baseline. Volumetric attack. | Leakage risk to design against: Seasonal model. |
| A signal-versus-noise trap in this use case: Baseline | The true signal is traffic baselines by destination and time; the common noise is static thresholds. | Legitimate flash crowds exceed static thresholds. |

**Ask the experts**

- [ ] What exactly does "Terabit-scale traffic" mean in practice for ddos detection & mitigation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Packet-rate deviation per destination" and "Source entropy", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to mitigate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: lab floods unlike real attacks, and who can confirm the cut-off times and splits?
- [ ] How often does "Flash crowd after a product launch" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| DDoS | Distributed denial of service: flooding a service with traffic from many sources to make it unavailable. |
| NIDS / IDS | Network intrusion detection system: monitors traffic for attacks and policy violations. |
| Kill chain | A model of attack stages from reconnaissance to action on objectives. |
| Ransomware | Malware that encrypts files and demands payment for the key. |
| YARA / Sigma | Rule languages for describing malware patterns (YARA) and log-based detections (Sigma). |
| Honeypot | A decoy system built to attract and study attackers. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Robust z-score | A deviation measure using the median and median absolute deviation, which outliers do not distort. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
