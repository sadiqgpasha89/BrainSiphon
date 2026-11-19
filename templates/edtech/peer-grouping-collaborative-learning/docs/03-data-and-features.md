# Peer Grouping for Collaborative Learning: data and feature specification

> Generated from the blueprint `edtech/peer-grouping-collaborative-learning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Peer Grouping for Collaborative Learning · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Peer Grouping for Collaborative Learning": Form study groups and pair students to maximise learning and inclusion using skills, schedules and interaction history. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising averages.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Skill complementarity | difference in mastery profile | Peer benefit | KT |   |   |   |
| Schedule overlap | shared availability | Feasibility | Calendar |   |   |   |
| Prior collaboration outcomes | past group success | History | Data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Composition | Complementary skills with schedule fit | Homogeneous ability grouping | Mixed-skill groups benefit both with scaffolding |
| Inclusion | Avoid pairing patterns that isolate students | Optimise average score only | Averages hide exclusion |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Student name | none |
| Seat position | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Skill complementarity inputs | Learning engineering | Learning management system (LMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: KT. |
| Schedule overlap inputs | Registrar and data office | Student information system (SIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: calendar. |
| Prior collaboration outcomes inputs | Content team | Content and item bank | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: peer_grouping_collaborative_learning_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: skill_complementarity, type: double, nullable: false }
    - { name: schedule_overlap, type: double, nullable: false }
    - { name: prior_collaboration_outcomes, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Skill complementarity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Schedule overlap against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Skill complementarity, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Therapeutics Data Commons | https://tdcommons.ai/ | Per-dataset terms (see the site) | Curated datasets across drug discovery tasks, including drug-drug interaction and ADMET | Heterogeneous quality; read each dataset's notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE peer_grouping_collaborative_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE peer_grouping_collaborative_outputs (
  run_id TEXT NOT NULL REFERENCES peer_grouping_collaborative_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE peer_grouping_collaborative_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE peer_grouping_collaborative_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Peer Grouping for Collaborative Learning": Form study groups and pair students to maximise learning and inclusion using skills, schedules and interaction history. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Skills, items and the Q-matrix | Curricula are broken into knowledge components, or skills, such as adding fractions. Each question (item) is tagged with one or more skills; the table of those tags is the Q-matrix. Mastery is tracked per skill, not per question. | Everything depends on the skill map. When the curriculum changes it, historical mastery can become wrong, so version it. |
| Item difficulty and ability: IRT | Item response theory describes the chance of a correct answer as a function of a learner's ability and the item's difficulty (and sometimes discrimination and guessing). The same learner is less likely to answer a hard item correctly. | Predictions must account for how hard the next question is, and difficulty should be learned from other students. |
| Children's data, fairness and accountability | Learner data is sensitive, and children's data has special protection (COPPA and FERPA in the United States, the GDPR with special rules for minors in Europe). Mastery estimates can affect grades, tracks or perception, so they should be explainable, checked for differences between groups and never the only basis for a high-stakes decision. | Consent, retention limits and explanations are product requirements, and they favour interpretable models alongside predictive ones. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Skill complementarity | Difference in mastery profile. Peer benefit. | Leakage risk to design against: KT. |
| A signal-versus-noise trap in this use case: Composition | The true signal is complementary skills with schedule fit; the common noise is homogeneous ability grouping. | Mixed-skill groups benefit both with scaffolding. |

**Ask the experts**

- [ ] What exactly does "Group-size limits" mean in practice for peer grouping for collaborative learning: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Skill complementarity" and "Schedule overlap", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Group task outcomes" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: optimising averages, and who can confirm the cut-off times and splits?
- [ ] How often does "Absent students break groups" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Peer learning | Students learning together in groups, where group composition affects outcomes. |
| Mastery learning | An instructional approach in which learners move on only after demonstrating mastery of a skill. |
| Learning gain | The improvement in a learner's measured knowledge between two points, the outcome the system exists to increase. |
| Ability (theta) | A learner's latent proficiency in item response theory. |
| Learning management system (LMS) | The platform where courses, materials, submissions and grades are managed. |
| Knowledge component (skill) | A unit of knowledge or skill that can be practised and assessed, the level at which mastery is tracked. |
| Q-matrix | The mapping that says which skills each question item exercises. |
| Item | One question or exercise a learner can answer. |
| Mastery | A learner's hidden state of knowing a skill well enough, usually represented as a probability. |
| BKT | Bayesian Knowledge Tracing: a hidden Markov model of mastery with learn, guess and slip parameters per skill. |
| Motif | A small recurring subgraph pattern such as a cycle or a fan-out. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
