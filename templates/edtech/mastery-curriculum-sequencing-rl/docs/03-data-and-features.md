# Mastery-Based Curriculum Sequencing: data and feature specification

> Generated from the blueprint `edtech/mastery-curriculum-sequencing-rl` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Mastery-Based Curriculum Sequencing · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Mastery-Based Curriculum Sequencing": Learn long-horizon curriculum sequences that maximise mastery across a skill graph, accounting for prerequisites and forgetting. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulator trained on the same logs as the policy.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Prerequisite readiness | mastery of parent skills | Gate | DAG |   |   |   |
| Forgetting-adjusted mastery | decayed mastery | Review timing | Memory model |   |   |   |
| Expected gain of an activity | model-estimated gain | Reward | KT |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Evaluation | Off-policy evaluation with simulators validated on data | Trust the simulator | Student simulators are crude |
| Safety | Conservative offline RL | Online exploration on children | Experiments must be low-risk |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Activity popularity | feedback loop |
| Learner ID | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Prerequisite readiness inputs | Learning engineering | Learning management system (LMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: DAG. |
| Forgetting-adjusted mastery inputs | Registrar and data office | Student information system (SIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: memory model. |
| Expected gain of an activity inputs | Content team | Content and item bank | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: KT. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: mastery_curriculum_sequencing_rl_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: prerequisite_readiness, type: double, nullable: false }
    - { name: forgetting_adjusted_mastery, type: double, nullable: false }
    - { name: expected_gain_of_an_activity, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Prerequisite readiness and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Forgetting-adjusted mastery against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Prerequisite readiness, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open Bandit Dataset | https://research.zozo.com/data.html | CC BY 4.0 (see the page) | Logged bandit feedback from a fashion e-commerce site with propensities, for off-policy evaluation | One platform and a short period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE mastery_curriculum_sequencing_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE mastery_curriculum_sequencing_outputs (
  run_id TEXT NOT NULL REFERENCES mastery_curriculum_sequencing_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE mastery_curriculum_sequencing_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE mastery_curriculum_sequencing_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Mastery-Based Curriculum Sequencing": Learn long-horizon curriculum sequences that maximise mastery across a skill graph, accounting for prerequisites and forgetting. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Skills, items and the Q-matrix | Curricula are broken into knowledge components, or skills, such as adding fractions. Each question (item) is tagged with one or more skills; the table of those tags is the Q-matrix. Mastery is tracked per skill, not per question. | Everything depends on the skill map. When the curriculum changes it, historical mastery can become wrong, so version it. |
| Children's data, fairness and accountability | Learner data is sensitive, and children's data has special protection (COPPA and FERPA in the United States, the GDPR with special rules for minors in Europe). Mastery estimates can affect grades, tracks or perception, so they should be explainable, checked for differences between groups and never the only basis for a high-stakes decision. | Consent, retention limits and explanations are product requirements, and they favour interpretable models alongside predictive ones. |
| Recommending learning content and paths | Learners choose courses, exercises and next steps. Prerequisite structures (a graph of skills), goals, time available and motivation shape what is useful; the aim is learning gain, not clicks. | Engagement and learning can diverge: the most clicked content may not be the most effective. |
| Learning from logs: off-policy evaluation | Most business data were generated by an earlier policy. To judge a new policy offline you need the probability with which each logged action was chosen; estimators such as inverse propensity weighting, self-normalised weighting and doubly robust methods correct for the difference, with a bias-variance trade-off. | Never evaluate a new policy only on the rows where it agrees with the old one; log propensities from day one. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Prerequisite readiness | Mastery of parent skills. Gate. | Leakage risk to design against: DAG. |
| A signal-versus-noise trap in this use case: Evaluation | The true signal is off-policy evaluation with simulators validated on data; the common noise is trust the simulator. | Student simulators are crude. |

**Ask the experts**

- [ ] What exactly does "Offline learning from logs" mean in practice for mastery-based curriculum sequencing: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Prerequisite readiness" and "Forgetting-adjusted mastery", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Mastery gain vs control" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: simulator trained on the same logs as the policy, and who can confirm the cut-off times and splits?
- [ ] How often does "Distribution shift when the policy changes behaviour" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Learning gain | The improvement in a learner's measured knowledge between two points, the outcome the system exists to increase. |
| Prerequisite graph | A directed graph of which skills must be learned before others. |
| Mastery learning | An instructional approach in which learners move on only after demonstrating mastery of a skill. |
| Knowledge component (skill) | A unit of knowledge or skill that can be practised and assessed, the level at which mastery is tracked. |
| Q-matrix | The mapping that says which skills each question item exercises. |
| Item | One question or exercise a learner can answer. |
| Mastery | A learner's hidden state of knowing a skill well enough, usually represented as a probability. |
| BKT | Bayesian Knowledge Tracing: a hidden Markov model of mastery with learn, guess and slip parameters per skill. |
| Guess / slip | The chance of answering correctly without mastery (guess) or incorrectly despite mastery (slip). |
| PFA | Performance Factors Analysis: logistic regression predicting correctness from prior successes and failures on the skill. |
| Policy | The rule that maps a situation to an action. |
| Reward | The number the system tries to maximise over time. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Markov decision process | A mathematical model of sequential decisions with states, actions, rewards and transitions. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Distribution shift | A change in the data a model sees compared with training. |
| Doubly robust estimator | An off-policy estimator that combines a reward model with propensity weighting. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
