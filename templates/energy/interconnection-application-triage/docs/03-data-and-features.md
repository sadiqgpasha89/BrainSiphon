# Interconnection Application Triage: data and feature specification

> Generated from the blueprint `energy/interconnection-application-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Interconnection Application Triage · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Interconnection Application Triage": Check, classify and route requests to connect solar, storage and generation so incomplete applications are fixed early and simple ones move quickly. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Priority for large applicants.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Document completeness | required forms and data present | Readiness | From the application |   |   |   |
| Technology and size | generation type and capacity | Study path | From the application |   |   |   |
| Location headroom | hosting capacity at the point | Path hint | From the hosting map |   |   |   |
| Past similar cases | outcomes of similar applications | Expected path | From history |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | The study path and outcome engineers assigned | Applicant category | Category does not decide the path |
| Fairness | Queue order by rules | Faster service for large applicants | Unfair queues breach regulation |
| Role | Triage and completeness | Approval | Engineering studies decide connection |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Applicant name | irrelevant |
| Company size | irrelevant to the path |
| Submission channel | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Document completeness inputs | Network operations | SCADA and ADMS (advanced distribution management) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the application. |
| Technology and size inputs | Asset management | Meter data management and billing (CIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the application. |
| Location headroom inputs | Retail and customer operations | Asset management and GIS | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the hosting map. |
| Past similar cases inputs | Network operations | SCADA and ADMS (advanced distribution management) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from history. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: interconnection_application_triage_inputs.v1
owner: network-operations@example.com
system_of_record: SCADA and ADMS (advanced distribution management)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: document_completeness, type: double, nullable: false }
    - { name: technology_and_size, type: double, nullable: false }
    - { name: location_headroom, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Document completeness and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Technology and size against SCADA and ADMS (advanced distribution management)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Document completeness, traces back to SCADA and ADMS (advanced distribution management); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Splunk Boss of the SOC v3 (BOTS) | https://github.com/splunk/botsv3 | Splunk dataset terms (see the repository) | A realistic corpus of security logs from a simulated attack with a question set that gives ground truth | One scenario, Splunk format. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| GH Archive | https://www.gharchive.org/ | Public event data (see the site) | Hourly public GitHub events: pushes, pull requests, issues and reviews | Public repositories only; bot noise. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE interconnection_application_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE interconnection_application_fields (
  document_id TEXT NOT NULL REFERENCES interconnection_application_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE interconnection_application_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Energy and utilities balance supply and demand second by second on physical networks that fail in the field. Weather, asset age and customer behaviour drive the data, outages carry safety and regulatory consequences, and control actions stay with licensed operators and protection systems. For this use case, "Interconnection Application Triage": Check, classify and route requests to connect solar, storage and generation so incomplete applications are fixed early and simple ones move quickly. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Field crews need practical work orders | Crew scheduling depends on location, skills, parts, access and permits. Plans that ignore these constraints fail on the day. | A model that ranks jobs without capacity and travel produces schedules nobody can run. |
| Supply and demand must balance continuously | Electricity cannot be stored cheaply at scale, so generation, storage and demand response must match load in near real time. Forecast errors are paid for in reserves, imbalance charges or curtailment. | A forecast is judged by what its error costs the operator, not only by its average error. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Document completeness | Required forms and data present. Readiness. | Leakage risk to design against: From the application. |
| A signal-versus-noise trap in this use case: Label | The true signal is the study path and outcome engineers assigned; the common noise is applicant category. | Category does not decide the path. |

**Ask the experts**

- [ ] What exactly does "Completeness check in minutes" mean in practice for interconnection application triage: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Document completeness" and "Technology and size", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to a complete application" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: priority for large applicants, and who can confirm the cut-off times and splits?
- [ ] How often does "Wrong document" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Spinning reserve | Generation capacity ready to respond quickly. |
| Capacity factor | Actual output divided by maximum possible output. |
| DERMS | Distributed energy resource management system for rooftop solar, batteries and similar assets. |
| DER | Distributed energy resources such as rooftop solar, batteries and electric vehicles. |
| Peak demand | The highest demand in a period. |
| Frequency regulation | Keeping grid frequency near its target. |
| Dispatch | Deciding which generators or batteries produce and when. |
| Battery storage | Batteries that store energy for later use. |
| State of charge | How full a battery is. |
| Meter data management | The system that stores and validates meter readings. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
