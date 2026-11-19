# Gamification & Reward Optimisation: data and feature specification

> Generated from the blueprint `edtech/gamification-reward-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Gamification & Reward Optimisation · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Gamification & Reward Optimisation": Tune badges, streaks and rewards to increase sustained learning effort without manipulative or anxiety-inducing design. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Rewarding time-on-app.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Intrinsic engagement proxy | voluntary extra practice | Healthy motivation | Definition |   |   |   |
| Streak anxiety indicators | drop-off after breaking a streak | Harm | Event patterns |   |   |   |
| Learning-gain surrogate | mastery change | Outcome | KT |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Objective | Learning outcomes and wellbeing | Daily active users | DAU optimisation encourages compulsive design |
| Experimentation | Long holdouts | Short A/B tests | Short tests reward novelty effects |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Badge count | vanity metric |
| Session length | not learning |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Intrinsic engagement proxy inputs | Learning engineering | Learning management system (LMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: definition. |
| Streak anxiety indicators inputs | Registrar and data office | Student information system (SIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: event patterns. |
| Learning-gain surrogate inputs | Content team | Content and item bank | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: KT. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: gamification_reward_optimization_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: intrinsic_engagement_proxy, type: double, nullable: false }
    - { name: streak_anxiety_indicators, type: double, nullable: false }
    - { name: learning_gain_surrogate, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Intrinsic engagement proxy and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Streak anxiety indicators against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Intrinsic engagement proxy, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open Bandit Dataset | https://research.zozo.com/data.html | CC BY 4.0 (see the page) | Logged bandit feedback from a fashion e-commerce site with propensities, for off-policy evaluation | One platform and a short period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE gamification_reward_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE gamification_reward_outputs (
  run_id TEXT NOT NULL REFERENCES gamification_reward_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE gamification_reward_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE gamification_reward_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Gamification & Reward Optimisation": Tune badges, streaks and rewards to increase sustained learning effort without manipulative or anxiety-inducing design. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Engagement, retention and early warning | Students and learners drop out for reasons visible in activity data weeks earlier. Models flag risk so teachers or support staff can reach out; notifications and gamification aim to sustain habits but can create anxiety or fatigue. | Interventions must be tested for causal benefit, because predicting dropout is not the same as preventing it. |
| Adaptive practice shapes the data | Mastery learning keeps assigning practice on a skill until the estimate crosses a threshold, and tutors choose questions near the learner's level. Learners who struggle get more attempts, so the data are not a random sample of questions, and some learners get stuck practising without progress, called wheel spinning. | Naive comparisons across skills or learners are biased by the system's own choices, and you must detect stuck learners rather than assigning more of the same. |
| Children's data, fairness and accountability | Learner data is sensitive, and children's data has special protection (COPPA and FERPA in the United States, the GDPR with special rules for minors in Europe). Mastery estimates can affect grades, tracks or perception, so they should be explainable, checked for differences between groups and never the only basis for a high-stakes decision. | Consent, retention limits and explanations are product requirements, and they favour interpretable models alongside predictive ones. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Intrinsic engagement proxy | Voluntary extra practice. Healthy motivation. | Leakage risk to design against: Definition. |
| A signal-versus-noise trap in this use case: Objective | The true signal is learning outcomes and wellbeing; the common noise is daily active users. | DAU optimisation encourages compulsive design. |

**Ask the experts**

- [ ] What exactly does "Ethical design for minors" mean in practice for gamification & reward optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Intrinsic engagement proxy" and "Streak anxiety indicators", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Learning gain per active week" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: rewarding time-on-app, and who can confirm the cut-off times and splits?
- [ ] How often does "Rewards crowd out intrinsic motivation" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Gamification | Using points, streaks and badges to motivate learning. |
| Streak | Consecutive days of practice, a common habit-forming mechanic. |
| Learning gain | The improvement in a learner's measured knowledge between two points, the outcome the system exists to increase. |
| Notification fatigue | Learners ignoring or disabling reminders because there are too many. |
| Opportunity count | How many times a learner has practised a skill so far. |
| Mastery learning | An instructional approach in which learners move on only after demonstrating mastery of a skill. |
| Formative / summative assessment | Assessment used to guide learning along the way, versus a final judgement of what was learned. |
| Hard / soft constraint | A rule that must not be broken versus a preference to be satisfied as far as possible. |
| Reward | The number the system tries to maximise over time. |
| Reward shaping | Adding extra reward terms to guide learning, which can cause unintended behaviour. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Policy | The rule that maps a situation to an action. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Guardrail metric | A metric that must not get worse when optimising the main objective. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
