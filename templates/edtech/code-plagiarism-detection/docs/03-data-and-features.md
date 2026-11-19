# Source-Code Plagiarism Detection: data and feature specification

> Generated from the blueprint `edtech/code-plagiarism-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Source-Code Plagiarism Detection · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Source-Code Plagiarism Detection": Detect collusion and copying in programming assignments robustly to renaming and restructuring, with evidence for review. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Seeded plagiarism too simple.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| AST subtree similarity | normalised AST matches | Copying | Normalisation |   |   |   |
| Rare-structure overlap | shared unusual constructs | Collusion | Corpus statistics |   |   |   |
| Submission-time proximity | timing of similar submissions | Collusion | Timestamps |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Structure | AST and data-flow similarity | Token or text similarity | Renaming defeats text similarity |
| Baseline | Remove starter code and common solutions | Raw similarity | Short problems have many identical solutions |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Variable names | easily changed |
| Comments | easily changed |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| AST subtree similarity inputs | Learning engineering | Learning management system (LMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: normalisation. |
| Rare-structure overlap inputs | Registrar and data office | Student information system (SIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: corpus statistics. |
| Submission-time proximity inputs | Content team | Content and item bank | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: timestamps. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: code_plagiarism_detection_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: ast_subtree_similarity, type: double, nullable: false }
    - { name: rare_structure_overlap, type: double, nullable: false }
    - { name: submission_time_proximity, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on AST subtree similarity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Rare-structure overlap against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as AST subtree similarity, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCI Phishing Websites | https://archive.ics.uci.edu/dataset/327/phishing+websites | CC BY 4.0 (see the UCI page) | 11,000 websites with URL and page features and a phishing label | Static features from one period; attackers adapt. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| GoEmotions | https://github.com/google-research/google-research/tree/master/goemotions | Apache 2.0 (see the repository) | 58,000 Reddit comments labelled with 27 emotion categories | Reddit language; label subjectivity. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE code_plagiarism_detection_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE code_plagiarism_detection_fields (
  document_id TEXT NOT NULL REFERENCES code_plagiarism_detection_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE code_plagiarism_detection_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Source-Code Plagiarism Detection": Detect collusion and copying in programming assignments robustly to renaming and restructuring, with evidence for review. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Academic integrity, proctoring and privacy | Plagiarism and cheating detection compare code and text, and proctoring uses video and behaviour signals. These systems can wrongly accuse students and raise privacy concerns, especially for minors and remote exams. | The cost of a false accusation is high, so outputs support a human decision and need appeal paths. |
| Mastery is hidden; answers are noisy evidence | A learner may guess correctly without knowing, or slip and answer wrongly despite knowing. Models such as Bayesian Knowledge Tracing treat mastery as a hidden state with parameters for the chance of learning on each attempt, guessing and slipping. Performance Factors Analysis instead predicts the next answer from counts of earlier successes and failures. | A correct answer is not learning. The model must reason about evidence, and a single success should not declare mastery. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Graph learning and its pitfalls | Graph neural networks and graph features (degree, centrality, personalised PageRank, motifs) propagate information along edges. Leakage hides in the split: random edge splits put future or neighbouring information into training; time-based and node-based splits are safer. | Evaluate on whole communities or later periods, and compare with simple hand-built graph features before adding a GNN. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: AST subtree similarity | Normalised AST matches. Copying. | Leakage risk to design against: Normalisation. |
| A signal-versus-noise trap in this use case: Structure | The true signal is aST and data-flow similarity; the common noise is token or text similarity. | Renaming defeats text similarity. |

**Ask the experts**

- [ ] What exactly does "Common starter code" mean in practice for source-code plagiarism detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "AST subtree similarity" and "Rare-structure overlap", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Confirmed cases per flagged" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: seeded plagiarism too simple, and who can confirm the cut-off times and splits?
- [ ] How often does "Highly constrained tiny assignments" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Code plagiarism | Submitting another's program, often disguised by renaming variables or reordering code. |
| Placement test | A short assessment that places a learner at the right starting level. |
| Formative feedback | Comments that help a learner improve while they are still learning. |
| Learning management system (LMS) | The platform where courses, materials, submissions and grades are managed. |
| PII in learner data | Personal information such as names and IDs inside student text and logs that must be protected. |
| Uplift (learning) | The extra learning gain caused by an intervention compared with none. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
| Personalised PageRank | PageRank that restarts from chosen seed nodes, used to spread risk from known bad nodes. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| GraphSAGE | A GNN that samples and aggregates a node's neighbours so it scales to large graphs. |
| Champion / challenger | The model in production and a candidate that must beat it before promotion. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
