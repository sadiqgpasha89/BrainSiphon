# IOC Extraction & Enrichment: data and feature specification

> Generated from the blueprint `cybersecurity/ioc-extraction-and-enrichment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** IOC Extraction & Enrichment · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "IOC Extraction & Enrichment": Extract indicators of compromise and TTPs from reports and feeds, deduplicate them and score confidence for blocking and hunting. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating extraction without role context.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Indicator context window | sentence role (victim, attacker, benign) | Classification | Parsing |   |   |   |
| Multi-source corroboration | sources reporting the indicator | Confidence | Source independence |   |   |   |
| Infrastructure reputation | hosting and ASN risk | Prior | Data feeds |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Context | Distinguish malicious indicators from mentioned benign ones | Regex all IPs and domains | Reports mention many benign domains |
| Decay | Indicator confidence decays over time | Permanent blocklists | Stale indicators cause false blocks |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Report length | weak |
| Vendor logo | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Indicator context window inputs | Detection engineering | SIEM and security data lake | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: parsing. |
| Multi-source corroboration inputs | Security data platform | Asset inventory (CMDB) and identity directory | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: source independence. |
| Infrastructure reputation inputs | Identity and access team | Case and ticketing system (SOAR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: data feeds. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: ioc_extraction_and_enrichment_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: indicator_context_window, type: double, nullable: false }
    - { name: multi_source_corroboration, type: double, nullable: false }
    - { name: infrastructure_reputation, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Indicator context window and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Multi-source corroboration against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Indicator context window, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Loghub system log collection | https://github.com/logpai/loghub | Research use (see the repository) | Real log datasets from distributed systems, supercomputers and applications | Labels are sparse and system-specific. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Web Data Commons product corpus | https://webdatacommons.org/largescaleproductcorpus/ | ODC-BY (see the page) | Millions of product offers from the web with identifiers for product matching | Web-scraped and noisy. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE ioc_extraction_and_enrichment_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE ioc_extraction_and_enrichment_fields (
  document_id TEXT NOT NULL REFERENCES ioc_extraction_and_enrichment_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE ioc_extraction_and_enrichment_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "IOC Extraction & Enrichment": Extract indicators of compromise and TTPs from reports and feeds, deduplicate them and score confidence for blocking and hunting. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Evidence and context | Decisions rest on logs (process, authentication, network, DNS), threat intelligence about addresses and files, asset criticality, and identity context such as whether a user is travelling. Logs have retention limits, clock differences and gaps, and the same behaviour can be malicious or benign depending on context, for example encoded PowerShell from a document versus from a management agent. | An agent that cannot get the deciding evidence must say so and escalate, not infer. |
| ATT&CK and attacker behaviour | MITRE ATT&CK catalogues attacker tactics and techniques, such as PowerShell execution (T1059.001), valid accounts (T1078), brute force (T1110), application-layer command and control (T1071) and exfiltration over alternative protocols (T1048). Analysts reason about behaviour chains, not isolated indicators. | Use technique names so verdicts are comparable and testable, and build replay cases from real technique telemetry. |
| Software supply chain and code security | Malicious packages, leaked secrets, vulnerable code and insecure configurations enter through dependencies and developer workflows. Static analysis, package metadata and language models scan code, with the usual problem of many false positives. | A tool developers ignore protects nothing, so triage accuracy and fix guidance matter as much as detection. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Indicator context window | Sentence role (victim, attacker, benign). Classification. | Leakage risk to design against: Parsing. |
| A signal-versus-noise trap in this use case: Context | The true signal is distinguish malicious indicators from mentioned benign ones; the common noise is regex all IPs and domains. | Reports mention many benign domains. |

**Ask the experts**

- [ ] What exactly does "Defanged indicators" mean in practice for ioc extraction & enrichment: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Indicator context window" and "Multi-source corroboration", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Detections from IOCs" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating extraction without role context, and who can confirm the cut-off times and splits?
- [ ] How often does "Shared hosting IPs listed as malicious" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Indicator extraction | Pulling IPs, domains, hashes and technique names out of reports and text. |
| True / false positive | A real attack correctly detected, or a harmless event wrongly flagged. |
| Benign true positive | A correct detection of activity that is authorised, such as a scheduled scan or administrator task. |
| Attack path | A chain of weaknesses and permissions that lets an attacker move from an entry point to a valuable asset. |
| Kill chain | A model of attack stages from reconnaissance to action on objectives. |
| Model extraction | Stealing a model's behaviour by querying it many times. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
