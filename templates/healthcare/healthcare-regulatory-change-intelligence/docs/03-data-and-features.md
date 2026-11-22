# Healthcare Regulatory Change Intelligence: data and feature specification

> Generated from the blueprint `healthcare/healthcare-regulatory-change-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Regulatory Change Intelligence · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Regulatory Change Intelligence": Monitor approved official publications and identify changes that may apply to the organisation's jurisdiction, facility type and service lines, giving compliance experts cited change summaries, effective dates and a review queue. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using unofficial sources as authority.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Text diff magnitude | semantic and structural change between versions of a requirement | Separates substantive from editorial changes | Version pairs |   |   |   |
| Applicability match | overlap between requirement scope and the organisation's metadata | Ranks the review queue | Metadata as at review |   |   |   |
| Effective-date proximity | days to the stated effective date | Sets urgency | Stated in the source |   |   |   |
| Source authority tier | official, secondary or unofficial classification of the source | Weights confidence | Source register |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Sources | Approved official publications with version and date | Open web search | Unofficial summaries can be wrong or outdated |
| Change | Diff against the prior version of the same source | Summary of the new text alone | Reviewers need what changed |
| Applicability | Candidates tagged by jurisdiction, facility and service line | Final applicability decision | Legal interpretation is a human call |
| Freshness | Source retrieval time and staleness shown | Silent use of old text | A missed update is a compliance gap |
| Citation | Every statement links to a source span | Fluent summary | Unsupported claims mislead reviewers |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Press coverage volume | not authority |
| Document length | not significance |
| Publication layout | formatting |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Text diff magnitude inputs | Compliance | Approved regulatory and accreditation source feeds | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: version pairs. |
| Applicability match inputs | Legal | Internal policy inventory | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: metadata as at review. |
| Effective-date proximity inputs | Regulatory affairs | Facility and service-line register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: stated in the source. |
| Source authority tier inputs | Quality | Compliance case system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: source register. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_regulatory_change_inputs.v1
owner: compliance@example.com
system_of_record: Approved regulatory and accreditation source feeds
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: text_diff_magnitude, type: double, nullable: false }
    - { name: applicability_match, type: double, nullable: false }
    - { name: effective_date_proximity, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Text diff magnitude and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Applicability match against Approved regulatory and accreditation source feeds
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Text diff magnitude, traces back to Approved regulatory and accreditation source feeds; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| BEIR benchmark | https://github.com/beir-cellar/beir | Per-dataset licences (see the repository) | A heterogeneous benchmark of 18 retrieval datasets for zero-shot evaluation | Academic tasks; domain match varies. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CodeSearchNet | https://github.com/github/CodeSearchNet | MIT licence plus per-project licences (see the repository) | About 2 million functions with natural-language documentation in six languages | Docstrings are not user queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE healthcare_regulatory_change_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE healthcare_regulatory_change_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES healthcare_regulatory_change_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON healthcare_regulatory_change_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE healthcare_regulatory_change_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Regulatory Change Intelligence": Monitor approved official publications and identify changes that may apply to the organisation's jurisdiction, facility type and service lines, giving compliance experts cited change summaries, effective dates and a review queue. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Regulation, privacy and trust in clinical AI | Clinical software may be regulated as a medical device, patient data is protected by privacy law, models must be validated on the population where they will run, and clinicians need to understand and override outputs. Federated approaches let hospitals learn together without sharing records. | Plan for validation evidence, post-deployment monitoring and de-identification from the first design review. |
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Text diff magnitude | Semantic and structural change between versions of a requirement. Separates substantive from editorial changes. | Leakage risk to design against: Version pairs. |
| A signal-versus-noise trap in this use case: Sources | The true signal is approved official publications with version and date; the common noise is open web search. | Unofficial summaries can be wrong or outdated. |

**Ask the experts**

- [ ] What exactly does "Compliance or legal experts confirm interpretation and applicability and the system only drafts and ranks" mean in practice for healthcare regulatory change intelligence: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Text diff magnitude" and "Applicability match", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time from publication to review" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using unofficial sources as authority, and who can confirm the cut-off times and splits?
- [ ] How often does "Source republished with a new URL" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Length of stay | How long a patient is admitted, a main driver of bed demand and cost. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Pathogenic variant | A genetic change that causes or raises the risk of disease. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Chunking | Splitting documents into pieces for indexing and retrieval. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
