# Commercial Insurance Submission Intake & Risk Extraction: data and feature specification

> Generated from the blueprint `bfsi/commercial-submission-intake-and-risk-extraction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Commercial Insurance Submission Intake & Risk Extraction · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Commercial Insurance Submission Intake & Risk Extraction": Read broker submissions (emails, ACORD forms, spreadsheets, loss runs) and extract structured risk data so underwriters can quote faster. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Clean test submissions are better formatted than live ones.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Field confidence | calibrated probability that each extracted field is correct | Routes uncertain fields to review | Calibrate per field type, as amounts and dates differ |   |   |   |
| Appetite match | match of class, size and geography to the underwriting appetite rules | Fast triage | Appetite rules change often, so version them |   |   |   |
| Loss run totals | sum of paid and incurred losses parsed from the loss runs | A key underwriting input | Parsing errors change the total, so compare with the printed total |   |   |   |
| Missing data count | number of required fields absent from the submission | Drives the follow-up request | The definition of required varies by class |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Completeness | A request to the broker for missing information | Guessing the missing fields | Wrong inputs lead to a wrong price, and the error surfaces at claim time |
| Loss runs | The parsed claims history by year and cause | A summary total | Totals hide patterns such as repeated small losses or one large loss |
| Triage | A quick check of appetite before any effort | Quoting every submission | Out-of-appetite risks waste scarce underwriter time |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Email signature | Cosmetic text that is not risk data |
| Broker font | Cosmetic and has no meaning for the risk |
| Attachment names | Unreliable as brokers name files in different ways |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Field confidence inputs | Core banking IT | Core banking or policy administration system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: calibrate per field type, as amounts and dates differ. |
| Appetite match inputs | Risk data office | General ledger and risk data warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: appetite rules change often, so version them. |
| Loss run totals inputs | Operations | Customer master and KYC repository | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: parsing errors change the total, so compare with the printed total. |
| Missing data count inputs | Core banking IT | Core banking or policy administration system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: the definition of required varies by class. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: commercial_submission_intake_and_risk_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: field_confidence, type: double, nullable: false }
    - { name: appetite_match, type: double, nullable: false }
    - { name: loss_run_totals, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Field confidence and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Appetite match against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Field confidence, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE commercial_submission_intake_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE commercial_submission_intake_steps (
  task_id TEXT NOT NULL REFERENCES commercial_submission_intake_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE commercial_submission_intake_approvals (
  task_id TEXT NOT NULL REFERENCES commercial_submission_intake_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Commercial Insurance Submission Intake & Risk Extraction": Read broker submissions (emails, ACORD forms, spreadsheets, loss runs) and extract structured risk data so underwriters can quote faster. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Insurance: pricing, underwriting, claims and reserving | An insurer collects premiums, underwrites risks, pays claims and holds reserves for claims not yet settled. Underwriting selects and prices risk, claims handling pays and investigates, and actuaries estimate ultimate cost from development triangles using methods such as chain-ladder. | Labels arrive years later for long-tail lines, and the same data feed serves pricing, claims and reserving teams with different definitions. |
| How a bank lends: origination, servicing and workout | A loan is originated (application, underwriting, approval, documents), serviced for years (payments, covenants, reviews) and, if the borrower struggles, moved to collections or workout. Each stage has its own data, owner and model: underwriting models see applicants, behaviour models see accounts, early-warning models see covenant and cash-flow signals. | Which stage you are modelling decides the label, the delay before you learn the outcome and which team acts on your score. |
| Expected credit loss, IFRS 9 staging and provisions | Banks hold provisions against expected credit losses: twelve-month loss for performing loans (stage 1), lifetime loss once credit risk has increased significantly (stage 2) and for impaired loans (stage 3). Probability of default, loss given default and exposure at default are combined across scenarios, and a stage change can move provisions sharply. | A model that is slightly wrong near a stage boundary can move reported profit, so stability, hysteresis and explainability matter as much as discrimination. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Field confidence | Calibrated probability that each extracted field is correct. Routes uncertain fields to review. | Leakage risk to design against: Calibrate per field type, as amounts and dates differ. |
| A signal-versus-noise trap in this use case: Completeness | The true signal is a request to the broker for missing information; the common noise is guessing the missing fields. | Wrong inputs lead to a wrong price, and the error surfaces at claim time. |

**Ask the experts**

- [ ] What exactly does "Every extracted field links to its source page or cell" mean in practice for commercial insurance submission intake & risk extraction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Field confidence" and "Appetite match", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to first quote" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: clean test submissions are better formatted than live ones, and who can confirm the cut-off times and splits?
- [ ] How often does "Scanned loss runs" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Underwriting | Assessing a risk and deciding whether to accept it and at what price. |
| IBNR | Incurred but not reported: claims that have happened but have not yet been reported or fully known. |
| Straight-through processing | Handling a transaction or claim end to end without manual touch. |
| Model tier | A classification of a model by its materiality, which sets how deeply it is validated. |
| KYC refresh | Periodic review of a customer's identity and risk information, more often for higher-risk customers. |
| Mis-selling | Selling a product that does not suit the client or by misleading them about it. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Structured output | Constraining a model to produce valid JSON or SQL against a schema. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
