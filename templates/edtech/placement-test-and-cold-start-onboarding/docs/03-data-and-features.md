# Placement Test & Cold-Start Onboarding: data and feature specification

> Generated from the blueprint `edtech/placement-test-and-cold-start-onboarding` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Placement Test & Cold-Start Onboarding · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Placement Test & Cold-Start Onboarding": Estimate a new learner's level in a few questions to place them in the right starting content and initialise the learner model. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on motivated volunteers.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Expected information gain per item | EIG of next question | Selection | IRT |   |   |   |
| Prior from age and grade | demographic prior | Initial ability | Consent |   |   |   |
| Response time pattern | time per response | Guessing | Timing |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Efficiency | Adaptive placement via expected information gain | Fixed placement form | Fixed forms waste questions |
| Prior | Use registration context as a prior | Start from zero knowledge | Priors cut questions needed |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Device type | weak |
| Time of day | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Expected information gain per item inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: IRT. |
| Prior from age and grade inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: consent. |
| Response time pattern inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: timing. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: placement_test_and_cold_start_onboarding_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: expected_information_gain_per_item, type: double, nullable: false }
    - { name: prior_from_age_and_grade, type: double, nullable: false }
    - { name: response_time_pattern, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Expected information gain per item and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Prior from age and grade against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Expected information gain per item, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Riiid Answer Correctness Prediction (EdNet-based) | https://www.kaggle.com/c/riiid-test-answer-prediction | Competition rules; free Kaggle login | About 100 million answers from roughly 400,000 students with timestamps and question tags | Anonymised and large; split by student. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ASSISTments public datasets | https://sites.google.com/site/assistmentsdata/ | Research terms on each dataset page | Maths tutoring logs with skill ids, correctness and attempt counts | Known duplicates and ordering issues in older releases. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open University Learning Analytics Dataset (OULAD) | https://analyse.kmi.open.ac.uk/open_dataset | CC BY 4.0 (see the page) | Student demographics, VLE click streams and outcomes for 32,000 students | UK distance learning; coarse click aggregation. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE placement_test_and_cold_start_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  expected_information_gain_per_item DOUBLE PRECISION,
  prior_from_age_and_grade           DOUBLE PRECISION,
  response_time_pattern              DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE placement_test_and_cold_start_decisions (
  decision_id    UUID PRIMARY KEY,
  entity_id      TEXT        NOT NULL,
  decided_at     TIMESTAMPTZ NOT NULL,
  model_version  TEXT        NOT NULL,
  score          REAL,
  decision       TEXT        NOT NULL,
  reason_codes   JSONB,
  latency_ms     REAL,
  degraded       BOOLEAN     NOT NULL DEFAULT FALSE
) PARTITION BY RANGE (decided_at);

-- labels arrive late and may be revised; keep source + delay for survival-aware training
CREATE TABLE placement_test_and_cold_start_labels (
  decision_id    UUID        NOT NULL REFERENCES placement_test_and_cold_start_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Placement Test & Cold-Start Onboarding": Estimate a new learner's level in a few questions to place them in the right starting content and initialise the learner model. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Item difficulty and ability: IRT | Item response theory describes the chance of a correct answer as a function of a learner's ability and the item's difficulty (and sometimes discrimination and guessing). The same learner is less likely to answer a hard item correctly. | Predictions must account for how hard the next question is, and difficulty should be learned from other students. |
| Skills, items and the Q-matrix | Curricula are broken into knowledge components, or skills, such as adding fractions. Each question (item) is tagged with one or more skills; the table of those tags is the Q-matrix. Mastery is tracked per skill, not per question. | Everything depends on the skill map. When the curriculum changes it, historical mastery can become wrong, so version it. |
| Mastery is hidden; answers are noisy evidence | A learner may guess correctly without knowing, or slip and answer wrongly despite knowing. Models such as Bayesian Knowledge Tracing treat mastery as a hidden state with parameters for the chance of learning on each attempt, guessing and slipping. Performance Factors Analysis instead predicts the next answer from counts of earlier successes and failures. | A correct answer is not learning. The model must reason about evidence, and a single success should not declare mastery. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Expected information gain per item | EIG of next question. Selection. | Leakage risk to design against: IRT. |
| A signal-versus-noise trap in this use case: Efficiency | The true signal is adaptive placement via expected information gain; the common noise is fixed placement form. | Fixed forms waste questions. |

**Ask the experts**

- [ ] What exactly does "Under 10 questions" mean in practice for placement test & cold-start onboarding: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Expected information gain per item" and "Prior from age and grade", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Day-7 retention" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating on motivated volunteers, and who can confirm the cut-off times and splits?
- [ ] How often does "Learners guess randomly" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Placement test | A short assessment that places a learner at the right starting level. |
| Item | One question or exercise a learner can answer. |
| Guess / slip | The chance of answering correctly without mastery (guess) or incorrectly despite mastery (slip). |
| Ability (theta) | A learner's latent proficiency in item response theory. |
| Learning gain | The improvement in a learner's measured knowledge between two points, the outcome the system exists to increase. |
| Knowledge component (skill) | A unit of knowledge or skill that can be practised and assessed, the level at which mastery is tracked. |
| Q-matrix | The mapping that says which skills each question item exercises. |
| Mastery | A learner's hidden state of knowing a skill well enough, usually represented as a probability. |
| BKT | Bayesian Knowledge Tracing: a hidden Markov model of mastery with learn, guess and slip parameters per skill. |
| PFA | Performance Factors Analysis: logistic regression predicting correctness from prior successes and failures on the skill. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Exploration / exploitation | Trying new actions to learn versus using the best known one. |
| Doubly robust estimator | An off-policy estimator that combines a reward model with propensity weighting. |
| Distribution shift | A change in the data a model sees compared with training. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
