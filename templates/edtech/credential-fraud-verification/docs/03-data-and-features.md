# Credential & Certificate Fraud Detection: data and feature specification

> Generated from the blueprint `edtech/credential-fraud-verification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Credential & Certificate Fraud Detection · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Credential & Certificate Fraud Detection": Detect forged diplomas, transcripts and certificates in admissions and hiring flows by combining document forensics, issuer verification and network signals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Synthetic forgeries differ from real ones.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Issuer verification result | direct verification status | Strongest evidence | API availability |   |   |   |
| Template conformity | font and layout vs issuer template | Forgery | Template library |   |   |   |
| Diploma-mill match | institution accreditation and mill list | Risk | Data freshness |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Verification | Verify with issuer systems and signatures first | Visual forensics alone | A perfect forgery passes visual checks |
| Network | Diploma-mill and repeated-template detection | Single-document view | Mills issue thousands of similar documents |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Document colour | scan |
| Paper texture photo | scan |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Issuer verification result inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: API availability. |
| Template conformity inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: template library. |
| Diploma-mill match inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: data freshness. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: credential_fraud_verification_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: issuer_verification_result, type: double, nullable: false }
    - { name: template_conformity, type: double, nullable: false }
    - { name: diploma_mill_match, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Issuer verification result and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Template conformity against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Issuer verification result, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE credential_fraud_verification_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE credential_fraud_verification_detections (
  frame_id TEXT NOT NULL REFERENCES credential_fraud_verification_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE credential_fraud_verification_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Credential & Certificate Fraud Detection": Detect forged diplomas, transcripts and certificates in admissions and hiring flows by combining document forensics, issuer verification and network signals. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Mastery is hidden; answers are noisy evidence | A learner may guess correctly without knowing, or slip and answer wrongly despite knowing. Models such as Bayesian Knowledge Tracing treat mastery as a hidden state with parameters for the chance of learning on each attempt, guessing and slipping. Performance Factors Analysis instead predicts the next answer from counts of earlier successes and failures. | A correct answer is not learning. The model must reason about evidence, and a single success should not declare mastery. |
| Academic integrity, proctoring and privacy | Plagiarism and cheating detection compare code and text, and proctoring uses video and behaviour signals. These systems can wrongly accuse students and raise privacy concerns, especially for minors and remote exams. | The cost of a false accusation is high, so outputs support a human decision and need appeal paths. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Issuer verification result | Direct verification status. Strongest evidence. | Leakage risk to design against: API availability. |
| A signal-versus-noise trap in this use case: Verification | The true signal is verify with issuer systems and signatures first; the common noise is visual forensics alone. | A perfect forgery passes visual checks. |

**Ask the experts**

- [ ] What exactly does "Issuer database coverage" mean in practice for credential & certificate fraud detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Issuer verification result" and "Template conformity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Fraudulent credentials caught" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: synthetic forgeries differ from real ones, and who can confirm the cut-off times and splits?
- [ ] How often does "Institution closed or merged" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Curriculum standard | A published statement of what learners should know, such as a national standard, to which content is tagged. |
| Admissions | The process of selecting applicants for a programme, subject to fairness and legal rules. |
| Equity audit | Checking whether outcomes differ systematically between groups of students. |
| PII in learner data | Personal information such as names and IDs inside student text and logs that must be protected. |
| Uplift (learning) | The extra learning gain caused by an intervention compared with none. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| OCR / text detection | Finding and reading text in images. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Heterogeneous graph | A graph with several kinds of nodes and edges, such as users, devices and merchants. |
| Node / edge | The entities in a graph and the relationships between them. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Model registry | A versioned store of models with metadata, used for promotion and rollback. |
| Pairwise precision / recall | Precision and recall computed over pairs of records that are put in the same cluster. |
