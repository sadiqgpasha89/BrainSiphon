# Learning Outcome Uplift Modelling: data and feature specification

> Generated from the blueprint `edtech/learning-outcome-uplift-modeling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Learning Outcome Uplift Modelling · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Learning Outcome Uplift Modelling": Estimate which learners benefit from which interventions (tutoring, nudges, resources) to allocate scarce support effectively. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using observational assignment data.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Pre-intervention mastery | baseline mastery | Heterogeneity | Window |   |   |   |
| Engagement history | prior engagement | Responsiveness | Window |   |   |   |
| Context variables | class and school context | Moderators | Data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Allocation | Allocate by estimated benefit and need | Highest predicted risk | The highest risk may not benefit |
| Ethics | Equity-aware allocation | Pure efficiency | Efficiency can neglect disadvantaged groups |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Post-intervention variables | collider bias |
| Teacher ID | personal |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Pre-intervention mastery inputs | Learning engineering | Learning management system (LMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: window. |
| Engagement history inputs | Registrar and data office | Student information system (SIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: window. |
| Context variables inputs | Content team | Content and item bank | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: learning_outcome_uplift_modeling_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: pre_intervention_mastery, type: double, nullable: false }
    - { name: engagement_history, type: double, nullable: false }
    - { name: context_variables, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Pre-intervention mastery and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Engagement history against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Pre-intervention mastery, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo AI Lab datasets | https://ailab.criteo.com/ressources/ | Research-use terms on the Criteo AI Lab page | Large click logs, uplift, attribution and counterfactual datasets from Criteo | Terabyte scale for some sets; research-use terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Porto Seguro Safe Driver Prediction | https://www.kaggle.com/c/porto-seguro-safe-driver-prediction | Competition rules; free Kaggle login | 600K insurance policies with anonymised features and a claim-filed label | Anonymised features limit domain feature work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE learning_outcome_uplift_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE learning_outcome_uplift_outputs (
  run_id TEXT NOT NULL REFERENCES learning_outcome_uplift_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE learning_outcome_uplift_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE learning_outcome_uplift_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Learning Outcome Uplift Modelling": Estimate which learners benefit from which interventions (tutoring, nudges, resources) to allocate scarce support effectively. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Mastery is hidden; answers are noisy evidence | A learner may guess correctly without knowing, or slip and answer wrongly despite knowing. Models such as Bayesian Knowledge Tracing treat mastery as a hidden state with parameters for the chance of learning on each attempt, guessing and slipping. Performance Factors Analysis instead predicts the next answer from counts of earlier successes and failures. | A correct answer is not learning. The model must reason about evidence, and a single success should not declare mastery. |
| Assessment: items, scoring and psychometrics | Tests and quizzes are built from items with known difficulty and discrimination, calibrated with item response theory so scores are comparable across forms. Adaptive tests choose the next question to pin down ability quickly. Automated scoring of essays and short answers must agree with trained human raters and be audited for bias. | Scores affect grades and opportunities, so reliability, fairness and agreement with human scoring are formal requirements, not nice-to-haves. |
| AI tutors and teacher copilots | Tutoring assistants guide students with hints and questions; teacher copilots draft lessons, questions and feedback. Good tutoring avoids giving away answers, stays within the curriculum and flags misconceptions; safety rules for minors apply. | Evaluate on learning outcomes and teacher time saved, and test explicitly for answer leakage and off-curriculum content. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Pre-intervention mastery | Baseline mastery. Heterogeneity. | Leakage risk to design against: Window. |
| A signal-versus-noise trap in this use case: Allocation | The true signal is allocate by estimated benefit and need; the common noise is highest predicted risk. | The highest risk may not benefit. |

**Ask the experts**

- [ ] What exactly does "Randomised pilots" mean in practice for learning outcome uplift modelling: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Pre-intervention mastery" and "Engagement history", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Learning gain per support hour" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using observational assignment data, and who can confirm the cut-off times and splits?
- [ ] How often does "Small pilots produce noisy effects" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Uplift (learning) | The extra learning gain caused by an intervention compared with none. |
| Learning gain | The improvement in a learner's measured knowledge between two points, the outcome the system exists to increase. |
| Peer learning | Students learning together in groups, where group composition affects outcomes. |
| Mastery learning | An instructional approach in which learners move on only after demonstrating mastery of a skill. |
| Formative / summative assessment | Assessment used to guide learning along the way, versus a final judgement of what was learned. |
| Formative feedback | Comments that help a learner improve while they are still learning. |
| Learning management system (LMS) | The platform where courses, materials, submissions and grades are managed. |
| Learning analytics | Using learner data to understand and improve learning and teaching. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
