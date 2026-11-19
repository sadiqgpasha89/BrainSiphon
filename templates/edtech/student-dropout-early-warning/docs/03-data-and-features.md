# Student Dropout & Attrition Early Warning: data and feature specification

> Generated from the blueprint `edtech/student-dropout-early-warning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Student Dropout & Attrition Early Warning · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Student Dropout & Attrition Early Warning": Identify learners at risk of dropping out weeks ahead and trigger supportive interventions that actually help. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Interventions confound labels.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Engagement decay | trend in logins and submissions | Disengagement | Window |   |   |   |
| Assessment trajectory | grade trends | Struggle | As-of |   |   |   |
| Support-contact history | advisor contacts | Context | Consent |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Action | Predict + uplift for interventions | Risk score only | Advisors need which action helps whom |
| Fairness | Audit subgroup performance and impact | Maximise AUC | Biased flagging stigmatises groups |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Demographic proxies | fairness risk |
| Student ID | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Engagement decay inputs | Learning engineering | Learning management system (LMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: window. |
| Assessment trajectory inputs | Registrar and data office | Student information system (SIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: as-of. |
| Support-contact history inputs | Content team | Content and item bank | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: consent. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: student_dropout_early_warning_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: engagement_decay, type: double, nullable: false }
    - { name: assessment_trajectory, type: double, nullable: false }
    - { name: support_contact_history, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Engagement decay and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Assessment trajectory against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Engagement decay, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Open University Learning Analytics Dataset (OULAD) | https://analyse.kmi.open.ac.uk/open_dataset | CC BY 4.0 (see the page) | Student demographics, VLE click streams and outcomes for 32,000 students | UK distance learning; coarse click aggregation. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Predict Students' Dropout and Academic Success | https://archive.ics.uci.edu/dataset/697/predict+students+dropout+and+academic+success | CC BY 4.0 (see the UCI page) | 4,400 students with enrolment and early-performance features and a dropout label | One institution; small. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EdNet (Santa tutoring service) | https://github.com/riiid/ednet | CC BY-NC 4.0 per the repository | Interaction logs from more than 780,000 users over two years | Non-commercial licence and very large. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE student_dropout_early_warning_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE student_dropout_early_warning_outputs (
  run_id TEXT NOT NULL REFERENCES student_dropout_early_warning_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE student_dropout_early_warning_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE student_dropout_early_warning_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Student Dropout & Attrition Early Warning": Identify learners at risk of dropping out weeks ahead and trigger supportive interventions that actually help. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Engagement, retention and early warning | Students and learners drop out for reasons visible in activity data weeks earlier. Models flag risk so teachers or support staff can reach out; notifications and gamification aim to sustain habits but can create anxiety or fatigue. | Interventions must be tested for causal benefit, because predicting dropout is not the same as preventing it. |
| Assessment: items, scoring and psychometrics | Tests and quizzes are built from items with known difficulty and discrimination, calibrated with item response theory so scores are comparable across forms. Adaptive tests choose the next question to pin down ability quickly. Automated scoring of essays and short answers must agree with trained human raters and be audited for bias. | Scores affect grades and opportunities, so reliability, fairness and agreement with human scoring are formal requirements, not nice-to-haves. |
| Academic integrity, proctoring and privacy | Plagiarism and cheating detection compare code and text, and proctoring uses video and behaviour signals. These systems can wrongly accuse students and raise privacy concerns, especially for minors and remote exams. | The cost of a false accusation is high, so outputs support a human decision and need appeal paths. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Seasonality, trend and calendar effects | Most business series repeat daily, weekly and annually, with holidays, promotions and outages on top. Models must separate these from real change, and know which calendar effects are known in advance. | Ignoring seasonality makes a normal Monday look like an incident and hides slow-moving real changes. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Engagement decay | Trend in logins and submissions. Disengagement. | Leakage risk to design against: Window. |
| A signal-versus-noise trap in this use case: Action | The true signal is predict + uplift for interventions; the common noise is risk score only. | Advisors need which action helps whom. |

**Ask the experts**

- [ ] What exactly does "Equity (avoid labelling disadvantaged students)" mean in practice for student dropout & attrition early warning: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Engagement decay" and "Assessment trajectory", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Retention rate in treated vs control" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: interventions confound labels, and who can confirm the cut-off times and splits?
- [ ] How often does "Term break creates apparent disengagement" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Dropout / attrition | A learner leaving a course or programme before completing it. |
| Learning management system (LMS) | The platform where courses, materials, submissions and grades are managed. |
| Learning analytics | Using learner data to understand and improve learning and teaching. |
| Equity audit | Checking whether outcomes differ systematically between groups of students. |
| PII in learner data | Personal information such as names and IDs inside student text and logs that must be protected. |
| Uplift (learning) | The extra learning gain caused by an intervention compared with none. |
| Item response theory (IRT) | A family of models relating the chance of a correct answer to a learner's ability and an item's parameters. |
| Streak | Consecutive days of practice, a common habit-forming mechanic. |
| Peer learning | Students learning together in groups, where group composition affects outcomes. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| Right-censoring | Observation ending before the event happens, so only a lower bound on the time is known. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Stationarity | A series whose statistical properties do not change over time. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
