# Business Email Compromise Detection: data and feature specification

> Generated from the blueprint `cybersecurity/business-email-compromise-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Business Email Compromise Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Business Email Compromise Detection": Detect payment-redirect and executive-impersonation emails that contain no malware or links, using relationship and intent signals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Few labelled positives from known incidents.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| First-contact flag with finance role | sender never emailed this recipient | Impersonation | Graph snapshot |   |   |   |
| Display-name vs address mismatch | name of an exec with external address | Spoofing | Directory |   |   |   |
| Payment-change intent score | NLP intent classifier | Payload | Calibration |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Context | Sender-recipient history and communication graph | Content-only classifiers | BEC mails are well-written and benign-looking |
| Intent | Detect intent (payment change, urgency) with LLM features | Link and attachment scanning | There is no malicious payload to find |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Message length | weak |
| Time of day | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| First-contact flag with finance role inputs | Detection engineering | SIEM and security data lake | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: graph snapshot. |
| Display-name vs address mismatch inputs | Security data platform | Asset inventory (CMDB) and identity directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: directory. |
| Payment-change intent score inputs | Identity and access team | Case and ticketing system (SOAR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: calibration. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: business_email_compromise_detection_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: first_contact_flag_with_finance_role, type: double, nullable: false }
    - { name: display_name_vs_address_mismatch, type: double, nullable: false }
    - { name: payment_change_intent_score, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on First-contact flag with finance role and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Display-name vs address mismatch against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as First-contact flag with finance role, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Enron email dataset | https://www.cs.cmu.edu/~enron/ | Public release (see the page) | About 500,000 emails from 150 users | Old corporate email; legal and privacy sensitivities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Phishing Websites | https://archive.ics.uci.edu/dataset/327/phishing+websites | CC BY 4.0 (see the UCI page) | 11,000 websites with URL and page features and a phishing label | Static features from one period; attackers adapt. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE business_email_compromise_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  first_contact_flag_with_finance_role DOUBLE PRECISION,
  display_name_vs_address_mismatch   DOUBLE PRECISION,
  payment_change_intent_score        DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE business_email_compromise_decisions (
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
CREATE TABLE business_email_compromise_labels (
  decision_id    UUID        NOT NULL REFERENCES business_email_compromise_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Business Email Compromise Detection": Detect payment-redirect and executive-impersonation emails that contain no malware or links, using relationship and intent signals. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Email, phishing and social engineering | Phishing and business email compromise exploit people, not software: lookalike domains, urgent payment requests, impersonation. Detection combines URL and content analysis, sender reputation and relationship graphs, and voice or video deepfakes extend the problem. | The highest-cost attacks are rare and well-crafted, so evaluation weights loss amount, not email count. |
| Evidence and context | Decisions rest on logs (process, authentication, network, DNS), threat intelligence about addresses and files, asset criticality, and identity context such as whether a user is travelling. Logs have retention limits, clock differences and gaps, and the same behaviour can be malicious or benign depending on context, for example encoded PowerShell from a document versus from a management agent. | An agent that cannot get the deciding evidence must say so and escalate, not infer. |
| ATT&CK and attacker behaviour | MITRE ATT&CK catalogues attacker tactics and techniques, such as PowerShell execution (T1059.001), valid accounts (T1078), brute force (T1110), application-layer command and control (T1071) and exfiltration over alternative protocols (T1048). Analysts reason about behaviour chains, not isolated indicators. | Use technique names so verdicts are comparable and testable, and build replay cases from real technique telemetry. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: First-contact flag with finance role | Sender never emailed this recipient. Impersonation. | Leakage risk to design against: Graph snapshot. |
| A signal-versus-noise trap in this use case: Context | The true signal is sender-recipient history and communication graph; the common noise is content-only classifiers. | BEC mails are well-written and benign-looking. |

**Ask the experts**

- [ ] What exactly does "Very few positives" mean in practice for business email compromise detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "First-contact flag with finance role" and "Display-name vs address mismatch", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Dollar loss from BEC" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: few labelled positives from known incidents, and who can confirm the cut-off times and splits?
- [ ] How often does "Compromised real vendor account sends the fraud email" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| BEC | Business email compromise: fraud in which attackers impersonate executives or suppliers to redirect payments. |
| Sandbox / detonation | Running a suspicious file in an isolated environment to observe what it does. |
| True / false positive | A real attack correctly detected, or a harmless event wrongly flagged. |
| Benign true positive | A correct detection of activity that is authorised, such as a scheduled scan or administrator task. |
| YARA / Sigma | Rule languages for describing malware patterns (YARA) and log-based detections (Sigma). |
| Kill chain | A model of attack stages from reconnaissance to action on objectives. |
| Impossible travel | Logins for one account from places too far apart to travel between in the elapsed time. |
| NIDS / IDS | Network intrusion detection system: monitors traffic for attacks and policy violations. |
| Ransomware | Malware that encrypts files and demands payment for the key. |
| Attack path | A chain of weaknesses and permissions that lets an attacker move from an entry point to a valuable asset. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| Heterogeneous graph | A graph with several kinds of nodes and edges, such as users, devices and merchants. |
| Node / edge | The entities in a graph and the relationships between them. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
