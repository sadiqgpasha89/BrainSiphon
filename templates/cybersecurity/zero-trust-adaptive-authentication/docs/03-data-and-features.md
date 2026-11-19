# Zero-Trust Adaptive Authentication: data and feature specification

> Generated from the blueprint `cybersecurity/zero-trust-adaptive-authentication` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Zero-Trust Adaptive Authentication · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Zero-Trust Adaptive Authentication": Continuously score session risk and adapt authentication requirements per request using device, user and resource signals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels from confirmed incidents only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Device posture score | patch level, EDR status | Trust | Agent |   |   |   |
| Resource sensitivity | application criticality | Stakes | Catalogue |   |   |   |
| Behavioural drift in session | action sequence deviation | Hijack | Session baseline |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Continuous | Re-evaluate risk throughout the session | Login-time only | Risk changes after login |
| Policy | ML risk plus explicit policy rules | ML decides everything | Compliance needs deterministic controls |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Screen resolution | weak |
| Browser language | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Device posture score inputs | Detection engineering | SIEM and security data lake | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: agent. |
| Resource sensitivity inputs | Security data platform | Asset inventory (CMDB) and identity directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: catalogue. |
| Behavioural drift in session inputs | Identity and access team | Case and ticketing system (SOAR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: session baseline. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: zero_trust_adaptive_authentication_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: device_posture_score, type: double, nullable: false }
    - { name: resource_sensitivity, type: double, nullable: false }
    - { name: behavioural_drift_in_session, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Device posture score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Resource sensitivity against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Device posture score, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| EMBER malware dataset | https://github.com/elastic/ember | AGPL-3.0 (see the repository) | 1 million Windows PE file feature vectors with benign and malicious labels and a time split | Features, not raw files; labelling cut-off artefacts. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| LANL Comprehensive Multi-Source Cyber-Security Events | https://csr.lanl.gov/data/cyber1/ | Research release from Los Alamos National Laboratory (see the page) | 58 days of authentication, process, flow and DNS events with a red-team subset | Anonymised and very large. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IEEE-CIS Fraud Detection | https://www.kaggle.com/c/ieee-fraud-detection | Competition rules; free Kaggle login | About 590K e-commerce transactions with card, address, email-domain and device fields over six months | Columns are masked and identity is joined by a hashed key; build time-based splits. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE zero_trust_adaptive_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  device_posture_score               DOUBLE PRECISION,
  resource_sensitivity               DOUBLE PRECISION,
  behavioural_drift_in_session       DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE zero_trust_adaptive_decisions (
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
CREATE TABLE zero_trust_adaptive_labels (
  decision_id    UUID        NOT NULL REFERENCES zero_trust_adaptive_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Zero-Trust Adaptive Authentication": Continuously score session risk and adapt authentication requirements per request using device, user and resource signals. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Identity and access threats | Most breaches involve stolen or abused credentials: credential stuffing, account takeover, impossible travel, privilege escalation, over-permissioned cloud roles, and insiders. Detection reasons about behaviour over time and context rather than single events. | False positives hit real employees, so risk-based responses (step-up authentication) are preferred over hard blocks. |
| ATT&CK and attacker behaviour | MITRE ATT&CK catalogues attacker tactics and techniques, such as PowerShell execution (T1059.001), valid accounts (T1078), brute force (T1110), application-layer command and control (T1071) and exfiltration over alternative protocols (T1048). Analysts reason about behaviour chains, not isolated indicators. | Use technique names so verdicts are comparable and testable, and build replay cases from real technique telemetry. |
| Untrusted data and prompt injection | Attackers control some fields that end up in logs, such as file names, user agents, command lines and email subjects. An LLM reading them can be tricked into following instructions hidden in them. The defence is structural: least-privilege typed tools, allow-lists, approval gates for any response action, and treating all tool output as data. | A filter for suspicious phrases is only an alarm. Safety must hold even when the model is fooled. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Device posture score | Patch level, EDR status. Trust. | Leakage risk to design against: Agent. |
| A signal-versus-noise trap in this use case: Continuous | The true signal is re-evaluate risk throughout the session; the common noise is login-time only. | Risk changes after login. |

**Ask the experts**

- [ ] What exactly does "Decision under 30 ms" mean in practice for zero-trust adaptive authentication: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Device posture score" and "Resource sensitivity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Compromised sessions contained" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labels from confirmed incidents only, and who can confirm the cut-off times and splits?
- [ ] How often does "Device posture agent crashes" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| MFA / step-up | Multi-factor authentication, and asking for an extra factor only when risk is high. |
| Zero trust | A security model that verifies every request and grants least privilege rather than trusting the network. |
| SSO | Single sign-on: one login that grants access to many applications. |
| Device posture | The security state of a device, such as patch level, encryption and malware status. |
| SIEM | Security information and event management: a platform that collects, correlates and searches security logs. |
| EDR | Endpoint detection and response: software on devices that records activity and can isolate a host. |
| SOAR | Security orchestration, automation and response: tools that run scripted playbooks for alerts. |
| IOC | Indicator of compromise: an observable such as an IP address, file hash or domain linked to malicious activity. |
| TTP | Tactics, techniques and procedures: how an attacker operates, more durable than a single indicator. |
| MITRE ATT&CK | A public knowledge base of adversary tactics and techniques used to describe and label detections. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| p99 latency | The time within which 99% of requests complete. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
