# Phishing Email Detection: data and feature specification

> Generated from the blueprint `it-ops/phishing-email-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Phishing Email Detection · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Phishing Email Detection": Detect phishing and business email compromise in inbound mail from content, sender behaviour and link analysis, quarantining high-confidence cases and reporting the rest to the security team. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Spam score as phishing label.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Link and domain reputation | age and reputation of destinations | Core | From threat feeds |   |   |   |
| Sender behaviour | first contact and display name mismatch | Core | From mail logs |   |   |   |
| Language and intent cues | urgency and payment requests | Support | From NLP |   |   |   |
| Authentication results | SPF, DKIM and DMARC outcomes | Support | From headers |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Reported and confirmed phishing | Spam filter scores | Spam is not phishing |
| Cost | A missed phish is costly and a false block is recoverable | Equal weights | The costs differ |
| Privacy | Content analysed in the scanner with limited retention | Content in analyst tools by default | Mail contains personal data |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Recipient name | personal data |
| Message id | an identifier |
| Mail client | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Link and domain reputation inputs | Infrastructure and operations | IT service management platform | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from threat feeds. |
| Sender behaviour inputs | Service management | Configuration management database | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from mail logs. |
| Language and intent cues inputs | Security operations | Monitoring, logging and cloud billing platforms | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from NLP. |
| Authentication results inputs | Infrastructure and operations | IT service management platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from headers. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: phishing_email_detection_inputs.v1
owner: infrastructure-and-operations@example.com
system_of_record: IT service management platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: link_and_domain_reputation, type: double, nullable: false }
    - { name: sender_behaviour, type: double, nullable: false }
    - { name: language_and_intent_cues, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Link and domain reputation and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Sender behaviour against IT service management platform
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Link and domain reputation, traces back to IT service management platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCI Phishing Websites | https://archive.ics.uci.edu/dataset/327/phishing+websites | CC BY 4.0 (see the UCI page) | 11,000 websites with URL and page features and a phishing label | Static features from one period; attackers adapt. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Enron email dataset | https://www.cs.cmu.edu/~enron/ | Public release (see the page) | About 500,000 emails from 150 users | Old corporate email; legal and privacy sensitivities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE phishing_email_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  link_and_domain_reputation         DOUBLE PRECISION,
  sender_behaviour                   DOUBLE PRECISION,
  language_and_intent_cues           DOUBLE PRECISION,
  authentication_results             DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE phishing_email_detection_decisions (
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
CREATE TABLE phishing_email_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES phishing_email_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

IT operations keeps services running and people productive across data centres, clouds, networks and devices. Data arrives as huge volumes of metrics, logs, alerts and tickets, most of it noise, and changes made to production by automation must be controlled as carefully as changes made by people. For this use case, "Phishing Email Detection": Detect phishing and business email compromise in inbound mail from content, sender behaviour and link analysis, quarantining high-confidence cases and reporting the rest to the security team. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Security operations is a triage problem | Security tools raise far more alerts than analysts can read. Context from identity, endpoint and network data decides which alerts matter, and containment is a human decision. | Automatic containment on a wrong alert can stop the business. |
| Incidents are solved from evidence | Responders compare metrics, logs, traces and recent changes to find the cause. Many incidents follow a change, so change records are strong evidence. | A diagnosis that does not cite its evidence cannot be tested by the commander. |
| Service desks resolve repeat requests | Most tickets are password resets, access requests, device problems and how-to questions with known answers. Good knowledge and automation deflect them while keeping humans for complex cases. | Closing a chat without solving the problem looks like success in the numbers and fails the employee. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Link and domain reputation | Age and reputation of destinations. Core. | Leakage risk to design against: From threat feeds. |
| A signal-versus-noise trap in this use case: Label | The true signal is reported and confirmed phishing; the common noise is spam filter scores. | Spam is not phishing. |

**Ask the experts**

- [ ] What exactly does "Quarantine only at high confidence with user release" mean in practice for phishing email detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Link and domain reputation" and "Sender behaviour", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Phishing reaching inboxes" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: spam score as phishing label, and who can confirm the cut-off times and splits?
- [ ] How often does "Compromised trusted sender" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Phishing | Fraudulent messages that trick people into giving access. |
| Change request | A proposal to change a production system. |
| MTTD | Mean time to detect a problem. |
| Telemetry | Data sent from systems about their state. |
| Tagging | Labels on resources used to assign cost and owners. |
| Privileged access | Powerful accounts that can change systems. |
| Recertification | Periodic review of who should keep access. |
| SIEM | Security information and event management: a system that collects security events. |
| SOC | Security operations centre: the team that monitors security events. |
| EDR | Endpoint detection and response software. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| Node / edge | The entities in a graph and the relationships between them. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Personalised PageRank | PageRank that restarts from chosen seed nodes, used to spread risk from known bad nodes. |
