# Learner Confusion & Affect Detection: data and feature specification

> Generated from the blueprint `edtech/learner-confusion-and-affect-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Learner Confusion & Affect Detection · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Learner Confusion & Affect Detection": Infer confusion, frustration and boredom from interaction signals (and optional consented video) to adapt help in real time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels from lab settings.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Response latency anomaly | time vs personal baseline | Hesitation | Baseline |   |   |   |
| Rapid-guessing flag | answers faster than reading time | Disengagement | Timing |   |   |   |
| Help-request pattern | hint requests | Confusion | Event logs |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Signals | Interaction patterns (hesitation, rapid guessing) | Facial emotion recognition | Facial expressions are poor, biased proxies for learning states |
| Labels | Teacher or self-report labels with noise handling | Single-annotator labels | Affect labels are subjective |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Facial action units alone | weak and biased |
| Mouse speed | device |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Response latency anomaly inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: baseline. |
| Rapid-guessing flag inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: timing. |
| Help-request pattern inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: event logs. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: learner_confusion_and_affect_detection_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: response_latency_anomaly, type: double, nullable: false }
    - { name: rapid_guessing_flag, type: double, nullable: false }
    - { name: help_request_pattern, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Response latency anomaly and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Rapid-guessing flag against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Response latency anomaly, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Riiid Answer Correctness Prediction (EdNet-based) | https://www.kaggle.com/c/riiid-test-answer-prediction | Competition rules; free Kaggle login | About 100 million answers from roughly 400,000 students with timestamps and question tags | Anonymised and large; split by student. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE learner_confusion_and_affect_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE learner_confusion_and_affect_detections (
  frame_id TEXT NOT NULL REFERENCES learner_confusion_and_affect_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE learner_confusion_and_affect_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Learner Confusion & Affect Detection": Infer confusion, frustration and boredom from interaction signals (and optional consented video) to adapt help in real time. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Mastery is hidden; answers are noisy evidence | A learner may guess correctly without knowing, or slip and answer wrongly despite knowing. Models such as Bayesian Knowledge Tracing treat mastery as a hidden state with parameters for the chance of learning on each attempt, guessing and slipping. Performance Factors Analysis instead predicts the next answer from counts of earlier successes and failures. | A correct answer is not learning. The model must reason about evidence, and a single success should not declare mastery. |
| AI tutors and teacher copilots | Tutoring assistants guide students with hints and questions; teacher copilots draft lessons, questions and feedback. Good tutoring avoids giving away answers, stays within the curriculum and flags misconceptions; safety rules for minors apply. | Evaluate on learning outcomes and teacher time saved, and test explicitly for answer leakage and off-curriculum content. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Response latency anomaly | Time vs personal baseline. Hesitation. | Leakage risk to design against: Baseline. |
| A signal-versus-noise trap in this use case: Signals | The true signal is interaction patterns (hesitation, rapid guessing); the common noise is facial emotion recognition. | Facial expressions are poor, biased proxies for learning states. |

**Ask the experts**

- [ ] What exactly does "Privacy and consent (especially minors)" mean in practice for learner confusion & affect detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Response latency anomaly" and "Rapid-guessing flag", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Help acceptance" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labels from lab settings, and who can confirm the cut-off times and splits?
- [ ] How often does "Slow readers flagged as confused" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Learning gain | The improvement in a learner's measured knowledge between two points, the outcome the system exists to increase. |
| Guess / slip | The chance of answering correctly without mastery (guess) or incorrectly despite mastery (slip). |
| Mastery learning | An instructional approach in which learners move on only after demonstrating mastery of a skill. |
| Scaffolding | Temporary support that is gradually removed as a learner becomes capable. |
| Text simplification | Rewriting text at a lower reading level while keeping its meaning. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Stationarity | A series whose statistical properties do not change over time. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Shortcut learning | A model using an easy but irrelevant cue that happens to correlate with the label. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| p99 latency | The time within which 99% of requests complete. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
