# Fake & Bulk Account Creation Detection: data and feature specification

> Generated from the blueprint `cybersecurity/fake-account-creation-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fake & Bulk Account Creation Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Fake & Bulk Account Creation Detection": Stop automated and farmed account registrations at signup, protecting downstream trust, promos and abuse systems. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels from accounts later banned (late and biased).

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Email pattern similarity in window | edit-distance clusters of emails in 1 hour | Scripted creation | Window before signup |   |   |   |
| Device and IP signup velocity | signups per fingerprint per day | Farm | Fingerprint salt |   |   |   |
| Phone number reputation | VoIP and carrier risk | SMS farms | Vendor data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Cohort | Cluster-level signals across signups (same fingerprint, similar emails) | Individual signup scoring | Farmed accounts each look plausible alone |
| Cost | Raise attacker cost with adaptive friction | Hard blocks only | Hard blocks teach attackers quickly |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Username length | weak |
| Signup hour | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Email pattern similarity in window inputs | Detection engineering | SIEM and security data lake | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: window before signup. |
| Device and IP signup velocity inputs | Security data platform | Asset inventory (CMDB) and identity directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: fingerprint salt. |
| Phone number reputation inputs | Identity and access team | Case and ticketing system (SOAR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: vendor data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: fake_account_creation_detection_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: email_pattern_similarity_in_window, type: double, nullable: false }
    - { name: device_and_ip_signup_velocity, type: double, nullable: false }
    - { name: phone_number_reputation, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Email pattern similarity in window and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Device and IP signup velocity against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Email pattern similarity in window, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UNSW-NB15 | https://research.unsw.edu.au/projects/unsw-nb15-dataset | Research use with citation (see the page) | Network packets and flows with modern attack types and labels | Synthetic attack generation; class imbalance varies by split. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EMBER malware dataset | https://github.com/elastic/ember | AGPL-3.0 (see the repository) | 1 million Windows PE file feature vectors with benign and malicious labels and a time split | Features, not raw files; labelling cut-off artefacts. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE fake_account_creation_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  email_pattern_similarity_in_window DOUBLE PRECISION,
  device_and_ip_signup_velocity      DOUBLE PRECISION,
  phone_number_reputation            DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE fake_account_creation_decisions (
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
CREATE TABLE fake_account_creation_labels (
  decision_id    UUID        NOT NULL REFERENCES fake_account_creation_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Fake & Bulk Account Creation Detection": Stop automated and farmed account registrations at signup, protecting downstream trust, promos and abuse systems. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| ATT&CK and attacker behaviour | MITRE ATT&CK catalogues attacker tactics and techniques, such as PowerShell execution (T1059.001), valid accounts (T1078), brute force (T1110), application-layer command and control (T1071) and exfiltration over alternative protocols (T1048). Analysts reason about behaviour chains, not isolated indicators. | Use technique names so verdicts are comparable and testable, and build replay cases from real technique telemetry. |
| Email, phishing and social engineering | Phishing and business email compromise exploit people, not software: lookalike domains, urgent payment requests, impersonation. Detection combines URL and content analysis, sender reputation and relationship graphs, and voice or video deepfakes extend the problem. | The highest-cost attacks are rare and well-crafted, so evaluation weights loss amount, not email count. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Email pattern similarity in window | Edit-distance clusters of emails in 1 hour. Scripted creation. | Leakage risk to design against: Window before signup. |
| A signal-versus-noise trap in this use case: Cohort | The true signal is cluster-level signals across signups (same fingerprint, similar emails); the common noise is individual signup scoring. | Farmed accounts each look plausible alone. |

**Ask the experts**

- [ ] What exactly does "Signup decision within 50 ms" mean in practice for fake & bulk account creation detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Email pattern similarity in window" and "Device and IP signup velocity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Fake account share after 30 days" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labels from accounts later banned (late and biased), and who can confirm the cut-off times and splits?
- [ ] How often does "Marketing campaign causes real signup spikes" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Kill chain | A model of attack stages from reconnaissance to action on objectives. |
| NIDS / IDS | Network intrusion detection system: monitors traffic for attacks and policy violations. |
| Ransomware | Malware that encrypts files and demands payment for the key. |
| YARA / Sigma | Rule languages for describing malware patterns (YARA) and log-based detections (Sigma). |
| MFA / step-up | Multi-factor authentication, and asking for an extra factor only when risk is high. |
| Attack path | A chain of weaknesses and permissions that lets an attacker move from an entry point to a valuable asset. |
| Honeypot | A decoy system built to attract and study attackers. |
| Model extraction | Stealing a model's behaviour by querying it many times. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| F1 score | The harmonic mean of precision and recall. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
| Node / edge | The entities in a graph and the relationships between them. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
