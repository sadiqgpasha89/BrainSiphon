# Container Runtime Anomaly Detection: data and feature specification

> Generated from the blueprint `cybersecurity/container-runtime-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Container Runtime Anomaly Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Container Runtime Anomaly Detection": Detect compromised containers via syscalls, process trees and network behaviour with low overhead. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulated attacks lacking realism.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Syscall n-gram novelty | rare syscall sequences for the image | Exploit behaviour | Profile coverage |   |   |   |
| Unexpected process spawn | shell in a service container | Compromise | Image profile |   |   |   |
| Outbound connection novelty | new destinations | C2 | Profile |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Baselines | Learn per-image behavioural profiles | Host-level thresholds | Containers of one image behave consistently, hosts do not |
| Ephemerality | Build profiles from image and deployment, not instance | Instance-level baselines | Instances live minutes |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Container ID | ephemeral |
| Pod IP | ephemeral |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Syscall n-gram novelty inputs | Detection engineering | SIEM and security data lake | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: profile coverage. |
| Unexpected process spawn inputs | Security data platform | Asset inventory (CMDB) and identity directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: image profile. |
| Outbound connection novelty inputs | Identity and access team | Case and ticketing system (SOAR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: profile. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: container_runtime_anomaly_detection_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: syscall_n_gram_novelty, type: double, nullable: false }
    - { name: unexpected_process_spawn, type: double, nullable: false }
    - { name: outbound_connection_novelty, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Syscall n-gram novelty and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Unexpected process spawn against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Syscall n-gram novelty, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
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
CREATE TABLE container_runtime_anomaly_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  syscall_n_gram_novelty             DOUBLE PRECISION,
  unexpected_process_spawn           DOUBLE PRECISION,
  outbound_connection_novelty        DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE container_runtime_anomaly_decisions (
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
CREATE TABLE container_runtime_anomaly_labels (
  decision_id    UUID        NOT NULL REFERENCES container_runtime_anomaly_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Container Runtime Anomaly Detection": Detect compromised containers via syscalls, process trees and network behaviour with low overhead. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Network and endpoint detection | Network detectors inspect flows, DNS and protocol behaviour for intrusions, scanning, tunnelling and denial of service; endpoint detectors watch processes, files, registry and memory for malware and ransomware. Training data come from labs and public captures, while production traffic is mostly benign and constantly changing. | Class imbalance, distribution shift and adversaries who adapt make detection rates on public datasets a poor guide to production performance. |
| What an alert verdict means | A true positive is a real malicious event, a false positive is a mistaken detection and a benign true positive is a correct detection of authorised activity, such as a pentest or an administrator's script. Closing an alert as benign without evidence is the most dangerous mistake, because an active attack then goes unnoticed. | Define verdicts with the SOC. Ground truth for evaluation must come from analyst conclusions backed by cited log lines, not satisfaction scores. |
| ATT&CK and attacker behaviour | MITRE ATT&CK catalogues attacker tactics and techniques, such as PowerShell execution (T1059.001), valid accounts (T1078), brute force (T1110), application-layer command and control (T1071) and exfiltration over alternative protocols (T1048). Analysts reason about behaviour chains, not isolated indicators. | Use technique names so verdicts are comparable and testable, and build replay cases from real technique telemetry. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Syscall n-gram novelty | Rare syscall sequences for the image. Exploit behaviour. | Leakage risk to design against: Profile coverage. |
| A signal-versus-noise trap in this use case: Baselines | The true signal is learn per-image behavioural profiles; the common noise is host-level thresholds. | Containers of one image behave consistently, hosts do not. |

**Ask the experts**

- [ ] What exactly does "Under 3% overhead" mean in practice for container runtime anomaly detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Syscall n-gram novelty" and "Unexpected process spawn", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Container compromise dwell time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: simulated attacks lacking realism, and who can confirm the cut-off times and splits?
- [ ] How often does "Rolling deployment changes behaviour" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| EDR telemetry | Process, file, registry and network events recorded by endpoint agents. |
| Kill chain | A model of attack stages from reconnaissance to action on objectives. |
| True / false positive | A real attack correctly detected, or a harmless event wrongly flagged. |
| NIDS / IDS | Network intrusion detection system: monitors traffic for attacks and policy violations. |
| UEBA | User and entity behaviour analytics: detecting deviations from a person's or device's normal behaviour. |
| Alert correlation | Grouping related alerts into one incident so analysts see the whole story. |
| Playbook (SOAR) | A scripted sequence of response steps that a SOAR platform can run. |
| SIEM | Security information and event management: a platform that collects, correlates and searches security logs. |
| EDR | Endpoint detection and response: software on devices that records activity and can isolate a host. |
| SOAR | Security orchestration, automation and response: tools that run scripted playbooks for alerts. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Stationarity | A series whose statistical properties do not change over time. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Champion / challenger | The model in production and a candidate that must beat it before promotion. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
