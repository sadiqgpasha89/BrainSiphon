# Admissions Application Scoring with Fairness Controls: data and feature specification

> Generated from the blueprint `edtech/admissions-application-scoring-fairness` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Admissions Application Scoring with Fairness Controls · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Admissions Application Scoring with Fairness Controls": Support holistic review by summarising applications and flagging evidence, with strict fairness controls and no automated decisions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on past admissions decisions.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Structured evidence summary | extracted achievements and context | Reviewer efficiency | Extraction accuracy |   |   |   |
| Context-adjusted achievement | achievement relative to opportunity | Fairness | Context data |   |   |   |
| Inter-reviewer agreement | reviewer consistency | Quality | Review data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Role | Decision support and evidence summarisation | Automated admit/reject | Automated decisions have legal and ethical risk |
| Bias | Audit and mitigate proxy bias in features | Remove protected attributes only | Proxies reproduce historical bias |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Essay prestige phrases | privilege proxy |
| Extracurricular counts | privilege proxy |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Structured evidence summary inputs | Learning engineering | Learning management system (LMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: extraction accuracy. |
| Context-adjusted achievement inputs | Registrar and data office | Student information system (SIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: context data. |
| Inter-reviewer agreement inputs | Content team | Content and item bank | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: review data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: admissions_application_scoring_fairness_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: structured_evidence_summary, type: double, nullable: false }
    - { name: context_adjusted_achievement, type: double, nullable: false }
    - { name: inter_reviewer_agreement, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Structured evidence summary and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Context-adjusted achievement against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Structured evidence summary, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| ASAP Automated Student Assessment Prize: essay scoring | https://www.kaggle.com/c/asap-aes | Competition rules; free Kaggle login | Student essays with human scores across eight prompts | Prompt-specific; scores from one era. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE admissions_application_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE admissions_application_fields (
  document_id TEXT NOT NULL REFERENCES admissions_application_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE admissions_application_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Admissions Application Scoring with Fairness Controls": Support holistic review by summarising applications and flagging evidence, with strict fairness controls and no automated decisions. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Assessment: items, scoring and psychometrics | Tests and quizzes are built from items with known difficulty and discrimination, calibrated with item response theory so scores are comparable across forms. Adaptive tests choose the next question to pin down ability quickly. Automated scoring of essays and short answers must agree with trained human raters and be audited for bias. | Scores affect grades and opportunities, so reliability, fairness and agreement with human scoring are formal requirements, not nice-to-haves. |
| Operations: timetabling, admissions and support | Institutions schedule exams and classrooms, match students to scholarships and programmes, answer admissions questions and triage support tickets. Constraints are hard (no clashes), fairness is audited, and stakeholders contest decisions. | Optimisation and scoring systems here are judged on feasibility and fairness, and every decision needs an explanation. |
| Children's data, fairness and accountability | Learner data is sensitive, and children's data has special protection (COPPA and FERPA in the United States, the GDPR with special rules for minors in Europe). Mastery estimates can affect grades, tracks or perception, so they should be explainable, checked for differences between groups and never the only basis for a high-stakes decision. | Consent, retention limits and explanations are product requirements, and they favour interpretable models alongside predictive ones. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Structured evidence summary | Extracted achievements and context. Reviewer efficiency. | Leakage risk to design against: Extraction accuracy. |
| A signal-versus-noise trap in this use case: Role | The true signal is decision support and evidence summarisation; the common noise is automated admit/reject. | Automated decisions have legal and ethical risk. |

**Ask the experts**

- [ ] What exactly does "Legal compliance on protected attributes" mean in practice for admissions application scoring with fairness controls: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Structured evidence summary" and "Context-adjusted achievement", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Reviewer throughput" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on past admissions decisions, and who can confirm the cut-off times and splits?
- [ ] How often does "Historical admits encode past bias" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Admissions | The process of selecting applicants for a programme, subject to fairness and legal rules. |
| Inter-rater agreement | How closely two raters, human or automated, agree, often measured with quadratic weighted kappa. |
| Rubric | A scoring guide that defines criteria and performance levels for graded work. |
| Automated essay scoring (AES) | Software that predicts the score a human rater would give an essay. |
| Equity audit | Checking whether outcomes differ systematically between groups of students. |
| Opportunity count | How many times a learner has practised a skill so far. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
