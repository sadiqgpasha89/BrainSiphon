# Loan Hardship Case Triage: data and feature specification

> Generated from the blueprint `bfsi/loan-hardship-case-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Loan Hardship Case Triage · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Loan Hardship Case Triage": Route incoming hardship requests to the right treatment and priority, quickly and fairly, while spotting customers in vulnerable circumstances. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Offline labels come from past routing, which carries its own bias.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Days to next due date | next scheduled payment minus today | Urgency depends on time left | Dates must be contractual |   |   |   |
| Arrears and history | current arrears, prior arrangements and recent contact | Predicts the appropriate treatment | Prior arrangements may have been miscoded |   |   |   |
| Hardship category | classifier over the message and attachments | Chooses the treatment pathway | Categories overlap in real messages |   |   |   |
| Vulnerability cues | phrases and context indicating illness, bereavement or coercion | Triggers a specialist team | Over-flagging overloads the team, under-flagging harms customers |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Intent | The kind of hardship (job loss, illness, bereavement, disaster) and the requested relief | Sentiment of the message | Calm messages can describe severe distress |
| Urgency | Days to the next missed payment and size of the arrears | Message length or tone | Long emotional messages are not more urgent than a short precise one |
| Fairness | Equal service quality across customer groups and languages | Optimising average handling time only | Efficiency gains can hide worse treatment of non-native speakers |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Time of day sent | no relationship to need |
| Device type | proxy for income, unfair as a signal |
| Spelling errors | proxy for education or language, not for hardship |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Days to next due date inputs | Core banking IT | Core banking or policy administration system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: dates must be contractual. |
| Arrears and history inputs | Risk data office | General ledger and risk data warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: prior arrangements may have been miscoded. |
| Hardship category inputs | Operations | Customer master and KYC repository | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: categories overlap in real messages. |
| Vulnerability cues inputs | Core banking IT | Core banking or policy administration system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: over-flagging overloads the team, under-flagging harms customers. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: loan_hardship_case_triage_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: days_to_next_due_date, type: double, nullable: false }
    - { name: arrears_and_history, type: double, nullable: false }
    - { name: hardship_category, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Days to next due date and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Arrears and history against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Days to next due date, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| GoEmotions | https://github.com/google-research/google-research/tree/master/goemotions | Apache 2.0 (see the repository) | 58,000 Reddit comments labelled with 27 emotion categories | Reddit language; label subjectivity. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Banking77 intent dataset | https://huggingface.co/datasets/PolyAI/banking77 | CC BY 4.0 (see the page) | 13,000 customer banking queries labelled with 77 intents | Short single-turn queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Customer Support on Twitter | https://www.kaggle.com/datasets/thoughtvector/customer-support-on-twitter | See the dataset page; free Kaggle login | About 3 million tweets and replies between customers and company support accounts | Public social posts; informal language. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE loan_hardship_case_triage_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE loan_hardship_case_triage_fields (
  document_id TEXT NOT NULL REFERENCES loan_hardship_case_triage_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE loan_hardship_case_triage_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Loan Hardship Case Triage": Route incoming hardship requests to the right treatment and priority, quickly and fairly, while spotting customers in vulnerable circumstances. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Conduct, fairness and customer outcomes | Regulators expect firms to treat customers fairly, identify vulnerable customers and handle complaints properly. Models that route, price or decline must be tested for disparate outcomes, and customers need a route to human review and redress. | A model that raises efficiency but worsens outcomes for one group is a conduct failure, not a success. |
| How a bank lends: origination, servicing and workout | A loan is originated (application, underwriting, approval, documents), serviced for years (payments, covenants, reviews) and, if the borrower struggles, moved to collections or workout. Each stage has its own data, owner and model: underwriting models see applicants, behaviour models see accounts, early-warning models see covenant and cash-flow signals. | Which stage you are modelling decides the label, the delay before you learn the outcome and which team acts on your score. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Days to next due date | Next scheduled payment minus today. Urgency depends on time left. | Leakage risk to design against: Dates must be contractual. |
| A signal-versus-noise trap in this use case: Intent | The true signal is the kind of hardship (job loss, illness, bereavement, disaster) and the requested relief; the common noise is sentiment of the message. | Calm messages can describe severe distress. |

**Ask the experts**

- [ ] What exactly does "Vulnerability flags reviewed by a trained human" mean in practice for loan hardship case triage: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Days to next due date" and "Arrears and history", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to first response" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: offline labels come from past routing, which carries its own bias, and who can confirm the cut-off times and splits?
- [ ] How often does "Third-party request" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Vulnerable customer | A customer who, because of circumstances such as illness or bereavement, is at greater risk of harm and needs extra care. |
| LTV | Loan-to-value: the loan balance divided by the property value; a higher LTV means less equity cushion. |
| DTI | Debt-to-income: total monthly debt payments divided by monthly income, a standard affordability measure. |
| Covenant | A condition in a loan agreement, such as a maximum leverage ratio, that the borrower must keep to; a breach lets the lender act. |
| RAROC | Risk-adjusted return on capital: income minus costs and expected loss, divided by the capital held against the risk. |
| Catastrophe model | A simulation of hazard, exposure and vulnerability that estimates insured losses from events such as storms or earthquakes. |
| Straight-through processing | Handling a transaction or claim end to end without manual touch. |
| KYC refresh | Periodic review of a customer's identity and risk information, more often for higher-risk customers. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| F1 score | The harmonic mean of precision and recall. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
