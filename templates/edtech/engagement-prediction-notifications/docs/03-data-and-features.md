# Learner Engagement Prediction & Notifications: data and feature specification

> Generated from the blueprint `edtech/engagement-prediction-notifications` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Learner Engagement Prediction & Notifications · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Learner Engagement Prediction & Notifications": Predict lapse risk and send the right reminder at the right time to keep learners practising, without notification fatigue. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Optimising opens.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Lapse hazard | probability of missing the next 3 days | Targeting | Survival |   |   |   |
| Preferred study time | personal time-of-day | Timing | History |   |   |   |
| Notification fatigue | recent notifications and ignores | Cap | Counters |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Wellbeing | Optimise learning minutes not raw opens | Streak pressure | Aggressive streaks cause anxiety and churn |
| Treatment | Uplift of nudge vs no nudge | Predict lapse then notify | Notifying already-active users wastes goodwill |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Device type | weak |
| Account age | confounded |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Lapse hazard inputs | Learning engineering | Learning management system (LMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: survival. |
| Preferred study time inputs | Registrar and data office | Student information system (SIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: history. |
| Notification fatigue inputs | Content team | Content and item bank | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: counters. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: engagement_prediction_notifications_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: lapse_hazard, type: double, nullable: false }
    - { name: preferred_study_time, type: double, nullable: false }
    - { name: notification_fatigue, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Lapse hazard and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Preferred study time against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Lapse hazard, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open Bandit Dataset | https://research.zozo.com/data.html | CC BY 4.0 (see the page) | Logged bandit feedback from a fashion e-commerce site with propensities, for off-policy evaluation | One platform and a short period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo AI Lab datasets | https://ailab.criteo.com/ressources/ | Research-use terms on the Criteo AI Lab page | Large click logs, uplift, attribution and counterfactual datasets from Criteo | Terabyte scale for some sets; research-use terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE engagement_prediction_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE engagement_prediction_outputs (
  run_id TEXT NOT NULL REFERENCES engagement_prediction_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE engagement_prediction_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE engagement_prediction_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Learner Engagement Prediction & Notifications": Predict lapse risk and send the right reminder at the right time to keep learners practising, without notification fatigue. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Engagement, retention and early warning | Students and learners drop out for reasons visible in activity data weeks earlier. Models flag risk so teachers or support staff can reach out; notifications and gamification aim to sustain habits but can create anxiety or fatigue. | Interventions must be tested for causal benefit, because predicting dropout is not the same as preventing it. |
| Adaptive practice shapes the data | Mastery learning keeps assigning practice on a skill until the estimate crosses a threshold, and tutors choose questions near the learner's level. Learners who struggle get more attempts, so the data are not a random sample of questions, and some learners get stuck practising without progress, called wheel spinning. | Naive comparisons across skills or learners are biased by the system's own choices, and you must detect stuck learners rather than assigning more of the same. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Learning from logs: off-policy evaluation | Most business data were generated by an earlier policy. To judge a new policy offline you need the probability with which each logged action was chosen; estimators such as inverse propensity weighting, self-normalised weighting and doubly robust methods correct for the difference, with a bias-variance trade-off. | Never evaluate a new policy only on the rows where it agrees with the old one; log propensities from day one. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Lapse hazard | Probability of missing the next 3 days. Targeting. | Leakage risk to design against: Survival. |
| A signal-versus-noise trap in this use case: Wellbeing | The true signal is optimise learning minutes not raw opens; the common noise is streak pressure. | Aggressive streaks cause anxiety and churn. |

**Ask the experts**

- [ ] What exactly does "Frequency caps" mean in practice for learner engagement prediction & notifications: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Lapse hazard" and "Preferred study time", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Weekly active practice minutes" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: optimising opens, and who can confirm the cut-off times and splits?
- [ ] How often does "Exam week changes study patterns" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Gamification | Using points, streaks and badges to motivate learning. |
| Streak | Consecutive days of practice, a common habit-forming mechanic. |
| Notification fatigue | Learners ignoring or disabling reminders because there are too many. |
| Learning management system (LMS) | The platform where courses, materials, submissions and grades are managed. |
| Learning analytics | Using learner data to understand and improve learning and teaching. |
| Uplift (learning) | The extra learning gain caused by an intervention compared with none. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Platt scaling | Calibrating scores with a logistic curve. |
| Contextual bandit | A decision problem where each round has a context, an action is chosen and only its reward is seen. |
| Policy | The rule that maps a situation to an action. |
| Thompson sampling / UCB | Bandit methods that explore in proportion to uncertainty. |
| Off-policy evaluation (OPE) | Estimating how a new policy would perform from data logged under another policy. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Markov decision process | A mathematical model of sequential decisions with states, actions, rewards and transitions. |
