# Alert Correlation & Deduplication: data and feature specification

> Generated from the blueprint `cybersecurity/alert-correlation-and-deduplication` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Alert Correlation & Deduplication · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Alert Correlation & Deduplication": Group related alerts into incidents and deduplicate repeats, cutting analyst queue size by an order of magnitude. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Analyst groupings inconsistent.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Shared entity overlap | host, user, IP overlap | Incident link | Entity resolution |   |   |   |
| Temporal proximity | time gap | Same incident | Window |   |   |   |
| Technique adjacency | ATT&CK stage ordering | Chain | Mapping |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Entities | Group by shared entities and time with learned similarity | Exact string deduplication | Alerts differ in text but share a host and process |
| Chains | Kill-chain stage awareness | Flat grouping | Chains show escalation |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Alert ID | none |
| Vendor name | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Shared entity overlap inputs | Detection engineering | SIEM and security data lake | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: entity resolution. |
| Temporal proximity inputs | Security data platform | Asset inventory (CMDB) and identity directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: window. |
| Technique adjacency inputs | Identity and access team | Case and ticketing system (SOAR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: mapping. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: alert_correlation_and_deduplication_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: shared_entity_overlap, type: double, nullable: false }
    - { name: temporal_proximity, type: double, nullable: false }
    - { name: technique_adjacency, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Shared entity overlap and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Temporal proximity against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Shared entity overlap, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| LANL Comprehensive Multi-Source Cyber-Security Events | https://csr.lanl.gov/data/cyber1/ | Research release from Los Alamos National Laboratory (see the page) | 58 days of authentication, process, flow and DNS events with a red-team subset | Anonymised and very large. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE alert_correlation_and_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  shared_entity_overlap              DOUBLE PRECISION,
  temporal_proximity                 DOUBLE PRECISION,
  technique_adjacency                DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE alert_correlation_and_decisions (
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
CREATE TABLE alert_correlation_and_labels (
  decision_id    UUID        NOT NULL REFERENCES alert_correlation_and_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Alert Correlation & Deduplication": Group related alerts into incidents and deduplicate repeats, cutting analyst queue size by an order of magnitude. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| What an alert verdict means | A true positive is a real malicious event, a false positive is a mistaken detection and a benign true positive is a correct detection of authorised activity, such as a pentest or an administrator's script. Closing an alert as benign without evidence is the most dangerous mistake, because an active attack then goes unnoticed. | Define verdicts with the SOC. Ground truth for evaluation must come from analyst conclusions backed by cited log lines, not satisfaction scores. |
| The SOC workflow and its tools | Detections come from a SIEM (collects and correlates logs), EDR (monitors endpoints) and other sensors. Analysts triage the alert, investigate by querying logs and context, and escalate or close it; responders contain and remediate. SOAR tools automate fixed playbooks. Teams measure mean time to detect and respond, and the queue never empties. | The agent has to fit this process, speak its vocabulary and leave an audit trail analysts and auditors can follow. |
| Entity resolution and transitivity | Resolving duplicates means deciding which records refer to the same real-world entity. Because 'same as' is transitive, one wrong link can merge two large groups, so precision on links matters more than recall and clusters are monitored for abnormal size. | Weight shared attributes by their rarity and cap hubs before clustering. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Shared entity overlap | Host, user, IP overlap. Incident link. | Leakage risk to design against: Entity resolution. |
| A signal-versus-noise trap in this use case: Entities | The true signal is group by shared entities and time with learned similarity; the common noise is exact string deduplication. | Alerts differ in text but share a host and process. |

**Ask the experts**

- [ ] What exactly does "Streaming grouping within seconds" mean in practice for alert correlation & deduplication: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Shared entity overlap" and "Temporal proximity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Alerts per incident" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: analyst groupings inconsistent, and who can confirm the cut-off times and splits?
- [ ] How often does "Shared service account links unrelated alerts" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Alert correlation | Grouping related alerts into one incident so analysts see the whole story. |
| Alert fatigue | Analysts ignoring alerts because too many are false or low value. |
| Escalation | Passing a case to a more senior analyst or team because it needs deeper investigation or action. |
| SIEM | Security information and event management: a platform that collects, correlates and searches security logs. |
| EDR | Endpoint detection and response: software on devices that records activity and can isolate a host. |
| SOAR | Security orchestration, automation and response: tools that run scripted playbooks for alerts. |
| IOC | Indicator of compromise: an observable such as an IP address, file hash or domain linked to malicious activity. |
| TTP | Tactics, techniques and procedures: how an attacker operates, more durable than a single indicator. |
| MITRE ATT&CK | A public knowledge base of adversary tactics and techniques used to describe and label detections. |
| C2 / beaconing | Command and control traffic, often a compromised host contacting an attacker's server at regular intervals. |
| Blocking | Cheaply selecting candidate pairs for comparison so not all pairs are compared. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| Cluster purity | The share of a cluster that belongs to its majority true group. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
