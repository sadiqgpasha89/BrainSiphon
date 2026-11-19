# Classroom Engagement Analytics (Vision): data and feature specification

> Generated from the blueprint `edtech/classroom-vision-engagement-analytics` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Classroom Engagement Analytics (Vision) · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Classroom Engagement Analytics (Vision)": Provide teachers with class-level engagement and participation insights from privacy-preserving, on-device video analysis. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Engagement proxies unvalidated.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Class-level activity mix | proportion in discussion/work/lecture | Context | Classifier |   |   |   |
| Teacher-student interaction rate | interaction events | Participation | Detection |   |   |   |
| Aggregate head-orientation distribution | class-level only | Attention proxy | Aggregation |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Privacy | Aggregate, on-device, non-identifying metrics | Cloud video analysis of individuals | Individual surveillance harms trust and wellbeing |
| Validity | Validate against learning outcomes | Engagement scores as truth | Attention posture is a weak proxy for learning |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Individual facial expressions | invalid and invasive |
| Seating position | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Class-level activity mix inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: classifier. |
| Teacher-student interaction rate inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: detection. |
| Aggregate head-orientation distribution inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: aggregation. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: classroom_vision_engagement_analytics_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: class_level_activity_mix, type: double, nullable: false }
    - { name: teacher_student_interaction_rate, type: double, nullable: false }
    - { name: aggregate_head_orientation_distribution, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Class-level activity mix and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Teacher-student interaction rate against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Class-level activity mix, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MedMNIST | https://medmnist.com/ | CC BY 4.0 per dataset (see the site) | Standardised small medical image datasets for classification and segmentation across modalities | Low resolution; for prototyping, not clinical performance claims. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RSNA Pneumonia Detection Challenge | https://www.kaggle.com/c/rsna-pneumonia-detection-challenge | Competition rules; free Kaggle login | Chest X-rays with bounding boxes for pneumonia opacities | Label noise and one source; check the terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE classroom_vision_engagement_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE classroom_vision_engagement_detections (
  frame_id TEXT NOT NULL REFERENCES classroom_vision_engagement_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE classroom_vision_engagement_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Classroom Engagement Analytics (Vision)": Provide teachers with class-level engagement and participation insights from privacy-preserving, on-device video analysis. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Engagement, retention and early warning | Students and learners drop out for reasons visible in activity data weeks earlier. Models flag risk so teachers or support staff can reach out; notifications and gamification aim to sustain habits but can create anxiety or fatigue. | Interventions must be tested for causal benefit, because predicting dropout is not the same as preventing it. |
| Operations: timetabling, admissions and support | Institutions schedule exams and classrooms, match students to scholarships and programmes, answer admissions questions and triage support tickets. Constraints are hard (no clashes), fairness is audited, and stakeholders contest decisions. | Optimisation and scoring systems here are judged on feasibility and fairness, and every decision needs an explanation. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Class-level activity mix | Proportion in discussion/work/lecture. Context. | Leakage risk to design against: Classifier. |
| A signal-versus-noise trap in this use case: Privacy | The true signal is aggregate, on-device, non-identifying metrics; the common noise is cloud video analysis of individuals. | Individual surveillance harms trust and wellbeing. |

**Ask the experts**

- [ ] What exactly does "Strict privacy (no individual identification)" mean in practice for classroom engagement analytics (vision): who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Class-level activity mix" and "Teacher-student interaction rate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Teacher reflection usage" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: engagement proxies unvalidated, and who can confirm the cut-off times and splits?
- [ ] How often does "Parents object to cameras" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Learning analytics | Using learner data to understand and improve learning and teaching. |
| Learning management system (LMS) | The platform where courses, materials, submissions and grades are managed. |
| Streak | Consecutive days of practice, a common habit-forming mechanic. |
| Gamification | Using points, streaks and badges to motivate learning. |
| Proctoring | Monitoring an exam, in person or remotely, to prevent cheating. |
| Timetabling | Assigning courses, exams and rooms to time slots without clashes. |
| Accessibility | Making content usable by people with disabilities, for example with alt text and captions. |
| PII in learner data | Personal information such as names and IDs inside student text and logs that must be protected. |
| Peer learning | Students learning together in groups, where group composition affects outcomes. |
| Notification fatigue | Learners ignoring or disabling reminders because there are too many. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
