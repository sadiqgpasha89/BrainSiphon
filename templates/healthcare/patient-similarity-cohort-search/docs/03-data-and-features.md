# Patient Similarity & Cohort Search: data and feature specification

> Generated from the blueprint `healthcare/patient-similarity-cohort-search` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patient Similarity & Cohort Search · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Patient Similarity & Cohort Search": Let clinicians and researchers find similar patients and build cohorts from structured data and notes using natural-language queries. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Gold cohorts from one disease.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Longitudinal code embedding | sequence-based patient embedding | Similarity | Time window |   |   |   |
| Lab trajectory features | summary of lab trends | Phenotype | Units normalised |   |   |   |
| Note-derived phenotypes | extracted conditions | Coverage | Negation handling |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Representation | Patient embeddings from codes, labs and notes | Single-table filters | Single-field cohort filters miss complex phenotypes |
| Reproducibility | Executable cohort definitions from queries | Ad hoc screens | Researchers must reproduce cohorts |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Patient ID | none |
| Encounter count alone | utilisation bias |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Longitudinal code embedding inputs | Clinical informatics | Electronic health record (EHR) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: time window. |
| Lab trajectory features inputs | Hospital data office | Laboratory, radiology and PACS systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: units normalised. |
| Note-derived phenotypes inputs | Integration team | Master patient index (MPI) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: negation handling. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: patient_similarity_cohort_search_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: longitudinal_code_embedding, type: double, nullable: false }
    - { name: lab_trajectory_features, type: double, nullable: false }
    - { name: note_derived_phenotypes, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Longitudinal code embedding and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Lab trajectory features against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Longitudinal code embedding, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CodeSearchNet | https://github.com/github/CodeSearchNet | MIT licence plus per-project licences (see the repository) | About 2 million functions with natural-language documentation in six languages | Docstrings are not user queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BEIR benchmark | https://github.com/beir-cellar/beir | Per-dataset licences (see the repository) | A heterogeneous benchmark of 18 retrieval datasets for zero-shot evaluation | Academic tasks; domain match varies. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepFashion | https://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html | Non-commercial research (see the page) | Over 800,000 fashion images with categories, attributes, landmarks and consumer-to-shop pairs | Non-commercial; fashion-only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE patient_similarity_cohort_impressions (
  impression_id  UUID PRIMARY KEY,
  user_id        TEXT        NOT NULL,
  shown_at       TIMESTAMPTZ NOT NULL,
  surface        TEXT        NOT NULL,
  item_id        TEXT        NOT NULL,
  rank           SMALLINT    NOT NULL,
  score          REAL,
  propensity     REAL        NOT NULL,   -- probability the policy showed this item at this rank
  source         TEXT        NOT NULL,   -- ann | co-visit | trending | business-rule | exploration
  model_version  TEXT        NOT NULL,
  experiment_arm TEXT
) PARTITION BY RANGE (shown_at);

CREATE TABLE patient_similarity_cohort_feedback (
  impression_id  UUID        NOT NULL REFERENCES patient_similarity_cohort_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE patient_similarity_cohort_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Patient Similarity & Cohort Search": Let clinicians and researchers find similar patients and build cohorts from structured data and notes using natural-language queries. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Longitudinal code embedding | Sequence-based patient embedding. Similarity. | Leakage risk to design against: Time window. |
| A signal-versus-noise trap in this use case: Representation | The true signal is patient embeddings from codes, labs and notes; the common noise is single-table filters. | Single-field cohort filters miss complex phenotypes. |

**Ask the experts**

- [ ] What exactly does "Privacy and access control" mean in practice for patient similarity & cohort search: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Longitudinal code embedding" and "Lab trajectory features", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to build cohorts" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: gold cohorts from one disease, and who can confirm the cut-off times and splits?
- [ ] How often does "Natural-language ambiguity" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Eligibility criteria | The rules that determine whether a patient may join a clinical trial. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| ANN search | Approximate nearest-neighbour search that finds similar vectors quickly. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
| Position bias | Higher slots get more attention regardless of relevance. |
| Two-tower model | A retrieval model with separate networks for user and item whose embeddings are compared by dot product. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
