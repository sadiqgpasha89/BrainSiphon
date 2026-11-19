# Scholarship & Financial Aid Matching: data and feature specification

> Generated from the blueprint `edtech/scholarship-matching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Scholarship & Financial Aid Matching · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Scholarship & Financial Aid Matching": Match students to scholarships they are eligible for and likely to win, improving access and application quality. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on historical winners with bias.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Eligibility rule satisfaction | structured criteria match | Gate | Parsing |   |   |   |
| Historical win likelihood | past winners profile | Win probability | Bias |   |   |   |
| Deadline proximity | days to deadline | Urgency | Calendar |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Eligibility | Rule-based hard filters then learned ranking | Pure similarity | Ineligible matches waste time |
| Win | Rank by win probability and effort | Maximum award | Effort-aware ranking improves expected funding |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Student name | none |
| Application length | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Eligibility rule satisfaction inputs | Learning engineering | Learning management system (LMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: parsing. |
| Historical win likelihood inputs | Registrar and data office | Student information system (SIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: bias. |
| Deadline proximity inputs | Content team | Content and item bank | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: calendar. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: scholarship_matching_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: eligibility_rule_satisfaction, type: double, nullable: false }
    - { name: historical_win_likelihood, type: double, nullable: false }
    - { name: deadline_proximity, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Eligibility rule satisfaction and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Historical win likelihood against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Eligibility rule satisfaction, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MovieLens datasets | https://grouplens.org/datasets/movielens/ | GroupLens research terms (see the page) | Explicit ratings from 100K to 25M with timestamps, the standard recommender benchmark | Explicit ratings are not implicit clicks; film domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EdNet (Santa tutoring service) | https://github.com/riiid/ednet | CC BY-NC 4.0 per the repository | Interaction logs from more than 780,000 users over two years | Non-commercial licence and very large. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MS MARCO | https://microsoft.github.io/msmarco/ | Non-commercial research use (see the page) | Large-scale passage and document ranking data from real search queries | Web search, not enterprise or docs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE scholarship_matching_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE scholarship_matching_outputs (
  run_id TEXT NOT NULL REFERENCES scholarship_matching_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE scholarship_matching_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE scholarship_matching_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Scholarship & Financial Aid Matching": Match students to scholarships they are eligible for and likely to win, improving access and application quality. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Operations: timetabling, admissions and support | Institutions schedule exams and classrooms, match students to scholarships and programmes, answer admissions questions and triage support tickets. Constraints are hard (no clashes), fairness is audited, and stakeholders contest decisions. | Optimisation and scoring systems here are judged on feasibility and fairness, and every decision needs an explanation. |
| Recommending learning content and paths | Learners choose courses, exercises and next steps. Prerequisite structures (a graph of skills), goals, time available and motivation shape what is useful; the aim is learning gain, not clicks. | Engagement and learning can diverge: the most clicked content may not be the most effective. |
| Academic integrity, proctoring and privacy | Plagiarism and cheating detection compare code and text, and proctoring uses video and behaviour signals. These systems can wrongly accuse students and raise privacy concerns, especially for minors and remote exams. | The cost of a false accusation is high, so outputs support a human decision and need appeal paths. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Eligibility rule satisfaction | Structured criteria match. Gate. | Leakage risk to design against: Parsing. |
| A signal-versus-noise trap in this use case: Eligibility | The true signal is rule-based hard filters then learned ranking; the common noise is pure similarity. | Ineligible matches waste time. |

**Ask the experts**

- [ ] What exactly does "Hard eligibility rules" mean in practice for scholarship & financial aid matching: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Eligibility rule satisfaction" and "Historical win likelihood", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Funds awarded per student" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on historical winners with bias, and who can confirm the cut-off times and splits?
- [ ] How often does "Criteria changed after listing" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Equity audit | Checking whether outcomes differ systematically between groups of students. |
| PII in learner data | Personal information such as names and IDs inside student text and logs that must be protected. |
| Code plagiarism | Submitting another's program, often disguised by renaming variables or reordering code. |
| Admissions | The process of selecting applicants for a programme, subject to fairness and legal rules. |
| Uplift (learning) | The extra learning gain caused by an intervention compared with none. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
| Position bias | Higher slots get more attention regardless of relevance. |
| Slate / list-wise optimisation | Choosing a whole list of items together rather than scoring each independently. |
| Two-tower model | A retrieval model with separate networks for user and item whose embeddings are compared by dot product. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
