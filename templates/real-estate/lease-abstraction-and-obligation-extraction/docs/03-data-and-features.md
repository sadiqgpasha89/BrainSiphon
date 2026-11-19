# Lease Abstraction & Obligation Extraction: data and feature specification

> Generated from the blueprint `real-estate/lease-abstraction-and-obligation-extraction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Lease Abstraction & Obligation Extraction · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Lease Abstraction & Obligation Extraction": Read commercial leases and amendments and extract the dates, rents, options, break clauses and obligations into a structured abstract with page citations. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluation on clean, modern leases hides failures on the old scans that dominate real portfolios.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Field confidence | calibrated probability that the extracted value is correct, per field type | Routes uncertain fields to a reviewer | Calibrate by field type, as dates and amounts behave differently |   |   |   |
| Cross-document consistency | difference between the rent in the abstract and the rent in the rent roll | Mismatches expose extraction or rent roll errors | The rent roll itself contains errors, so treat a mismatch as a question and not a verdict |   |   |   |
| Clause type classifier | predicted clause class for each paragraph, such as rent review, break option or repair | Gives structure for field extraction | Clause wording varies between firms and jurisdictions, so test per template |   |   |   |
| Amendment ordering | date order and reference chain linking each amendment to what it changes | Determines which terms are current | Missing pages and undated amendments break the chain and must be flagged |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Amendments | The effective terms after every amendment and side letter is applied | The original lease read alone | The rent in force may be set by the third amendment, and the original shows a figure that stopped applying years ago |
| Dates | Each date extracted with its trigger, such as notice of a break or a rent review | Any date that appears in the text | Missing a break notice date can cost a year of rent, and a date without its trigger is unusable |
| Scope | Fields that drive money and risk, such as rent, term, options and obligations | Every clause in the lease | Wide extraction multiplies review effort and buries the few fields that matter |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Law firm footer | Boilerplate that repeats on every page and is not part of any term |
| Page numbers | Layout artefacts that are not content and cause false matches |
| Defined-term capitalisation | A drafting style that varies by firm and does not change the meaning |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Field confidence inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: calibrate by field type, as dates and amounts behave differently. |
| Cross-document consistency inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: the rent roll itself contains errors, so treat a mismatch as a question and not a verdict. |
| Clause type classifier inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: clause wording varies between firms and jurisdictions, so test per template. |
| Amendment ordering inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: missing pages and undated amendments break the chain and must be flagged. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: lease_abstraction_and_obligation_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: field_confidence, type: double, nullable: false }
    - { name: cross_document_consistency, type: double, nullable: false }
    - { name: clause_type_classifier, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Field confidence and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Cross-document consistency against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Field confidence, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE lease_abstraction_and_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE lease_abstraction_and_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES lease_abstraction_and_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON lease_abstraction_and_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE lease_abstraction_and_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Lease Abstraction & Obligation Extraction": Read commercial leases and amendments and extract the dates, rents, options, break clauses and obligations into a structured abstract with page citations. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Commercial real estate: leases, rent roll and income | Commercial properties earn rent under long, negotiated leases with options, breaks, indexation and incentives. The rent roll lists each tenant, rent and expiry, net operating income is rent minus operating costs, and value is set by income and the cap rate investors accept. | Lease terms are the data, and most of them are in documents, so extraction quality directly limits forecasting and valuation. |
| Leasing, rent and property operations | A landlord sets rent, screens applicants, collects payments, handles maintenance and decides renewals. Rent is observed as an asking rent and a signed rent, which differ, and tenant behaviour is shaped by notice periods, rent-control rules and payment cycles. | Operational models should support care and service (early outreach, correct dispatch) as much as revenue, and rules such as rent caps are hard constraints. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Evaluating language-model systems | Evaluation uses a held-out golden set that includes adversarial, unanswerable and edge cases, automatic checks (does the code run, does the number match the source), calibrated model judges and human review. Prompts and models change often, so evaluation runs as regression tests. | Cases used to tune prompts cannot be used to report quality; keep a frozen test set and add every production failure to the tuning set. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Field confidence | Calibrated probability that the extracted value is correct, per field type. Routes uncertain fields to a reviewer. | Leakage risk to design against: Calibrate by field type, as dates and amounts behave differently. |
| A signal-versus-noise trap in this use case: Amendments | The true signal is the effective terms after every amendment and side letter is applied; the common noise is the original lease read alone. | The rent in force may be set by the third amendment, and the original shows a figure that stopped applying years ago. |

**Ask the experts**

- [ ] What exactly does "Every extracted field cites its page and clause so a lawyer can check it" mean in practice for lease abstraction & obligation extraction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Field confidence" and "Cross-document consistency", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Abstract time per lease" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluation on clean, modern leases hides failures on the old scans that dominate real portfolios, and who can confirm the cut-off times and splits?
- [ ] How often does "Scanned old leases" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Break option | A lease clause that lets the tenant or landlord end the lease early on notice. |
| Amendment | A change to a lease or contract after signing, which overrides the original terms. |
| Rent roll | A schedule of each tenant, unit, rent and lease expiry for a property. |
| Data room | A secure online repository of documents shared during a property sale or due diligence. |
| Effective rent | Rent net of incentives such as free months, spread across the lease term. |
| Change order | A formal change to the construction contract scope, price or schedule. |
| WALT | Weighted average lease term: the average remaining lease length weighted by rent. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| NOI | Net operating income: rental income minus operating expenses, before debt service and tax. |
| CMMS | Computerised maintenance management system: software that tracks work orders and equipment maintenance. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Structured output | Constraining a model to produce valid JSON or SQL against a schema. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
