# Accessibility: Alt Text & Content Adaptation: data and feature specification

> Generated from the blueprint `edtech/accessibility-alt-text-and-captioning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Accessibility: Alt Text & Content Adaptation · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Accessibility: Alt Text & Content Adaptation": Generate high-quality alt text for educational images, diagrams and equations and adapt content for learners with disabilities. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluated on photos not diagrams.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Diagram type classifier | chart, circuit, geometry | Description template | Taxonomy |   |   |   |
| OCR and equation parse | text and math in image | Content | OCR quality |   |   |   |
| Description factuality | consistency with data/tables | Safety | Source data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Context | Alt text conditioned on lesson context | Generic captions | A graph needs its trend described not "a chart" |
| Accuracy | Verify numbers and relationships | Fluent descriptions | Wrong descriptions mislead blind learners |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Image file name | none |
| Image size | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Diagram type classifier inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: taxonomy. |
| OCR and equation parse inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: OCR quality. |
| Description factuality inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: source data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: accessibility_alt_text_and_captioning_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: diagram_type_classifier, type: double, nullable: false }
    - { name: ocr_and_equation_parse, type: double, nullable: false }
    - { name: description_factuality, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Diagram type classifier and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for OCR and equation parse against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Diagram type classifier, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE accessibility_alt_text_and_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE accessibility_alt_text_and_detections (
  frame_id TEXT NOT NULL REFERENCES accessibility_alt_text_and_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE accessibility_alt_text_and_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Accessibility: Alt Text & Content Adaptation": Generate high-quality alt text for educational images, diagrams and equations and adapt content for learners with disabilities. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Language, speech and reading | Language learning and literacy tools assess pronunciation, reading fluency and conversation using speech recognition and language models. Accents, age and background noise affect accuracy, and feedback must be pedagogically sound, not just correct. | Speech models evaluated on adult native speakers can fail for children and learners, so test on the real population. |
| Recommending learning content and paths | Learners choose courses, exercises and next steps. Prerequisite structures (a graph of skills), goals, time available and motivation shape what is useful; the aim is learning gain, not clicks. | Engagement and learning can diverge: the most clicked content may not be the most effective. |
| AI tutors and teacher copilots | Tutoring assistants guide students with hints and questions; teacher copilots draft lessons, questions and feedback. Good tutoring avoids giving away answers, stays within the curriculum and flags misconceptions; safety rules for minors apply. | Evaluate on learning outcomes and teacher time saved, and test explicitly for answer leakage and off-curriculum content. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Diagram type classifier | Chart, circuit, geometry. Description template. | Leakage risk to design against: Taxonomy. |
| A signal-versus-noise trap in this use case: Context | The true signal is alt text conditioned on lesson context; the common noise is generic captions. | A graph needs its trend described not "a chart". |

**Ask the experts**

- [ ] What exactly does "WCAG compliance" mean in practice for accessibility: alt text & content adaptation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Diagram type classifier" and "OCR and equation parse", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Accessibility issue backlog" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluated on photos not diagrams, and who can confirm the cut-off times and splits?
- [ ] How often does "Complex diagrams (circuits) mis-described" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Accessibility | Making content usable by people with disabilities, for example with alt text and captions. |
| Alt text | A text description of an image for people who cannot see it. |
| Scaffolding | Temporary support that is gradually removed as a learner becomes capable. |
| Formative feedback | Comments that help a learner improve while they are still learning. |
| Oral reading fluency | Speed, accuracy and expression when reading aloud. |
| Word error rate (WER) | Errors in recognised text divided by the number of words in the reference. |
| Proctoring | Monitoring an exam, in person or remotely, to prevent cheating. |
| Viva voce | An oral examination in which a student answers questions from examiners. |
| OCR / text detection | Finding and reading text in images. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| Multiple-instance learning | Learning from a bag of patches with only a bag-level label, as in whole-slide pathology. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
