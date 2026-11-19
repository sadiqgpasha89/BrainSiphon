# Privileged Access Session Anomaly Detection: data and feature specification

> Generated from the blueprint `cybersecurity/privileged-access-session-anomaly` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Privileged Access Session Anomaly Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Privileged Access Session Anomaly Detection": Monitor privileged sessions (SSH, RDP, DB consoles) for risky commands and behaviour changes and terminate or alert in real time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Lab attack sessions are too clean.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Command risk embedding | embedding of command and arguments | Risk | Tokenisation |   |   |   |
| Ticket linkage | session tied to approved ticket | Legitimacy | ITSM |   |   |   |
| Target criticality | critical server tier | Impact | CMDB |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Commands | Command semantics and sequence rather than keywords | Keyword blocklists | Attackers rename tools and chain benign commands |
| Context | Ticket and change linkage | Anomaly alone | Admins do unusual things during incidents legitimately |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Session duration | weak |
| Admin username | personal |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Command risk embedding inputs | Detection engineering | SIEM and security data lake | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: tokenisation. |
| Ticket linkage inputs | Security data platform | Asset inventory (CMDB) and identity directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: ITSM. |
| Target criticality inputs | Identity and access team | Case and ticketing system (SOAR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: CMDB. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: privileged_access_session_anomaly_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: command_risk_embedding, type: double, nullable: false }
    - { name: ticket_linkage, type: double, nullable: false }
    - { name: target_criticality, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Command risk embedding and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Ticket linkage against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Command risk embedding, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Server Machine Dataset (OmniAnomaly) | https://github.com/NetManAIOps/OmniAnomaly | MIT licence (see the repository) | Multivariate server metrics from an internet company with labelled anomalies | One company; coarse labels. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE privileged_access_session_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  command_risk_embedding             DOUBLE PRECISION,
  ticket_linkage                     DOUBLE PRECISION,
  target_criticality                 DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE privileged_access_session_decisions (
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
CREATE TABLE privileged_access_session_labels (
  decision_id    UUID        NOT NULL REFERENCES privileged_access_session_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Privileged Access Session Anomaly Detection": Monitor privileged sessions (SSH, RDP, DB consoles) for risky commands and behaviour changes and terminate or alert in real time. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Identity and access threats | Most breaches involve stolen or abused credentials: credential stuffing, account takeover, impossible travel, privilege escalation, over-permissioned cloud roles, and insiders. Detection reasons about behaviour over time and context rather than single events. | False positives hit real employees, so risk-based responses (step-up authentication) are preferred over hard blocks. |
| ATT&CK and attacker behaviour | MITRE ATT&CK catalogues attacker tactics and techniques, such as PowerShell execution (T1059.001), valid accounts (T1078), brute force (T1110), application-layer command and control (T1071) and exfiltration over alternative protocols (T1048). Analysts reason about behaviour chains, not isolated indicators. | Use technique names so verdicts are comparable and testable, and build replay cases from real technique telemetry. |
| What an alert verdict means | A true positive is a real malicious event, a false positive is a mistaken detection and a benign true positive is a correct detection of authorised activity, such as a pentest or an administrator's script. Closing an alert as benign without evidence is the most dangerous mistake, because an active attack then goes unnoticed. | Define verdicts with the SOC. Ground truth for evaluation must come from analyst conclusions backed by cited log lines, not satisfaction scores. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Command risk embedding | Embedding of command and arguments. Risk. | Leakage risk to design against: Tokenisation. |
| A signal-versus-noise trap in this use case: Commands | The true signal is command semantics and sequence rather than keywords; the common noise is keyword blocklists. | Attackers rename tools and chain benign commands. |

**Ask the experts**

- [ ] What exactly does "Real-time command analysis" mean in practice for privileged access session anomaly detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Command risk embedding" and "Ticket linkage", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Risky command terminations" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: lab attack sessions are too clean, and who can confirm the cut-off times and splits?
- [ ] How often does "Incident response changes admin behaviour dramatically" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Privilege escalation | Gaining higher access rights than intended. |
| IAM | Identity and access management: the systems that decide who can do what. |
| Least privilege | Giving a system only the access it needs, so a compromised or fooled agent can do little harm. |
| UEBA | User and entity behaviour analytics: detecting deviations from a person's or device's normal behaviour. |
| Crown jewels | The assets whose loss would most harm the organisation. |
| Kill chain | A model of attack stages from reconnaissance to action on objectives. |
| True / false positive | A real attack correctly detected, or a harmless event wrongly flagged. |
| Benign true positive | A correct detection of activity that is authorised, such as a scheduled scan or administrator task. |
| NIDS / IDS | Network intrusion detection system: monitors traffic for attacks and policy violations. |
| Ransomware | Malware that encrypts files and demands payment for the key. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Stationarity | A series whose statistical properties do not change over time. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
