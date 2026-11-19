# Ransomware Early Detection: data and feature specification

> Generated from the blueprint `cybersecurity/ransomware-early-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ransomware Early Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Ransomware Early Detection": Detect mass file encryption within seconds on endpoints and file servers to stop it before significant data is lost. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Lab ransomware samples differ from live attacks.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Write entropy jump | entropy of written blocks vs original | Encryption | Block sampling |   |   |   |
| Rename and extension change rate | files renamed per second | Mass change | Time window |   |   |   |
| Process lineage anomaly | process spawned by office app or script | Initial access | Lineage data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Behaviour | File I/O entropy changes and rename patterns | Static file signatures | New ransomware families have no signatures |
| Speed | Early partial-encryption detection | Waiting for full evidence | Every second costs thousands of files |

## Features to drop

| Feature | Why it is noise |
|---|---|
| File path names | highly variable |
| Process name | trivial to change |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Write entropy jump inputs | Detection engineering | SIEM and security data lake | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: block sampling. |
| Rename and extension change rate inputs | Security data platform | Asset inventory (CMDB) and identity directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: time window. |
| Process lineage anomaly inputs | Identity and access team | Case and ticketing system (SOAR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: lineage data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: ransomware_early_detection_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: write_entropy_jump, type: double, nullable: false }
    - { name: rename_and_extension_change_rate, type: double, nullable: false }
    - { name: process_lineage_anomaly, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Write entropy jump and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Rename and extension change rate against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Write entropy jump, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
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
CREATE TABLE ransomware_early_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  write_entropy_jump                 DOUBLE PRECISION,
  rename_and_extension_change_rate   DOUBLE PRECISION,
  process_lineage_anomaly            DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE ransomware_early_detection_decisions (
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
CREATE TABLE ransomware_early_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES ransomware_early_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Ransomware Early Detection": Detect mass file encryption within seconds on endpoints and file servers to stop it before significant data is lost. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Evidence and context | Decisions rest on logs (process, authentication, network, DNS), threat intelligence about addresses and files, asset criticality, and identity context such as whether a user is travelling. Logs have retention limits, clock differences and gaps, and the same behaviour can be malicious or benign depending on context, for example encoded PowerShell from a document versus from a management agent. | An agent that cannot get the deciding evidence must say so and escalate, not infer. |
| What an alert verdict means | A true positive is a real malicious event, a false positive is a mistaken detection and a benign true positive is a correct detection of authorised activity, such as a pentest or an administrator's script. Closing an alert as benign without evidence is the most dangerous mistake, because an active attack then goes unnoticed. | Define verdicts with the SOC. Ground truth for evaluation must come from analyst conclusions backed by cited log lines, not satisfaction scores. |
| ATT&CK and attacker behaviour | MITRE ATT&CK catalogues attacker tactics and techniques, such as PowerShell execution (T1059.001), valid accounts (T1078), brute force (T1110), application-layer command and control (T1071) and exfiltration over alternative protocols (T1048). Analysts reason about behaviour chains, not isolated indicators. | Use technique names so verdicts are comparable and testable, and build replay cases from real technique telemetry. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Write entropy jump | Entropy of written blocks vs original. Encryption. | Leakage risk to design against: Block sampling. |
| A signal-versus-noise trap in this use case: Behaviour | The true signal is file I/O entropy changes and rename patterns; the common noise is static file signatures. | New ransomware families have no signatures. |

**Ask the experts**

- [ ] What exactly does "Detection within 10 seconds" mean in practice for ransomware early detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Write entropy jump" and "Rename and extension change rate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Files encrypted before containment" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: lab ransomware samples differ from live attacks, and who can confirm the cut-off times and splits?
- [ ] How often does "Legitimate encryption tools (backup, disk encryption)" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Ransomware | Malware that encrypts files and demands payment for the key. |
| True / false positive | A real attack correctly detected, or a harmless event wrongly flagged. |
| Benign true positive | A correct detection of activity that is authorised, such as a scheduled scan or administrator task. |
| Containment | Actions that limit an attack's spread, such as isolating a host or disabling an account. |
| Attack path | A chain of weaknesses and permissions that lets an attacker move from an entry point to a valuable asset. |
| Kill chain | A model of attack stages from reconnaissance to action on objectives. |
| SIEM | Security information and event management: a platform that collects, correlates and searches security logs. |
| EDR | Endpoint detection and response: software on devices that records activity and can isolate a host. |
| SOAR | Security orchestration, automation and response: tools that run scripted playbooks for alerts. |
| IOC | Indicator of compromise: an observable such as an IP address, file hash or domain linked to malicious activity. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Intermittent demand | A series with many zeros and occasional spikes, such as slow-moving items. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| F1 score | The harmonic mean of precision and recall. |
| p99 latency | The time within which 99% of requests complete. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
