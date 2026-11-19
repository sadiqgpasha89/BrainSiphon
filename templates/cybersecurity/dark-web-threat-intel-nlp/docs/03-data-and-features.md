# Dark-Web & Underground Threat Intelligence: data and feature specification

> Generated from the blueprint `cybersecurity/dark-web-threat-intel-nlp` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dark-Web & Underground Threat Intelligence · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Dark-Web & Underground Threat Intelligence": Mine forums, marketplaces and chat channels for credential leaks, access sales and planned attacks relevant to the organisation. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Gold data from sanitised English posts.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Entity match with confidence | company, domain and employee matches | Relevance | Entity linking |   |   |   |
| Actor reputation | past verified claims | Credibility | Actor graph |   |   |   |
| Leak freshness and uniqueness | novelty vs known dumps | Value | Dedup |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Relevance | Entity-linked relevance to the company, vendors and executives | Keyword alerts on brand name | Brand keywords produce huge noise |
| Reliability | Source and actor credibility scoring | Equal trust in all posts | Many posts are scams or fake leaks |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Post length | weak |
| Forum popularity | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Entity match with confidence inputs | Detection engineering | SIEM and security data lake | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: entity linking. |
| Actor reputation inputs | Security data platform | Asset inventory (CMDB) and identity directory | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: actor graph. |
| Leak freshness and uniqueness inputs | Identity and access team | Case and ticketing system (SOAR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: dedup. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: dark_web_threat_intel_nlp_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: entity_match_with_confidence, type: double, nullable: false }
    - { name: actor_reputation, type: double, nullable: false }
    - { name: leak_freshness_and_uniqueness, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Entity match with confidence and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Actor reputation against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Entity match with confidence, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Loghub system log collection | https://github.com/logpai/loghub | Research use (see the repository) | Real log datasets from distributed systems, supercomputers and applications | Labels are sparse and system-specific. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE dark_web_threat_intel_nlp_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE dark_web_threat_intel_nlp_outputs (
  run_id TEXT NOT NULL REFERENCES dark_web_threat_intel_nlp_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE dark_web_threat_intel_nlp_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE dark_web_threat_intel_nlp_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Dark-Web & Underground Threat Intelligence": Mine forums, marketplaces and chat channels for credential leaks, access sales and planned attacks relevant to the organisation. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Threat intelligence and attribution | Analysts collect indicators and reports about attackers, extract entities from text, cluster malware families and link incidents to actors. Evidence is partial, attackers imitate each other and attribution is probabilistic. | Clustering and attribution outputs need confidence and evidence, not a single confident label. |
| What an alert verdict means | A true positive is a real malicious event, a false positive is a mistaken detection and a benign true positive is a correct detection of authorised activity, such as a pentest or an administrator's script. Closing an alert as benign without evidence is the most dangerous mistake, because an active attack then goes unnoticed. | Define verdicts with the SOC. Ground truth for evaluation must come from analyst conclusions backed by cited log lines, not satisfaction scores. |
| The SOC workflow and its tools | Detections come from a SIEM (collects and correlates logs), EDR (monitors endpoints) and other sensors. Analysts triage the alert, investigate by querying logs and context, and escalate or close it; responders contain and remediate. SOAR tools automate fixed playbooks. Teams measure mean time to detect and respond, and the queue never empties. | The agent has to fit this process, speak its vocabulary and leave an audit trail analysts and auditors can follow. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Entity match with confidence | Company, domain and employee matches. Relevance. | Leakage risk to design against: Entity linking. |
| A signal-versus-noise trap in this use case: Relevance | The true signal is entity-linked relevance to the company, vendors and executives; the common noise is keyword alerts on brand name. | Brand keywords produce huge noise. |

**Ask the experts**

- [ ] What exactly does "Legal and ethical collection" mean in practice for dark-web & underground threat intelligence: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Entity match with confidence" and "Actor reputation", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time from leak post to action" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: gold data from sanitised English posts, and who can confirm the cut-off times and splits?
- [ ] How often does "Slang and code words evolve" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Indicator extraction | Pulling IPs, domains, hashes and technique names out of reports and text. |
| Threat intelligence | Information about attackers, infrastructure and tools, including reputation of addresses and domains. |
| Honeypot | A decoy system built to attract and study attackers. |
| True / false positive | A real attack correctly detected, or a harmless event wrongly flagged. |
| Escalation | Passing a case to a more senior analyst or team because it needs deeper investigation or action. |
| Credential stuffing / brute force | Trying many passwords or leaked credential pairs against accounts until one works. |
| SIEM | Security information and event management: a platform that collects, correlates and searches security logs. |
| EDR | Endpoint detection and response: software on devices that records activity and can isolate a host. |
| SOAR | Security orchestration, automation and response: tools that run scripted playbooks for alerts. |
| IOC | Indicator of compromise: an observable such as an IP address, file hash or domain linked to malicious activity. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Blocking | Cheaply selecting candidate pairs for comparison so not all pairs are compared. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| Node / edge | The entities in a graph and the relationships between them. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
