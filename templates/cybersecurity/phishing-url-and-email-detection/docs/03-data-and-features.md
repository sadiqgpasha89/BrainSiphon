# Phishing URL & Email Detection: data and feature specification

> Generated from the blueprint `cybersecurity/phishing-url-and-email-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Phishing URL & Email Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Phishing URL & Email Detection": Block phishing emails and links at delivery and click time, catching novel campaigns before blocklists update. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on old campaigns.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Domain age and registration pattern | days since registration, registrar risk | Newly registered domains | WHOIS timing |   |   |   |
| Brand impersonation score | visual and text similarity to known brands | Lookalike pages | Brand corpus |   |   |   |
| Sender-recipient relationship graph | prior interaction between sender and recipient | Unfamiliar senders | Graph as-of |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Novelty | Features from page, domain age and infrastructure | URL blocklists | Phishing domains live for hours, lists lag |
| Click-time | Re-scan links at click time | Scan at delivery only | Attackers weaponise links after delivery |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Email subject length | weak |
| Number of recipients | confounded with newsletters |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Domain age and registration pattern inputs | Detection engineering | SIEM and security data lake | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: WHOIS timing. |
| Brand impersonation score inputs | Security data platform | Email gateway and mail-flow configuration | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: brand corpus. |
| Sender-recipient relationship graph inputs | Identity and access team | Case and ticketing system (SOAR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: graph as-of. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: phishing_url_and_email_detection_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: domain_age_and_registration_pattern, type: double, nullable: false }
    - { name: brand_impersonation_score, type: double, nullable: false }
    - { name: sender_recipient_relationship_graph, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Domain age and registration pattern and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Brand impersonation score against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Domain age and registration pattern, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCI Phishing Websites | https://archive.ics.uci.edu/dataset/327/phishing+websites | CC BY 4.0 (see the UCI page) | 11,000 websites with URL and page features and a phishing label | Static features from one period; attackers adapt. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Enron email dataset | https://www.cs.cmu.edu/~enron/ | Public release (see the page) | About 500,000 emails from 150 users | Old corporate email; legal and privacy sensitivities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE phishing_url_and_email_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  domain_age_and_registration_pattern DOUBLE PRECISION,
  brand_impersonation_score          DOUBLE PRECISION,
  sender_recipient_relationship_graph DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE phishing_url_and_email_decisions (
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
CREATE TABLE phishing_url_and_email_labels (
  decision_id    UUID        NOT NULL REFERENCES phishing_url_and_email_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Phishing URL & Email Detection": Block phishing emails and links at delivery and click time, catching novel campaigns before blocklists update. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Email, phishing and social engineering | Phishing and business email compromise exploit people, not software: lookalike domains, urgent payment requests, impersonation. Detection combines URL and content analysis, sender reputation and relationship graphs, and voice or video deepfakes extend the problem. | The highest-cost attacks are rare and well-crafted, so evaluation weights loss amount, not email count. |
| The SOC workflow and its tools | Detections come from a SIEM (collects and correlates logs), EDR (monitors endpoints) and other sensors. Analysts triage the alert, investigate by querying logs and context, and escalate or close it; responders contain and remediate. SOAR tools automate fixed playbooks. Teams measure mean time to detect and respond, and the queue never empties. | The agent has to fit this process, speak its vocabulary and leave an audit trail analysts and auditors can follow. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Domain age and registration pattern | Days since registration, registrar risk. Newly registered domains. | Leakage risk to design against: WHOIS timing. |
| A signal-versus-noise trap in this use case: Novelty | The true signal is features from page, domain age and infrastructure; the common noise is uRL blocklists. | Phishing domains live for hours, lists lag. |

**Ask the experts**

- [ ] What exactly does "Delivery latency under 100 ms" mean in practice for phishing url & email detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Domain age and registration pattern" and "Brand impersonation score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Phish delivered per 1M" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on old campaigns, and who can confirm the cut-off times and splits?
- [ ] How often does "Legitimate marketing mail from a new domain" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Lookalike domain | A domain that resembles a trusted one, such as a swapped or added character. |
| BEC | Business email compromise: fraud in which attackers impersonate executives or suppliers to redirect payments. |
| Kill chain | A model of attack stages from reconnaissance to action on objectives. |
| True / false positive | A real attack correctly detected, or a harmless event wrongly flagged. |
| Benign true positive | A correct detection of activity that is authorised, such as a scheduled scan or administrator task. |
| NIDS / IDS | Network intrusion detection system: monitors traffic for attacks and policy violations. |
| Ransomware | Malware that encrypts files and demands payment for the key. |
| Sandbox / detonation | Running a suspicious file in an isolated environment to observe what it does. |
| YARA / Sigma | Rule languages for describing malware patterns (YARA) and log-based detections (Sigma). |
| Attack path | A chain of weaknesses and permissions that lets an attacker move from an entry point to a valuable asset. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
