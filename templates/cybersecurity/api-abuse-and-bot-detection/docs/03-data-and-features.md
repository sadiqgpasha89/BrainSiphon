# API Abuse & Bot Detection: data and feature specification

> Generated from the blueprint `cybersecurity/api-abuse-and-bot-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** API Abuse & Bot Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "API Abuse & Bot Detection": Detect scraping, enumeration and business-logic abuse on APIs while preserving legitimate integrations. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels only from detected bots.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Endpoint sequence entropy | entropy of API-call sequences | Automation | Session windows |   |   |   |
| Request timing regularity | variance of inter-request times | Scripted | Window |   |   |   |
| Enumeration pattern | sequential ID access | Scraping | Pattern |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Behaviour | Sequence and rate patterns per API key and fingerprint | Per-IP rate limits | Botnets rotate IPs |
| Business logic | Endpoint-flow anomalies (skipping steps) | Volume only | Logic abuse has normal volume |

## Features to drop

| Feature | Why it is noise |
|---|---|
| IP address alone | rotates |
| User-agent | spoofed |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Endpoint sequence entropy inputs | Detection engineering | SIEM and security data lake | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: session windows. |
| Request timing regularity inputs | Security data platform | Asset inventory (CMDB) and identity directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: window. |
| Enumeration pattern inputs | Identity and access team | Case and ticketing system (SOAR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: pattern. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: api_abuse_and_bot_detection_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: endpoint_sequence_entropy, type: double, nullable: false }
    - { name: request_timing_regularity, type: double, nullable: false }
    - { name: enumeration_pattern, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Endpoint sequence entropy and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Request timing regularity against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Endpoint sequence entropy, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| TalkingData AdTracking Fraud Detection | https://www.kaggle.com/c/talkingdata-adtracking-fraud-detection | Competition rules; free Kaggle login | 200 million mobile ad clicks with an app-download label to detect click fraud | Anonymised and from one platform. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UNSW-NB15 | https://research.unsw.edu.au/projects/unsw-nb15-dataset | Research use with citation (see the page) | Network packets and flows with modern attack types and labels | Synthetic attack generation; class imbalance varies by split. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE api_abuse_and_bot_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  endpoint_sequence_entropy          DOUBLE PRECISION,
  request_timing_regularity          DOUBLE PRECISION,
  enumeration_pattern                DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE api_abuse_and_bot_detection_decisions (
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
CREATE TABLE api_abuse_and_bot_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES api_abuse_and_bot_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "API Abuse & Bot Detection": Detect scraping, enumeration and business-logic abuse on APIs while preserving legitimate integrations. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| ATT&CK and attacker behaviour | MITRE ATT&CK catalogues attacker tactics and techniques, such as PowerShell execution (T1059.001), valid accounts (T1078), brute force (T1110), application-layer command and control (T1071) and exfiltration over alternative protocols (T1048). Analysts reason about behaviour chains, not isolated indicators. | Use technique names so verdicts are comparable and testable, and build replay cases from real technique telemetry. |
| Identity and access threats | Most breaches involve stolen or abused credentials: credential stuffing, account takeover, impossible travel, privilege escalation, over-permissioned cloud roles, and insiders. Detection reasons about behaviour over time and context rather than single events. | False positives hit real employees, so risk-based responses (step-up authentication) are preferred over hard blocks. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Endpoint sequence entropy | Entropy of API-call sequences. Automation. | Leakage risk to design against: Session windows. |
| A signal-versus-noise trap in this use case: Behaviour | The true signal is sequence and rate patterns per API key and fingerprint; the common noise is per-IP rate limits. | Botnets rotate IPs. |

**Ask the experts**

- [ ] What exactly does "Sub-20 ms decisions" mean in practice for api abuse & bot detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Endpoint sequence entropy" and "Request timing regularity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Scraped records per day" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labels only from detected bots, and who can confirm the cut-off times and splits?
- [ ] How often does "Large legitimate partner bursts" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Credential stuffing | Trying username and password pairs leaked elsewhere against many sites. |
| Model extraction | Stealing a model's behaviour by querying it many times. |
| Ransomware | Malware that encrypts files and demands payment for the key. |
| Kill chain | A model of attack stages from reconnaissance to action on objectives. |
| NIDS / IDS | Network intrusion detection system: monitors traffic for attacks and policy violations. |
| YARA / Sigma | Rule languages for describing malware patterns (YARA) and log-based detections (Sigma). |
| MFA / step-up | Multi-factor authentication, and asking for an extra factor only when risk is high. |
| Zero trust | A security model that verifies every request and grants least privilege rather than trusting the network. |
| Honeypot | A decoy system built to attract and study attackers. |
| Playbook (SOAR) | A scripted sequence of response steps that a SOAR platform can run. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Lag feature | A past value of the series used as a predictor. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
