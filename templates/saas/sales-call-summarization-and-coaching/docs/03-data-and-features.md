# Sales Call Summarisation & Coaching: data and feature specification

> Generated from the blueprint `saas/sales-call-summarization-and-coaching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Sales Call Summarisation & Coaching · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Sales Call Summarisation & Coaching": Transcribe calls, extract next steps, objections and competitor mentions and deliver coaching insights, writing back to CRM. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating summaries not field accuracy.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Evidence-linked extraction accuracy | field accuracy with spans | Trust | Annotations |   |   |   |
| Question and objection patterns | classified moments | Coaching | Taxonomy |   |   |   |
| Next-step commitment detection | commitments extracted | CRM | Extraction |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Faithfulness | Fields extracted with transcript span evidence | Free summary only | Wrong CRM fields corrupt forecasting |
| Coaching | Behavioural metrics tied to outcomes | Talk-time as quality | Talk-time ratio alone is a weak proxy |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Call length | weak |
| Filler word counts | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Evidence-linked extraction accuracy inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: annotations. |
| Question and objection patterns inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: taxonomy. |
| Next-step commitment detection inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: extraction. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: sales_call_summarization_and_coaching_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: evidence_linked_extraction_accuracy, type: double, nullable: false }
    - { name: question_and_objection_patterns, type: double, nullable: false }
    - { name: next_step_commitment_detection, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Evidence-linked extraction accuracy and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Question and objection patterns against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Evidence-linked extraction accuracy, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Amazon Reviews 2023 | https://amazon-reviews-2023.github.io/ | Research terms on the project page | Hundreds of millions of product reviews with item metadata across categories | Very large; consumer-review language and bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE sales_call_summarization_and_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE sales_call_summarization_and_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES sales_call_summarization_and_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON sales_call_summarization_and_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE sales_call_summarization_and_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Sales Call Summarisation & Coaching": Transcribe calls, extract next steps, objections and competitor mentions and deliver coaching insights, writing back to CRM. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Support, success and the copilots that help them | Support teams answer tickets with help-centre articles and past replies; success managers prepare reviews for customers. Assistants draft replies, route tickets and summarise calls, with accuracy, tone and policy compliance as constraints. | Deflection that hides a wrong answer costs more than a ticket, so assistants must cite sources and escalate when unsure. |
| Evaluating a docs assistant | A golden set of real questions with known answers, including unanswerable and version-specific ones, is scored for correctness, faithfulness to the cited source, abstention when the docs are silent and, for code, whether the snippet compiles and runs. Questions written from page headings are too easy. | Abstaining is a feature. A refusal that is right is better than an answer that is plausible and wrong. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Evidence-linked extraction accuracy | Field accuracy with spans. Trust. | Leakage risk to design against: Annotations. |
| A signal-versus-noise trap in this use case: Faithfulness | The true signal is fields extracted with transcript span evidence; the common noise is free summary only. | Wrong CRM fields corrupt forecasting. |

**Ask the experts**

- [ ] What exactly does "Call consent and legal rules" mean in practice for sales call summarisation & coaching: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Evidence-linked extraction accuracy" and "Question and objection patterns", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Rep admin time saved" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating summaries not field accuracy, and who can confirm the cut-off times and splits?
- [ ] How often does "Multiple speakers misattributed" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Meeting notes and action items | Summaries and tasks extracted from meetings, where attributing owners correctly is the main failure. |
| Time to first successful call | How long a new developer takes to make a working API request, a common docs-quality metric. |
| Pipeline | The set of open sales opportunities and their stages and expected values. |
| Grounding / citation | Basing an answer on retrieved text and pointing to the passage that supports it. |
| Flaky test | A test that sometimes passes and sometimes fails without any code change. |
| CI/CD | Continuous integration and delivery: automated building, testing and deployment of code. |
| Autoscaling | Automatically adding or removing compute resources as load changes. |
| Schema matching | Mapping the columns of one data source to the fields of another. |
| Data lineage | A record of where data came from and how it was transformed. |
| LLM gateway | A service that routes language-model requests between providers by cost, latency and quality. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Structured output | Constraining a model to produce valid JSON or SQL against a schema. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Word error rate (WER) | Errors in recognised speech divided by the number of reference words. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
