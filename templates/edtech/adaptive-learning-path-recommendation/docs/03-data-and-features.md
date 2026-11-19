# Adaptive Learning Path Recommendation: data and feature specification

> Generated from the blueprint `edtech/adaptive-learning-path-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Adaptive Learning Path Recommendation · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Adaptive Learning Path Recommendation": Recommend the next activity for each learner that maximises mastery gain while sustaining engagement and respecting prerequisites. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising engagement instead of learning.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Zone of proximal development fit | probability of success near 70% | Productive difficulty | Calibrated KT |   |   |   |
| Prerequisite satisfaction | mastery of required skills | Readiness | Graph |   |   |   |
| Recent frustration indicators | quick abandon and repeated failures | Fatigue | Event features |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Objective | Learning gain (mastery delta) | Click-through or time-on-task | Engagement-optimised paths are entertaining but don't teach |
| Structure | Prerequisite graph constraints | Pure collaborative filtering | CF suggests popular content the learner isn't ready for |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Content popularity | rich-get-richer |
| Device type | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Zone of proximal development fit inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: calibrated KT. |
| Prerequisite satisfaction inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: graph. |
| Recent frustration indicators inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: event features. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: adaptive_learning_path_recommendation_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: zone_of_proximal_development_fit, type: double, nullable: false }
    - { name: prerequisite_satisfaction, type: double, nullable: false }
    - { name: recent_frustration_indicators, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Zone of proximal development fit and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Prerequisite satisfaction against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Zone of proximal development fit, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open Bandit Dataset | https://research.zozo.com/data.html | CC BY 4.0 (see the page) | Logged bandit feedback from a fashion e-commerce site with propensities, for off-policy evaluation | One platform and a short period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE adaptive_learning_path_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  zone_of_proximal_development_fit   DOUBLE PRECISION,
  prerequisite_satisfaction          DOUBLE PRECISION,
  recent_frustration_indicators      DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE adaptive_learning_path_decisions (
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
CREATE TABLE adaptive_learning_path_labels (
  decision_id    UUID        NOT NULL REFERENCES adaptive_learning_path_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Adaptive Learning Path Recommendation": Recommend the next activity for each learner that maximises mastery gain while sustaining engagement and respecting prerequisites. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Recommending learning content and paths | Learners choose courses, exercises and next steps. Prerequisite structures (a graph of skills), goals, time available and motivation shape what is useful; the aim is learning gain, not clicks. | Engagement and learning can diverge: the most clicked content may not be the most effective. |
| Skills, items and the Q-matrix | Curricula are broken into knowledge components, or skills, such as adding fractions. Each question (item) is tagged with one or more skills; the table of those tags is the Q-matrix. Mastery is tracked per skill, not per question. | Everything depends on the skill map. When the curriculum changes it, historical mastery can become wrong, so version it. |
| Item difficulty and ability: IRT | Item response theory describes the chance of a correct answer as a function of a learner's ability and the item's difficulty (and sometimes discrimination and guessing). The same learner is less likely to answer a hard item correctly. | Predictions must account for how hard the next question is, and difficulty should be learned from other students. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Zone of proximal development fit | Probability of success near 70%. Productive difficulty. | Leakage risk to design against: Calibrated KT. |
| A signal-versus-noise trap in this use case: Objective | The true signal is learning gain (mastery delta); the common noise is click-through or time-on-task. | Engagement-optimised paths are entertaining but don't teach. |

**Ask the experts**

- [ ] What exactly does "Prerequisite graph" mean in practice for adaptive learning path recommendation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Zone of proximal development fit" and "Prerequisite satisfaction", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Mastery gain per week" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: optimising engagement instead of learning, and who can confirm the cut-off times and splits?
- [ ] How often does "Mastery estimates wrong for a learner" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Learning gain | The improvement in a learner's measured knowledge between two points, the outcome the system exists to increase. |
| Zone of proximal development | The range of tasks a learner can do with some support but not yet alone, where practice helps most. |
| Learning path | An ordered sequence of content or skills tailored to a learner's goal. |
| Mastery learning | An instructional approach in which learners move on only after demonstrating mastery of a skill. |
| Difficulty / discrimination | How hard an item is, and how sharply it separates stronger from weaker learners. |
| Formative / summative assessment | Assessment used to guide learning along the way, versus a final judgement of what was learned. |
| Prerequisite graph | A directed graph of which skills must be learned before others. |
| Knowledge component (skill) | A unit of knowledge or skill that can be practised and assessed, the level at which mastery is tracked. |
| Q-matrix | The mapping that says which skills each question item exercises. |
| Item | One question or exercise a learner can answer. |
| Collaborative filtering | Recommending items liked by users similar to you. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
| Popularity bias | The tendency to recommend already-popular items. |
| Negative sampling | Choosing non-chosen items as negatives for training; easy negatives inflate offline metrics. |
| Reward | The number the system tries to maximise over time. |
| Policy | The rule that maps a situation to an action. |
| Contextual bandit | A decision problem where each round has a context, an action is chosen and only its reward is seen. |
| Thompson sampling / UCB | Bandit methods that explore in proportion to uncertainty. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
