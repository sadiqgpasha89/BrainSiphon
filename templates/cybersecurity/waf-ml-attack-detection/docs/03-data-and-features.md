# ML Web Application Firewall: data and feature specification

> Generated from the blueprint `cybersecurity/waf-ml-attack-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** ML Web Application Firewall · **Domain:** cybersecurity · **Latency tier:** sub-10ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "ML Web Application Firewall": Detect injection, XSS and logic attacks in HTTP requests inline with very low latency and very few false positives. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on attack toolkits only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Normalised payload token features | token n-grams after decoding | Attack syntax | Decoder coverage |   |   |   |
| Parameter type anomaly | value deviates from learned type | Injection | Per-endpoint stats |   |   |   |
| Request-rate and sequence context | rapid probing pattern | Scanning | Window |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Context | Per-endpoint behavioural baselines | Global signatures | Applications differ in legitimate payloads |
| Decoding | Normalise encodings before classification | Raw string models | Attackers hide payloads in nested encodings |

## Features to drop

| Feature | Why it is noise |
|---|---|
| User-agent | spoofable |
| Header order alone | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Normalised payload token features inputs | Detection engineering | SIEM and security data lake | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: decoder coverage. |
| Parameter type anomaly inputs | Security data platform | Asset inventory (CMDB) and identity directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: per-endpoint stats. |
| Request-rate and sequence context inputs | Identity and access team | Case and ticketing system (SOAR) | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: window. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: waf_ml_attack_detection_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: normalised_payload_token_features, type: double, nullable: false }
    - { name: parameter_type_anomaly, type: double, nullable: false }
    - { name: request_rate_and_sequence_context, type: double, nullable: false }
sla:
  freshness_p95: 5 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Normalised payload token features and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Parameter type anomaly against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 5 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Normalised payload token features, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCI Phishing Websites | https://archive.ics.uci.edu/dataset/327/phishing+websites | CC BY 4.0 (see the UCI page) | 11,000 websites with URL and page features and a phishing label | Static features from one period; attackers adapt. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Loghub system log collection | https://github.com/logpai/loghub | Research use (see the repository) | Real log datasets from distributed systems, supercomputers and applications | Labels are sparse and system-specific. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE waf_ml_attack_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  normalised_payload_token_features  DOUBLE PRECISION,
  parameter_type_anomaly             DOUBLE PRECISION,
  request_rate_and_sequence_context  DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE waf_ml_attack_detection_decisions (
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
CREATE TABLE waf_ml_attack_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES waf_ml_attack_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "ML Web Application Firewall": Detect injection, XSS and logic attacks in HTTP requests inline with very low latency and very few false positives. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| ATT&CK and attacker behaviour | MITRE ATT&CK catalogues attacker tactics and techniques, such as PowerShell execution (T1059.001), valid accounts (T1078), brute force (T1110), application-layer command and control (T1071) and exfiltration over alternative protocols (T1048). Analysts reason about behaviour chains, not isolated indicators. | Use technique names so verdicts are comparable and testable, and build replay cases from real technique telemetry. |
| Evidence and context | Decisions rest on logs (process, authentication, network, DNS), threat intelligence about addresses and files, asset criticality, and identity context such as whether a user is travelling. Logs have retention limits, clock differences and gaps, and the same behaviour can be malicious or benign depending on context, for example encoded PowerShell from a document versus from a management agent. | An agent that cannot get the deciding evidence must say so and escalate, not infer. |
| Untrusted data and prompt injection | Attackers control some fields that end up in logs, such as file names, user agents, command lines and email subjects. An LLM reading them can be tricked into following instructions hidden in them. The defence is structural: least-privilege typed tools, allow-lists, approval gates for any response action, and treating all tool output as data. | A filter for suspicious phrases is only an alarm. Safety must hold even when the model is fooled. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Normalised payload token features | Token n-grams after decoding. Attack syntax. | Leakage risk to design against: Decoder coverage. |
| A signal-versus-noise trap in this use case: Context | The true signal is per-endpoint behavioural baselines; the common noise is global signatures. | Applications differ in legitimate payloads. |

**Ask the experts**

- [ ] What exactly does "Under 1 ms inline" mean in practice for ml web application firewall: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Normalised payload token features" and "Parameter type anomaly", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Blocked attack requests" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on attack toolkits only, and who can confirm the cut-off times and splits?
- [ ] How often does "New app release changes parameter formats" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| True / false positive | A real attack correctly detected, or a harmless event wrongly flagged. |
| Kill chain | A model of attack stages from reconnaissance to action on objectives. |
| Benign true positive | A correct detection of activity that is authorised, such as a scheduled scan or administrator task. |
| Prompt injection | Text planted in data that an LLM reads which tries to make it follow the attacker's instructions. |
| Ransomware | Malware that encrypts files and demands payment for the key. |
| SIEM | Security information and event management: a platform that collects, correlates and searches security logs. |
| EDR | Endpoint detection and response: software on devices that records activity and can isolate a host. |
| SOAR | Security orchestration, automation and response: tools that run scripted playbooks for alerts. |
| IOC | Indicator of compromise: an observable such as an IP address, file hash or domain linked to malicious activity. |
| TTP | Tactics, techniques and procedures: how an attacker operates, more durable than a single indicator. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
