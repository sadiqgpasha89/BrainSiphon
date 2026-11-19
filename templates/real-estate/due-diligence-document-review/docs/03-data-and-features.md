# Real Estate Due-Diligence Document Review: data and feature specification

> Generated from the blueprint `real-estate/due-diligence-document-review` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Real Estate Due-Diligence Document Review · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Real Estate Due-Diligence Document Review": Review data-room documents (title, leases, surveys, environmental, contracts) for a property acquisition, flag issues and draft a report with citations. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Past deals used for tuning are the easy ones that closed, so recall on hard deals is overstated.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Checklist coverage | share of required document types present and reviewed | A direct completeness measure | Definitions of required vary by deal, so use a template per type |   |   |   |
| Issue precision | share of flagged issues that a lawyer accepts as real | Measures noise in the report | Reviewers disagree, so measure agreement as well |   |   |   |
| Citation validity | share of issues whose cited passage supports the statement | Trust in the report depends on it | A passage can be real and still not support the claim, so check entailment |   |   |   |
| Material flag | severity score assigned by a rule set tied to value and legal risk | Prioritises the review | Severity involves judgement, so calibrate with lawyers |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Coverage | Checklist coverage per document type | Reading documents in random order | Missing documents matter as much as the ones present, and a random read does not reveal gaps |
| Issues | Material issues ranked by severity and value | Every finding listed with equal weight | Noise buries the real risk, and the reviewer misses the one clause that kills the deal |
| Evidence | Each claim linked to a quoted passage | Unsupported claims | A claim without a citation cannot be trusted or checked by a lawyer |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Document length | Longer documents are not riskier, and length carries no signal about issues |
| Folder names | Arbitrary labels chosen by the seller's team |
| Dates alone | Weak evidence of relevance unless tied to a clause or event |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Checklist coverage inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: definitions of required vary by deal, so use a template per type. |
| Issue precision inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: reviewers disagree, so measure agreement as well. |
| Citation validity inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: A passage can be real and still not support the claim, so check entailment. |
| Material flag inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: severity involves judgement, so calibrate with lawyers. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: due_diligence_document_review_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: checklist_coverage, type: double, nullable: false }
    - { name: issue_precision, type: double, nullable: false }
    - { name: citation_validity, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Checklist coverage and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Issue precision against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Checklist coverage, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RACE reading comprehension | https://www.cs.cmu.edu/~glai1/data/race/ | Research use (see the page) | About 28,000 passages and 100,000 exam questions from English exams for Chinese students | Exam questions, one population. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE due_diligence_document_review_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE due_diligence_document_review_steps (
  task_id TEXT NOT NULL REFERENCES due_diligence_document_review_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE due_diligence_document_review_approvals (
  task_id TEXT NOT NULL REFERENCES due_diligence_document_review_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Real Estate Due-Diligence Document Review": Review data-room documents (title, leases, surveys, environmental, contracts) for a property acquisition, flag issues and draft a report with citations. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Commercial real estate: leases, rent roll and income | Commercial properties earn rent under long, negotiated leases with options, breaks, indexation and incentives. The rent roll lists each tenant, rent and expiry, net operating income is rent minus operating costs, and value is set by income and the cap rate investors accept. | Lease terms are the data, and most of them are in documents, so extraction quality directly limits forecasting and valuation. |
| Transactions, title and fraud | Buying property involves a contract, searches of title and liens, mortgage underwriting, an escrow or closing agent, and recording of the deed. Fraud includes forged deeds, owner impersonation and fake rental ads, and delay comes from missing conditions and lender steps. | Title and closing data are fragmented across parties, so labels are sparse and investigators need evidence, not just scores. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Checklist coverage | Share of required document types present and reviewed. A direct completeness measure. | Leakage risk to design against: Definitions of required vary by deal, so use a template per type. |
| A signal-versus-noise trap in this use case: Coverage | The true signal is checklist coverage per document type; the common noise is reading documents in random order. | Missing documents matter as much as the ones present, and a random read does not reveal gaps. |

**Ask the experts**

- [ ] What exactly does "Every issue in the report cites the document and page it comes from" mean in practice for real estate due-diligence document review: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Checklist coverage" and "Issue precision", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Review hours" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: past deals used for tuning are the easy ones that closed, so recall on hard deals is overstated, and who can confirm the cut-off times and splits?
- [ ] How often does "Missing documents" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Data room | A secure online repository of documents shared during a property sale or due diligence. |
| Lien | A legal claim on a property as security for a debt. |
| Appraisal | A professional opinion of a property's market value, usually required by a lender. |
| CMMS | Computerised maintenance management system: software that tracks work orders and equipment maintenance. |
| Escrow | A neutral third party holding money and documents until the conditions of a sale are met. |
| Title | The legal ownership of a property, and the search that checks for liens and defects. |
| Floodplain | Land that is likely to flood in a given event, such as a one-in-a-hundred-year flood. |
| Amendment | A change to a lease or contract after signing, which overrides the original terms. |
| Break option | A lease clause that lets the tenant or landlord end the lease early on notice. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
