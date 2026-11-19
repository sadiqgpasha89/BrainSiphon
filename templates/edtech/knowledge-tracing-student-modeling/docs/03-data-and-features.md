# Knowledge Tracing & Student Modelling: data and feature specification

> Generated from the blueprint `edtech/knowledge-tracing-student-modeling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Knowledge Tracing & Student Modelling · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Knowledge Tracing & Student Modelling": Estimate each learner's evolving mastery per skill from their answer history to drive practice selection and progress reports. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Predicting next answers with student leakage.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Recent correctness with recency weighting | exponentially weighted correct rate per skill | Estimates how well the learner knows the skill right now | Order by timestamp not insertion |   |   |   |
| Item difficulty parameter | IRT difficulty of the question | Separates easy from hard | Calibrate on other students |   |   |   |
| Time-since-last-practice | gap since skill practice | Captures forgetting, so mastery decays between sessions | Use server-side timestamps because device clocks drift |   |   |   |
| Prior failures on the skill | count of earlier wrong answers on the same skill | Persistent difficulty is among the strongest predictors of the next miss | Count only answers given before the current one |   |   |   |
| Question difficulty from other learners | smoothed correct rate of the question among training students | Separates hard questions from weak learners | Compute on training students only, never including the learner being scored |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Model | Interpretable BKT/PFA or attention-based KT with skill mapping | Deep model without skill structure | Opaque models predict next answers but can't explain mastery |
| Leakage | Split by student and by time | Random interaction splits | Random splits leak a student's own future answers |
| Calibration | Mastery probabilities calibrated per skill | Raw model scores shown to learners as mastery | An overconfident 95% that is really 70% makes the tutor stop practice too early |
| Practice selection | Treating practice choice as depending on the model itself | Assuming answers come from random exercises | The tutor gives weak skills more practice, so naive accuracy comparisons across skills mislead |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Student ID embedding | memorises individuals, fails for new students |
| Total questions answered | confounded with engagement |
| Session length in minutes | reflects when the learner logged in rather than what they know |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Recent correctness with recency weighting inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: order by timestamp not insertion. |
| Item difficulty parameter inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: calibrate on other students. |
| Time-since-last-practice inputs | Content team | Assessment platform and item bank | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: use server-side timestamps because device clocks drift. |
| Prior failures on the skill inputs | Learning engineering | Curriculum and skill taxonomy | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: count only answers given before the current one. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: knowledge_tracing_student_modeling_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: recent_correctness_with_recency, type: double, nullable: false }
    - { name: item_difficulty_parameter, type: double, nullable: false }
    - { name: time_since_last_practice, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Recent correctness with recency weighting and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Item difficulty parameter against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Recent correctness with recency weighting, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Riiid Answer Correctness Prediction (EdNet-based) | https://www.kaggle.com/c/riiid-test-answer-prediction | Kaggle competition rules; free Kaggle login | About 100 million answers from roughly 400,000 students on TOEIC preparation questions with timestamps, question tags and elapsed time, the largest public knowledge-tracing benchmark | The competition data is anonymised and large; subsample students, split by student and keep rows in timestamp order |
| EdNet (Santa tutoring service) | https://github.com/riiid/ednet | CC BY-NC 4.0 per the repository; check it before commercial use | Interaction logs from more than 780,000 users over two years, with several levels of detail from question answers to lecture views | Non-commercial licence, and the full set is hundreds of gigabytes; start with the smallest KT1 files |
| ASSISTments public datasets | https://sites.google.com/site/assistmentsdata/ | Research terms stated on each dataset page | Skill-builder and other maths tutoring logs with skill ids, correctness and attempt counts, the classic benchmark for BKT and PFA | Several known duplicates and ordering issues in older releases; deduplicate and order by timestamp before modelling |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE knowledge_tracing_student_forecasts (
  series_id      TEXT        NOT NULL,
  origin         TIMESTAMPTZ NOT NULL,   -- the as_of the forecast was made at
  target_period  DATE        NOT NULL,
  horizon_step   SMALLINT    NOT NULL,
  p10            REAL        NOT NULL,
  p50            REAL        NOT NULL,
  p90            REAL        NOT NULL,
  model_version  TEXT        NOT NULL,
  is_fallback    BOOLEAN     NOT NULL DEFAULT FALSE,
  PRIMARY KEY (series_id, origin, target_period)
) PARTITION BY RANGE (origin);

-- actuals land after the fact; joining on (series_id, target_period) gives forecast error by horizon
CREATE TABLE knowledge_tracing_student_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE knowledge_tracing_student_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Skills, items and the Q-matrix | Curricula are broken into knowledge components, or skills, such as adding fractions. Each question (item) is tagged with one or more skills; the table of those tags is the Q-matrix. Mastery is tracked per skill, not per question. | Everything depends on the skill map. When the curriculum changes it, historical mastery can become wrong, so version it. |
| Mastery is hidden; answers are noisy evidence | A learner may guess correctly without knowing, or slip and answer wrongly despite knowing. Models such as Bayesian Knowledge Tracing treat mastery as a hidden state with parameters for the chance of learning on each attempt, guessing and slipping. Performance Factors Analysis instead predicts the next answer from counts of earlier successes and failures. | A correct answer is not learning. The model must reason about evidence, and a single success should not declare mastery. |
| Item difficulty and ability: IRT | Item response theory describes the chance of a correct answer as a function of a learner's ability and the item's difficulty (and sometimes discrimination and guessing). The same learner is less likely to answer a hard item correctly. | Predictions must account for how hard the next question is, and difficulty should be learned from other students. |
| Forgetting and spacing | Memory decays without practice, following a forgetting curve, and reviewing at spaced intervals makes learning last. Long breaks, holidays and exam periods change what a learner can do. | Time since practice is a feature, and mastery shown to learners after a long break should decay. |
| Adaptive practice shapes the data | Mastery learning keeps assigning practice on a skill until the estimate crosses a threshold, and tutors choose questions near the learner's level. Learners who struggle get more attempts, so the data are not a random sample of questions, and some learners get stuck practising without progress, called wheel spinning. | Naive comparisons across skills or learners are biased by the system's own choices, and you must detect stuck learners rather than assigning more of the same. |
| Children's data, fairness and accountability | Learner data is sensitive, and children's data has special protection (COPPA and FERPA in the United States, the GDPR with special rules for minors in Europe). Mastery estimates can affect grades, tracks or perception, so they should be explainable, checked for differences between groups and never the only basis for a high-stakes decision. | Consent, retention limits and explanations are product requirements, and they favour interpretable models alongside predictive ones. |

**Ask the experts**

- [ ] Who owns the skill map, how often does it change, and how are historical records migrated when it does?
- [ ] What do teachers and learners mean by mastered, and what threshold would they accept for moving on?
- [ ] How are practice questions chosen today, and is any part of it randomised so we can learn unbiased difficulty?
- [ ] What learner data are we allowed to use for training: consent, age limits, retention periods and school agreements?
- [ ] How will mastery estimates be shown to learners, teachers and parents, and what decisions may depend on them?

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
| Rasch model | The simplest IRT model, with one difficulty parameter per item and equal discrimination. |
| Forgetting curve | The decline of retention over time without review. |
| Spaced repetition | Scheduling reviews at increasing intervals to make learning last. |
| Opportunity count | How many times a learner has practised a skill so far. |
| Wheel spinning | A learner repeatedly practising a skill without reaching mastery, a sign the practice is not working. |
| Mastery learning | An instructional approach in which learners move on only after demonstrating mastery of a skill. |
| Formative / summative assessment | Assessment used to guide learning along the way, versus a final judgement of what was learned. |
| Learning gain | The improvement in a learner's measured knowledge between two points, the outcome the system exists to increase. |
| Zone of proximal development | The range of tasks a learner can do with some support but not yet alone, where practice helps most. |
| COPPA / FERPA | US laws protecting children's online data and education records. |
