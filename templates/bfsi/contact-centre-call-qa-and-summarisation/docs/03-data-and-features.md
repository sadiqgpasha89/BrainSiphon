# Contact-Centre Call QA & Summarisation: data and feature specification

> Generated from the blueprint `bfsi/contact-centre-call-qa-and-summarisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Contact-Centre Call QA & Summarisation · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Contact-Centre Call QA & Summarisation": Transcribe, summarise and score calls against the quality and compliance checklist so supervisors review the right calls and agents spend less time on notes. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Supervisor labels are inconsistent between reviewers, so the ceiling is lower than it appears.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Disclosure detection | detected spans for each required statement, with confidence | Compliance depends on required statements being made | Speech recognition errors cause misses, so use fuzzy matching |   |   |   |
| Summary faithfulness | share of summary claims supported by the transcript | The main quality check | Needs an entailment check, not only overlap |   |   |   |
| Sentiment shift | change in sentiment between the first and last minute of the call | Highlights escalation and unresolved complaints | Weak and noisy, so use with other signals |   |   |   |
| Silence and talk ratio | share of the call that is dead air and agent-to-customer talk ratio | Highlights poor service and confusion | Noisy, as silence is often legitimate |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Coverage | Every call scored automatically | A 2 percent random sample reviewed by people | A sample misses the rare breach, and the one missed call is the one a regulator finds |
| Checklist | Specific checklist items marked with the spans that support them | One overall quality score | A single score hides a missed disclosure behind good tone |
| Summary | A short note that only contains what was said | A fluent note with invented details | Invented details go into the customer record and cause errors downstream |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Call length | Weakly related to quality once the topic is known |
| Agent accent | Not a quality measure and scoring on it is unfair |
| Hold music | An audio artefact and not a speech signal |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Disclosure detection inputs | Core banking IT | Core banking or policy administration system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: speech recognition errors cause misses, so use fuzzy matching. |
| Summary faithfulness inputs | Risk data office | General ledger and risk data warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: needs an entailment check, not only overlap. |
| Sentiment shift inputs | Operations | Customer master and KYC repository | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: weak and noisy, so use with other signals. |
| Silence and talk ratio inputs | Core banking IT | Core banking or policy administration system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: noisy, as silence is often legitimate. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: contact_centre_call_qa_and_summarisation_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: disclosure_detection, type: double, nullable: false }
    - { name: summary_faithfulness, type: double, nullable: false }
    - { name: sentiment_shift, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Disclosure detection and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Summary faithfulness against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Disclosure detection, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE contact_centre_call_qa_and_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE contact_centre_call_qa_and_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES contact_centre_call_qa_and_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON contact_centre_call_qa_and_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE contact_centre_call_qa_and_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Contact-Centre Call QA & Summarisation": Transcribe, summarise and score calls against the quality and compliance checklist so supervisors review the right calls and agents spend less time on notes. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Conduct, fairness and customer outcomes | Regulators expect firms to treat customers fairly, identify vulnerable customers and handle complaints properly. Models that route, price or decline must be tested for disparate outcomes, and customers need a route to human review and redress. | A model that raises efficiency but worsens outcomes for one group is a conduct failure, not a success. |
| Regulatory change and reporting | Rules change constantly across prudential, conduct and financial crime regimes. Firms track consultations, map obligations to policies and controls, report to supervisors on fixed schedules and keep evidence of compliance. | Language-model tools that summarise regulation must cite the paragraph and the version in force, because a confident summary of superseded text is worse than none. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Disclosure detection | Detected spans for each required statement, with confidence. Compliance depends on required statements being made. | Leakage risk to design against: Speech recognition errors cause misses, so use fuzzy matching. |
| A signal-versus-noise trap in this use case: Coverage | The true signal is every call scored automatically; the common noise is a 2 percent random sample reviewed by people. | A sample misses the rare breach, and the one missed call is the one a regulator finds. |

**Ask the experts**

- [ ] What exactly does "The summary is faithful to the transcript and adds nothing" mean in practice for contact-centre call qa & summarisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Disclosure detection" and "Summary faithfulness", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "QA coverage" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: supervisor labels are inconsistent between reviewers, so the ceiling is lower than it appears, and who can confirm the cut-off times and splits?
- [ ] How often does "Noisy audio" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| ASR | Automatic speech recognition: converting audio of calls into text. |
| KYC refresh | Periodic review of a customer's identity and risk information, more often for higher-risk customers. |
| Margin call | A demand for more collateral when exposure rises or collateral value falls. |
| Mis-selling | Selling a product that does not suit the client or by misleading them about it. |
| Complaint root cause | The underlying process, product or system failure behind a customer complaint, not just its topic. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Word error rate (WER) | Errors in recognised speech divided by the number of reference words. |
| CTC loss | A loss that aligns a signal such as audio or a line image to its text without frame labels. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Distribution shift | A change in the data a model sees compared with training. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
