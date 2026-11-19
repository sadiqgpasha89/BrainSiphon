# Conversational Language Practice Agent: data and feature specification

> Generated from the blueprint `edtech/conversational-language-practice-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Conversational Language Practice Agent · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Conversational Language Practice Agent": Provide a patient conversation partner that adapts to the learner's level, corrects errors gently and tracks vocabulary growth. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Judging by fluency of the bot.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Learner CEFR estimate | model estimate from output | Adaptation | Calibration |   |   |   |
| Error pattern frequency | recurring error types | Targeted practice | Taxonomy |   |   |   |
| New-vocabulary exposure | words introduced and retained | Growth | Memory model |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Level | Control output complexity to the learner's CEFR level | Native-level responses | Too-hard replies stop learning |
| Feedback | Selective, delayed correction | Correcting every error | Over-correction reduces willingness to speak |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Session length | not learning |
| Learner sentiment | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Learner CEFR estimate inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: calibration. |
| Error pattern frequency inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: taxonomy. |
| New-vocabulary exposure inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: memory model. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: conversational_language_practice_agent_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: learner_cefr_estimate, type: double, nullable: false }
    - { name: error_pattern_frequency, type: double, nullable: false }
    - { name: new_vocabulary_exposure, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Learner CEFR estimate and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Error pattern frequency against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Learner CEFR estimate, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE conversational_language_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE conversational_language_steps (
  task_id TEXT NOT NULL REFERENCES conversational_language_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE conversational_language_approvals (
  task_id TEXT NOT NULL REFERENCES conversational_language_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Conversational Language Practice Agent": Provide a patient conversation partner that adapts to the learner's level, corrects errors gently and tracks vocabulary growth. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Language, speech and reading | Language learning and literacy tools assess pronunciation, reading fluency and conversation using speech recognition and language models. Accents, age and background noise affect accuracy, and feedback must be pedagogically sound, not just correct. | Speech models evaluated on adult native speakers can fail for children and learners, so test on the real population. |
| Adaptive practice shapes the data | Mastery learning keeps assigning practice on a skill until the estimate crosses a threshold, and tutors choose questions near the learner's level. Learners who struggle get more attempts, so the data are not a random sample of questions, and some learners get stuck practising without progress, called wheel spinning. | Naive comparisons across skills or learners are biased by the system's own choices, and you must detect stuck learners rather than assigning more of the same. |
| AI tutors and teacher copilots | Tutoring assistants guide students with hints and questions; teacher copilots draft lessons, questions and feedback. Good tutoring avoids giving away answers, stays within the curriculum and flags misconceptions; safety rules for minors apply. | Evaluate on learning outcomes and teacher time saved, and test explicitly for answer leakage and off-curriculum content. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Learner CEFR estimate | Model estimate from output. Adaptation. | Leakage risk to design against: Calibration. |
| A signal-versus-noise trap in this use case: Level | The true signal is control output complexity to the learner's CEFR level; the common noise is native-level responses. | Too-hard replies stop learning. |

**Ask the experts**

- [ ] What exactly does "CEFR-level control" mean in practice for conversational language practice agent: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Learner CEFR estimate" and "Error pattern frequency", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Proficiency gains" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: judging by fluency of the bot, and who can confirm the cut-off times and splits?
- [ ] How often does "Learner asks off-topic or unsafe questions" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| CEFR | The European scale of language proficiency from A1 to C2. |
| Pronunciation assessment | Scoring how closely spoken sounds match a target pronunciation. |
| Spaced repetition | Scheduling reviews at increasing intervals to make learning last. |
| Learning gain | The improvement in a learner's measured knowledge between two points, the outcome the system exists to increase. |
| Oral reading fluency | Speed, accuracy and expression when reading aloud. |
| Word error rate (WER) | Errors in recognised text divided by the number of words in the reference. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| CTC loss | A loss that aligns a signal such as audio or a line image to its text without frame labels. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
| Guardrail metric | A metric that must not get worse when optimising the main objective. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
