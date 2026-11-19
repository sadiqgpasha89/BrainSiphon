# Skill Graph Extraction & Job Matching: data and feature specification

> Generated from the blueprint `edtech/skill-graph-and-job-matching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Skill Graph Extraction & Job Matching · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Skill Graph Extraction & Job Matching": Build a skill graph from courses, resumes and job postings, and match learners to roles with explainable skill overlaps. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on taxonomy-covered skills only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Canonical skill entities | linked entities | Matching basis | Linking |   |   |   |
| Proficiency estimate | evidence-based level | Fit | Evidence |   |   |   |
| Skill co-occurrence graph | graph embeddings | Adjacent skills | Updates |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Normalisation | Map free-text skills to a canonical taxonomy | Raw keyword overlap | Synonyms and levels break overlap |
| Levels | Proficiency level not only presence | Binary skill flags | "Used Python once" differs from expert |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Resume formatting | noise |
| Names | bias |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Canonical skill entities inputs | Learning engineering | Learning management system (LMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: linking. |
| Proficiency estimate inputs | Registrar and data office | Student information system (SIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: evidence. |
| Skill co-occurrence graph inputs | Content team | Content and item bank | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: updates. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: skill_graph_and_job_matching_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: canonical_skill_entities, type: double, nullable: false }
    - { name: proficiency_estimate, type: double, nullable: false }
    - { name: skill_co_occurrence_graph, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Canonical skill entities and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Proficiency estimate against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Canonical skill entities, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Web Data Commons product corpus | https://webdatacommons.org/largescaleproductcorpus/ | ODC-BY (see the page) | Millions of product offers from the web with identifiers for product matching | Web-scraped and noisy. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE skill_graph_and_job_matching_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE skill_graph_and_job_matching_outputs (
  run_id TEXT NOT NULL REFERENCES skill_graph_and_job_matching_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE skill_graph_and_job_matching_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE skill_graph_and_job_matching_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Skill Graph Extraction & Job Matching": Build a skill graph from courses, resumes and job postings, and match learners to roles with explainable skill overlaps. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Skills, items and the Q-matrix | Curricula are broken into knowledge components, or skills, such as adding fractions. Each question (item) is tagged with one or more skills; the table of those tags is the Q-matrix. Mastery is tracked per skill, not per question. | Everything depends on the skill map. When the curriculum changes it, historical mastery can become wrong, so version it. |
| Mastery is hidden; answers are noisy evidence | A learner may guess correctly without knowing, or slip and answer wrongly despite knowing. Models such as Bayesian Knowledge Tracing treat mastery as a hidden state with parameters for the chance of learning on each attempt, guessing and slipping. Performance Factors Analysis instead predicts the next answer from counts of earlier successes and failures. | A correct answer is not learning. The model must reason about evidence, and a single success should not declare mastery. |
| Children's data, fairness and accountability | Learner data is sensitive, and children's data has special protection (COPPA and FERPA in the United States, the GDPR with special rules for minors in Europe). Mastery estimates can affect grades, tracks or perception, so they should be explainable, checked for differences between groups and never the only basis for a high-stakes decision. | Consent, retention limits and explanations are product requirements, and they favour interpretable models alongside predictive ones. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Canonical skill entities | Linked entities. Matching basis. | Leakage risk to design against: Linking. |
| A signal-versus-noise trap in this use case: Normalisation | The true signal is map free-text skills to a canonical taxonomy; the common noise is raw keyword overlap. | Synonyms and levels break overlap. |

**Ask the experts**

- [ ] What exactly does "Taxonomy mapping (ESCO/O*NET)" mean in practice for skill graph extraction & job matching: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Canonical skill entities" and "Proficiency estimate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Placement rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating on taxonomy-covered skills only, and who can confirm the cut-off times and splits?
- [ ] How often does "Emerging skills not in taxonomy" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Knowledge component (skill) | A unit of knowledge or skill that can be practised and assessed, the level at which mastery is tracked. |
| Q-matrix | The mapping that says which skills each question item exercises. |
| Item | One question or exercise a learner can answer. |
| Mastery | A learner's hidden state of knowing a skill well enough, usually represented as a probability. |
| BKT | Bayesian Knowledge Tracing: a hidden Markov model of mastery with learn, guess and slip parameters per skill. |
| Guess / slip | The chance of answering correctly without mastery (guess) or incorrectly despite mastery (slip). |
| PFA | Performance Factors Analysis: logistic regression predicting correctness from prior successes and failures on the skill. |
| IRT | Item response theory: models correctness as a function of learner ability and item difficulty. |
| Difficulty / discrimination | How hard an item is, and how sharply it separates stronger from weaker learners. |
| Ability (theta) | A learner's latent proficiency in item response theory. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Blocking | Cheaply selecting candidate pairs for comparison so not all pairs are compared. |
| Node / edge | The entities in a graph and the relationships between them. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
