# Healthcare Value Analysis Committee Decision Intelligence: data and feature specification

> Generated from the blueprint `healthcare/healthcare-value-analysis-committee-decision-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Value Analysis Committee Decision Intelligence · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Value Analysis Committee Decision Intelligence": Prepare evidence-based review packets that compare products and services on clinical outcomes, safety, total cost, utilisation, implementation and alternatives, with source citations, uncertainty and conflict-of-interest disclosures. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Judging fluency over citations.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Evidence grade | study design and risk-of-bias grade per source | Weights the claims | Grading scheme version |   |   |   |
| Internal utilisation and cost | actual use and total cost of ownership | Local relevance | Period as stated |   |   |   |
| Citation coverage | share of statements with a supporting source span | Faithfulness | Checked against retrieved text |   |   |   |
| Conflict flags | disclosed interests of authors and sponsors | Bias awareness | Disclosure data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Evidence | Graded evidence with study type and risk of bias | A fluent summary | A committee must see the quality of each source |
| Vendor material | Labelled as vendor-supplied | Mixed with independent evidence | Commercial evidence carries bias |
| Comparison | Matrix on agreed criteria | Narrative only | Members need side-by-side comparison |
| Uncertainty | Evidence gaps and conflicts disclosed | Single recommendation | False confidence misleads a committee |
| Decision | Members decide and the system drafts | Recommendation as decision | Accountability stays with the committee |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Journal prestige alone | not study quality |
| Number of citations | popularity |
| Vendor presentation length | marketing |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Evidence grade inputs | Clinical value analysis | Value analysis request system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: grading scheme version. |
| Internal utilisation and cost inputs | Supply chain | Evidence and literature repository | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: period as stated. |
| Citation coverage inputs | Clinical leadership | Procurement and spend system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: checked against retrieved text. |
| Conflict flags inputs | Compliance | Clinical outcomes and utilisation data | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: disclosure data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_value_analysis_committee_inputs.v1
owner: clinical-value-analysis@example.com
system_of_record: Value analysis request system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: evidence_grade, type: double, nullable: false }
    - { name: internal_utilisation_and_cost, type: double, nullable: false }
    - { name: citation_coverage, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Evidence grade and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Internal utilisation and cost against Value analysis request system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Evidence grade, traces back to Value analysis request system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MS MARCO | https://microsoft.github.io/msmarco/ | Non-commercial research use (see the page) | Large-scale passage and document ranking data from real search queries | Web search, not enterprise or docs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BEIR benchmark | https://github.com/beir-cellar/beir | Per-dataset licences (see the repository) | A heterogeneous benchmark of 18 retrieval datasets for zero-shot evaluation | Academic tasks; domain match varies. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE healthcare_value_analysis_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE healthcare_value_analysis_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES healthcare_value_analysis_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON healthcare_value_analysis_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE healthcare_value_analysis_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Value Analysis Committee Decision Intelligence": Prepare evidence-based review packets that compare products and services on clinical outcomes, safety, total cost, utilisation, implementation and alternatives, with source citations, uncertainty and conflict-of-interest disclosures. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Evidence grade | Study design and risk-of-bias grade per source. Weights the claims. | Leakage risk to design against: Grading scheme version. |
| A signal-versus-noise trap in this use case: Evidence | The true signal is graded evidence with study type and risk of bias; the common noise is a fluent summary. | A committee must see the quality of each source. |

**Ask the experts**

- [ ] What exactly does "Committee members decide and generated summaries must cite sources and disclose evidence gaps" mean in practice for healthcare value analysis committee decision intelligence: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Evidence grade" and "Internal utilisation and cost", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Committee preparation time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: judging fluency over citations, and who can confirm the cut-off times and splits?
- [ ] How often does "Evidence is mostly vendor-supplied" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| Eligibility criteria | The rules that determine whether a patient may join a clinical trial. |
| Mental health crisis | A situation, such as suicidal intent, that needs immediate human escalation rather than automated advice. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Chunking | Splitting documents into pieces for indexing and retrieval. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
