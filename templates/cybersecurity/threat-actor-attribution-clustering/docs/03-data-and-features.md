# Threat Actor Attribution & Campaign Clustering: data and feature specification

> Generated from the blueprint `cybersecurity/threat-actor-attribution-clustering` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Threat Actor Attribution & Campaign Clustering · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Threat Actor Attribution & Campaign Clustering": Cluster intrusion sets and campaigns by shared infrastructure, tooling and TTPs to support attribution confidence levels. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Ground truth is analyst opinion.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Infrastructure overlap | shared IPs, certificates and registrants | Campaign link | Time-bounded |   |   |   |
| Code and tooling similarity | binary and script similarity | Toolset reuse | Library reuse |   |   |   |
| TTP sequence similarity | ATT&CK technique ordering | Behaviour | Mapping |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Evidence | Weighted overlaps of infrastructure, code and TTP | Single-indicator attribution | Single indicators are often shared or planted |
| Confidence | Graded confidence with alternative hypotheses | One-name attribution | Attribution is probabilistic and contested |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Language strings in malware | easily planted |
| Compile timestamps | forgeable |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Infrastructure overlap inputs | Detection engineering | SIEM and security data lake | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: time-bounded. |
| Code and tooling similarity inputs | Security data platform | Asset inventory (CMDB) and identity directory | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: library reuse. |
| TTP sequence similarity inputs | Identity and access team | Case and ticketing system (SOAR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: mapping. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: threat_actor_attribution_clustering_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: infrastructure_overlap, type: double, nullable: false }
    - { name: code_and_tooling_similarity, type: double, nullable: false }
    - { name: ttp_sequence_similarity, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Infrastructure overlap and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Code and tooling similarity against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Infrastructure overlap, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Elliptic Bitcoin transaction graph | https://www.kaggle.com/datasets/ellipticco/elliptic-data-set | See the dataset page; free Kaggle login | 200K Bitcoin transactions as a graph with licit and illicit labels and temporal steps | Anonymised features; labels cover only part of the graph. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE threat_actor_attribution_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE threat_actor_attribution_outputs (
  run_id TEXT NOT NULL REFERENCES threat_actor_attribution_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE threat_actor_attribution_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE threat_actor_attribution_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Threat Actor Attribution & Campaign Clustering": Cluster intrusion sets and campaigns by shared infrastructure, tooling and TTPs to support attribution confidence levels. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Threat intelligence and attribution | Analysts collect indicators and reports about attackers, extract entities from text, cluster malware families and link incidents to actors. Evidence is partial, attackers imitate each other and attribution is probabilistic. | Clustering and attribution outputs need confidence and evidence, not a single confident label. |
| The SOC workflow and its tools | Detections come from a SIEM (collects and correlates logs), EDR (monitors endpoints) and other sensors. Analysts triage the alert, investigate by querying logs and context, and escalate or close it; responders contain and remediate. SOAR tools automate fixed playbooks. Teams measure mean time to detect and respond, and the queue never empties. | The agent has to fit this process, speak its vocabulary and leave an audit trail analysts and auditors can follow. |
| Evidence and context | Decisions rest on logs (process, authentication, network, DNS), threat intelligence about addresses and files, asset criticality, and identity context such as whether a user is travelling. Logs have retention limits, clock differences and gaps, and the same behaviour can be malicious or benign depending on context, for example encoded PowerShell from a document versus from a management agent. | An agent that cannot get the deciding evidence must say so and escalate, not infer. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Infrastructure overlap | Shared IPs, certificates and registrants. Campaign link. | Leakage risk to design against: Time-bounded. |
| A signal-versus-noise trap in this use case: Evidence | The true signal is weighted overlaps of infrastructure, code and TTP; the common noise is single-indicator attribution. | Single indicators are often shared or planted. |

**Ask the experts**

- [ ] What exactly does "Evidence-based confidence statements" mean in practice for threat actor attribution & campaign clustering: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Infrastructure overlap" and "Code and tooling similarity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Analyst time saved" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: ground truth is analyst opinion, and who can confirm the cut-off times and splits?
- [ ] How often does "Shared offensive tooling across unrelated actors" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Threat actor | A person or group that carries out cyber attacks. |
| True / false positive | A real attack correctly detected, or a harmless event wrongly flagged. |
| Honeypot | A decoy system built to attract and study attackers. |
| SIEM | Security information and event management: a platform that collects, correlates and searches security logs. |
| EDR | Endpoint detection and response: software on devices that records activity and can isolate a host. |
| SOAR | Security orchestration, automation and response: tools that run scripted playbooks for alerts. |
| IOC | Indicator of compromise: an observable such as an IP address, file hash or domain linked to malicious activity. |
| TTP | Tactics, techniques and procedures: how an attacker operates, more durable than a single indicator. |
| MITRE ATT&CK | A public knowledge base of adversary tactics and techniques used to describe and label detections. |
| C2 / beaconing | Command and control traffic, often a compromised host contacting an attacker's server at regular intervals. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Community detection | Finding groups of nodes more densely connected to each other than to the rest. |
| Cluster purity | The share of a cluster that belongs to its majority true group. |
| Node / edge | The entities in a graph and the relationships between them. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| p99 latency | The time within which 99% of requests complete. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
