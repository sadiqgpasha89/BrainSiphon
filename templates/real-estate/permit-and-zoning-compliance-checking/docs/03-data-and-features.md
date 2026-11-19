# Permit & Zoning Compliance Checking: data and feature specification

> Generated from the blueprint `real-estate/permit-and-zoning-compliance-checking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Permit & Zoning Compliance Checking · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Permit & Zoning Compliance Checking": Check building plans and applications against zoning and code rules and give applicants and officers cited findings. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Easy applications are over-represented in the data, so unusual cases fail in use.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Rule check accuracy | share of rule checks that match an expert's verdict on a labelled set | The core quality measure | Rules interact, so test combinations |   |   |   |
| Citation validity | share of findings whose cited section supports the finding | Trust depends on correct citations | A real section can still be the wrong one, so check support |   |   |   |
| Measurement extraction | accuracy of dimensions, areas and heights read from the plans | Inputs to the rule checks | Scales and units vary, so validate against stated figures |   |   |   |
| Exception flag | whether a variance or special permission is requested | Routes cases to the officer | Judgement-based, so measure agreement with officers |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Rules | Rules encoded as structured, testable checks | Free-text summaries of the code | A structured check can be audited and tested, while a summary hides how a conclusion was reached |
| Version | The code version in force on the application date | The latest code | A later amendment does not apply to an earlier application, and applying it gives the wrong result |
| Judgement | The officer decides on discretionary and ambiguous cases | Automated decisions | Authority rests with the officer, and an automated decision has no legal standing |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Applicant name | Does not affect whether a plan complies |
| Format | The file format of the application, which has no bearing on compliance |
| Length | A long application is not more or less compliant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Rule check accuracy inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: rules interact, so test combinations. |
| Citation validity inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: A real section can still be the wrong one, so check support. |
| Measurement extraction inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: scales and units vary, so validate against stated figures. |
| Exception flag inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: judgement-based, so measure agreement with officers. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: permit_and_zoning_compliance_checking_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: rule_check_accuracy, type: double, nullable: false }
    - { name: citation_validity, type: double, nullable: false }
    - { name: measurement_extraction, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Rule check accuracy and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Citation validity against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Rule check accuracy, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| IBM Project CodeNet | https://github.com/IBM/Project_CodeNet | CDLA-Permissive 2.0 (see the repository) | 14 million code submissions across 55 languages with problem and verdict metadata | Competitive-programming style, not course assignments. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE permit_and_zoning_compliance_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE permit_and_zoning_compliance_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES permit_and_zoning_compliance_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON permit_and_zoning_compliance_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE permit_and_zoning_compliance_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Permit & Zoning Compliance Checking": Check building plans and applications against zoning and code rules and give applicants and officers cited findings. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Construction: cost, schedule and site safety | A project moves from design to tender, build and handover, with cost estimates at each stage, a critical path of tasks and a site where safety is the first duty. Overruns come from scope changes, late materials, weather and productivity, and are seen in earned-value indicators. | Early estimates are ranges, not points, and anything that touches site workers needs privacy and union considerations. |
| Buildings as systems: HVAC, energy and sensors | Buildings run on heating, ventilation and air-conditioning plants controlled by a building management system with sensors for temperature, CO2, occupancy and energy. Comfort, cost and carbon are traded off, and equipment ages and fails in patterns visible in sensor data. | Control models must stay inside comfort and safety limits and fall back to the schedule when sensors fail. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Rule check accuracy | Share of rule checks that match an expert's verdict on a labelled set. The core quality measure. | Leakage risk to design against: Rules interact, so test combinations. |
| A signal-versus-noise trap in this use case: Rules | The true signal is rules encoded as structured, testable checks; the common noise is free-text summaries of the code. | A structured check can be audited and tested, while a summary hides how a conclusion was reached. |

**Ask the experts**

- [ ] What exactly does "Findings are based on the official code text and nothing else" mean in practice for permit & zoning compliance checking: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Rule check accuracy" and "Citation validity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Review time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: easy applications are over-represented in the data, so unusual cases fail in use, and who can confirm the cut-off times and splits?
- [ ] How often does "Ambiguous code" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Zoning | Local rules that limit how land can be used and built on, such as height, density and use. |
| Permit | Official approval to build, alter or occupy a structure. |
| Take-off | Measuring quantities from drawings to estimate materials and cost. |
| Appraisal | A professional opinion of a property's market value, usually required by a lender. |
| Days on market | The number of days a listing takes to go under contract. |
| MLS | Multiple listing service: a shared database of properties for sale among agents in a region. |
| CMMS | Computerised maintenance management system: software that tracks work orders and equipment maintenance. |
| BMS | Building management system: the control system that runs heating, cooling, lighting and sensors in a building. |
| EUI | Energy use intensity: energy used per unit of floor area per year. |
| Change order | A formal change to the construction contract scope, price or schedule. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Structured output | Constraining a model to produce valid JSON or SQL against a schema. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
