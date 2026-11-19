# Lecture Video Segmentation & Summarisation: data and feature specification

> Generated from the blueprint `edtech/lecture-video-segmentation-and-summarization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Lecture Video Segmentation & Summarisation · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Lecture Video Segmentation & Summarisation": Segment lectures into topics, generate chapters, summaries and quiz points so learners can navigate and review efficiently. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on clean slides-only talks.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Transcript topic-shift score | embedding distance between windows | Boundaries | ASR quality |   |   |   |
| Slide-change detection | visual change in slides | Chapter cue | Frame sampling |   |   |   |
| Term glossary alignment | domain terms recognised | ASR repair | Glossary |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Segmentation | Topic boundaries from transcript embeddings plus slide changes | Fixed-length chunks | Fixed chunks cut mid-concept |
| Faithfulness | Summaries grounded in transcript spans | Free summarisation | Hallucinated statements mislead learners |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Speaker filler words | noise |
| Video resolution | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Transcript topic-shift score inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: ASR quality. |
| Slide-change detection inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: frame sampling. |
| Term glossary alignment inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: glossary. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: lecture_video_segmentation_and_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: transcript_topic_shift_score, type: double, nullable: false }
    - { name: slide_change_detection, type: double, nullable: false }
    - { name: term_glossary_alignment, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Transcript topic-shift score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Slide-change detection against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Transcript topic-shift score, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE lecture_video_segmentation_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE lecture_video_segmentation_detections (
  frame_id TEXT NOT NULL REFERENCES lecture_video_segmentation_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE lecture_video_segmentation_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Lecture Video Segmentation & Summarisation": Segment lectures into topics, generate chapters, summaries and quiz points so learners can navigate and review efficiently. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Language, speech and reading | Language learning and literacy tools assess pronunciation, reading fluency and conversation using speech recognition and language models. Accents, age and background noise affect accuracy, and feedback must be pedagogically sound, not just correct. | Speech models evaluated on adult native speakers can fail for children and learners, so test on the real population. |
| Recommending learning content and paths | Learners choose courses, exercises and next steps. Prerequisite structures (a graph of skills), goals, time available and motivation shape what is useful; the aim is learning gain, not clicks. | Engagement and learning can diverge: the most clicked content may not be the most effective. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Detection, segmentation and measurement | Classification says whether something is present; detection says where; segmentation outlines it pixel by pixel; measurement turns outlines into numbers such as lengths and volumes. Each has its own metrics and tolerances, and real-time use adds latency limits on edge hardware. | Choose the task and metric from the decision: a triage flag needs sensitivity, a surgical plan needs boundary accuracy. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Transcript topic-shift score | Embedding distance between windows. Boundaries. | Leakage risk to design against: ASR quality. |
| A signal-versus-noise trap in this use case: Segmentation | The true signal is topic boundaries from transcript embeddings plus slide changes; the common noise is fixed-length chunks. | Fixed chunks cut mid-concept. |

**Ask the experts**

- [ ] What exactly does "Long videos (2 hours)" mean in practice for lecture video segmentation & summarisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Transcript topic-shift score" and "Slide-change detection", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Chapter navigation usage" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating on clean slides-only talks, and who can confirm the cut-off times and splits?
- [ ] How often does "Technical terms mis-transcribed" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Oral reading fluency | Speed, accuracy and expression when reading aloud. |
| Word error rate (WER) | Errors in recognised text divided by the number of words in the reference. |
| Accessibility | Making content usable by people with disabilities, for example with alt text and captions. |
| Curriculum standard | A published statement of what learners should know, such as a national standard, to which content is tagged. |
| Pronunciation assessment | Scoring how closely spoken sounds match a target pronunciation. |
| Goodness of pronunciation (GOP) | A score for how well each phoneme was pronounced, derived from a speech recogniser. |
| Proctoring | Monitoring an exam, in person or remotely, to prevent cheating. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| CTC loss | A loss that aligns a signal such as audio or a line image to its text without frame labels. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Dice coefficient | An overlap score between two regions, widely used for segmentation. |
| Distribution shift | A change in the data a model sees compared with training. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
