# Course & Career Path Recommendation: data and feature specification

> Generated from the blueprint `edtech/course-recommendation-career-paths` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Course & Career Path Recommendation · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Course & Career Path Recommendation": Recommend courses and learning paths aligned with learner goals and labour-market skills, balancing interest and career outcomes. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on enrolments that reflect past recommendations.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Skill-gap vector | target role skills minus current skills | Direction | Skills graph |   |   |   |
| Course completion likelihood | predicted completion for learner | Realism | Calibration |   |   |   |
| Market demand for skill | job-posting trends | Value | Data freshness |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Goals | Goal-conditioned recommendations | Popularity-based | Popular courses don't fit individual goals |
| Outcomes | Optimise completion and outcomes | Clicks | Clicks pick shiny courses learners abandon |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Course title popularity | rich-get-richer |
| Learner device | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Skill-gap vector inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: skills graph. |
| Course completion likelihood inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: calibration. |
| Market demand for skill inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: data freshness. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: course_recommendation_career_paths_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: skill_gap_vector, type: double, nullable: false }
    - { name: course_completion_likelihood, type: double, nullable: false }
    - { name: market_demand_for_skill, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Skill-gap vector and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Course completion likelihood against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Skill-gap vector, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MovieLens datasets | https://grouplens.org/datasets/movielens/ | GroupLens research terms (see the page) | Explicit ratings from 100K to 25M with timestamps, the standard recommender benchmark | Explicit ratings are not implicit clicks; film domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EdNet (Santa tutoring service) | https://github.com/riiid/ednet | CC BY-NC 4.0 per the repository | Interaction logs from more than 780,000 users over two years | Non-commercial licence and very large. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Retailrocket recommender system dataset | https://www.kaggle.com/datasets/retailrocket/ecommerce-dataset | CC BY-NC-SA 4.0 (see the dataset page) | About 2.7 million view, add-to-cart and purchase events with item properties | Anonymised ids and no dwell time. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE course_recommendation_career_impressions (
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

CREATE TABLE course_recommendation_career_feedback (
  impression_id  UUID        NOT NULL REFERENCES course_recommendation_career_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE course_recommendation_career_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Course & Career Path Recommendation": Recommend courses and learning paths aligned with learner goals and labour-market skills, balancing interest and career outcomes. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Recommending learning content and paths | Learners choose courses, exercises and next steps. Prerequisite structures (a graph of skills), goals, time available and motivation shape what is useful; the aim is learning gain, not clicks. | Engagement and learning can diverge: the most clicked content may not be the most effective. |
| Skills, items and the Q-matrix | Curricula are broken into knowledge components, or skills, such as adding fractions. Each question (item) is tagged with one or more skills; the table of those tags is the Q-matrix. Mastery is tracked per skill, not per question. | Everything depends on the skill map. When the curriculum changes it, historical mastery can become wrong, so version it. |
| Children's data, fairness and accountability | Learner data is sensitive, and children's data has special protection (COPPA and FERPA in the United States, the GDPR with special rules for minors in Europe). Mastery estimates can affect grades, tracks or perception, so they should be explainable, checked for differences between groups and never the only basis for a high-stakes decision. | Consent, retention limits and explanations are product requirements, and they favour interpretable models alongside predictive ones. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Graph learning and its pitfalls | Graph neural networks and graph features (degree, centrality, personalised PageRank, motifs) propagate information along edges. Leakage hides in the split: random edge splits put future or neighbouring information into training; time-based and node-based splits are safer. | Evaluate on whole communities or later periods, and compare with simple hand-built graph features before adding a GNN. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Skill-gap vector | Target role skills minus current skills. Direction. | Leakage risk to design against: Skills graph. |
| A signal-versus-noise trap in this use case: Goals | The true signal is goal-conditioned recommendations; the common noise is popularity-based. | Popular courses don't fit individual goals. |

**Ask the experts**

- [ ] What exactly does "Diversity and fairness" mean in practice for course & career path recommendation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Skill-gap vector" and "Course completion likelihood", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Completion rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on enrolments that reflect past recommendations, and who can confirm the cut-off times and splits?
- [ ] How often does "Skills taxonomy changes" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Learning path | An ordered sequence of content or skills tailored to a learner's goal. |
| Prerequisite graph | A directed graph of which skills must be learned before others. |
| Opportunity count | How many times a learner has practised a skill so far. |
| Mastery learning | An instructional approach in which learners move on only after demonstrating mastery of a skill. |
| Learning gain | The improvement in a learner's measured knowledge between two points, the outcome the system exists to increase. |
| Knowledge component (skill) | A unit of knowledge or skill that can be practised and assessed, the level at which mastery is tracked. |
| Q-matrix | The mapping that says which skills each question item exercises. |
| Item | One question or exercise a learner can answer. |
| Mastery | A learner's hidden state of knowing a skill well enough, usually represented as a probability. |
| BKT | Bayesian Knowledge Tracing: a hidden Markov model of mastery with learn, guess and slip parameters per skill. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
| Collaborative filtering | Recommending items liked by users similar to you. |
| Two-tower model | A retrieval model with separate networks for user and item whose embeddings are compared by dot product. |
| Link prediction | Predicting whether an edge exists or will form between two nodes. |
| Node / edge | The entities in a graph and the relationships between them. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Hit rate@K | The share of cases in which the true item appears in the top K. |
