# Child-Safe Content Filtering: data and feature specification

> Generated from the blueprint `edtech/child-safe-content-filtering` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Child-Safe Content Filtering · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Child-Safe Content Filtering": Filter text, images and chat in learning environments for age-inappropriate and unsafe content, with low over-blocking of educational material. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test data without educational content.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Category scores by age band | age-conditioned policy | Appropriate thresholds | Policy definition |   |   |   |
| Educational-context score | topic and source trust | Reduce over-blocking | Classifier |   |   |   |
| Contact-risk signals | adult-to-minor patterns | Grooming risk | Privacy |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Context | Educational-context-aware moderation | Keyword blocklists | Blocklists block biology and history lessons |
| Escalation | Safeguarding signals routed to staff | Block and forget | Disclosures of harm require human follow-up |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Message length | weak |
| Emoji count | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Category scores by age band inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: policy definition. |
| Educational-context score inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: classifier. |
| Contact-risk signals inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: privacy. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: child_safe_content_filtering_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: category_scores_by_age_band, type: double, nullable: false }
    - { name: educational_context_score, type: double, nullable: false }
    - { name: contact_risk_signals, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Category scores by age band and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Educational-context score against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Category scores by age band, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Jigsaw Toxic Comment Classification | https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge | Competition rules; free Kaggle login | 160K Wikipedia comments labelled for several kinds of toxicity | Wikipedia talk pages; labelling bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ASAP Automated Student Assessment Prize: essay scoring | https://www.kaggle.com/c/asap-aes | Competition rules; free Kaggle login | Student essays with human scores across eight prompts | Prompt-specific; scores from one era. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ASAP-SAS short answer scoring | https://www.kaggle.com/c/asap-sas | Competition rules; free Kaggle login | Short student answers with human scores for ten prompts | Prompt-specific and small per prompt. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE child_safe_content_filtering_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE child_safe_content_filtering_detections (
  frame_id TEXT NOT NULL REFERENCES child_safe_content_filtering_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE child_safe_content_filtering_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Child-Safe Content Filtering": Filter text, images and chat in learning environments for age-inappropriate and unsafe content, with low over-blocking of educational material. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Recommending learning content and paths | Learners choose courses, exercises and next steps. Prerequisite structures (a graph of skills), goals, time available and motivation shape what is useful; the aim is learning gain, not clicks. | Engagement and learning can diverge: the most clicked content may not be the most effective. |
| AI tutors and teacher copilots | Tutoring assistants guide students with hints and questions; teacher copilots draft lessons, questions and feedback. Good tutoring avoids giving away answers, stays within the curriculum and flags misconceptions; safety rules for minors apply. | Evaluate on learning outcomes and teacher time saved, and test explicitly for answer leakage and off-curriculum content. |
| Academic integrity, proctoring and privacy | Plagiarism and cheating detection compare code and text, and proctoring uses video and behaviour signals. These systems can wrongly accuse students and raise privacy concerns, especially for minors and remote exams. | The cost of a false accusation is high, so outputs support a human decision and need appeal paths. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Category scores by age band | Age-conditioned policy. Appropriate thresholds. | Leakage risk to design against: Policy definition. |
| A signal-versus-noise trap in this use case: Context | The true signal is educational-context-aware moderation; the common noise is keyword blocklists. | Blocklists block biology and history lessons. |

**Ask the experts**

- [ ] What exactly does "Age bands" mean in practice for child-safe content filtering: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Category scores by age band" and "Educational-context score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Unsafe content exposure" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: test data without educational content, and who can confirm the cut-off times and splits?
- [ ] How often does "Medical biology textbook flagged" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Curriculum standard | A published statement of what learners should know, such as a national standard, to which content is tagged. |
| Scaffolding | Temporary support that is gradually removed as a learner becomes capable. |
| Opportunity count | How many times a learner has practised a skill so far. |
| Mastery learning | An instructional approach in which learners move on only after demonstrating mastery of a skill. |
| Learning gain | The improvement in a learner's measured knowledge between two points, the outcome the system exists to increase. |
| COPPA / FERPA | US laws protecting children's online data and education records. |
| Rubric | A scoring guide that defines criteria and performance levels for graded work. |
| Inter-rater agreement | How closely two raters, human or automated, agree, often measured with quadratic weighted kappa. |
| Automated essay scoring (AES) | Software that predicts the score a human rater would give an essay. |
| Misconception | A systematic wrong idea a learner holds, which wrong answers can reveal. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Multiple-instance learning | Learning from a bag of patches with only a bag-level label, as in whole-slide pathology. |
| OCR / text detection | Finding and reading text in images. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
