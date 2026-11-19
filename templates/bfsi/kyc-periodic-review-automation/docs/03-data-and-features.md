# KYC Periodic Review Automation & Risk Re-rating: data and feature specification

> Generated from the blueprint `bfsi/kyc-periodic-review-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** KYC Periodic Review Automation & Risk Re-rating · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "KYC Periodic Review Automation & Risk Re-rating": Automate periodic KYC refreshes by checking customer files against fresh data and re-rating risk, escalating changes to analysts. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels come from past analyst decisions, so the model repeats earlier habits.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Ownership change | change in beneficial ownership recorded in a company registry since the last review | A key trigger for re-rating | Registries update late |   |   |   |
| Adverse media hit | match of the customer or an owner in negative news with a score | Possible risk event | Precision is low for common names |   |   |   |
| Activity versus profile | monthly transaction volume divided by the volume expected for the profile | Behaviour that does not fit the profile | Baselines are weak for new customers |   |   |   |
| Document expiry | days until identity and address documents expire | Defines the need for refresh | Dates are entered by hand and may be wrong |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Change | Material changes since the last review | Re-collecting everything from the customer | Re-collection wastes the customer's time and the analyst's, and most files have not changed |
| Risk | A risk rating updated from behaviour and profile | A static rating from onboarding | Risk drifts as the customer's business and activity change |
| Evidence | Checks linked to their source | An opaque result | An auditor needs to see the source of each conclusion |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer name length | No link to risk |
| Account number | An arbitrary identifier |
| Branch | An administrative attribute with no risk information |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Ownership change inputs | Core banking IT | Core banking or policy administration system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: registries update late. |
| Adverse media hit inputs | Risk data office | General ledger and risk data warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: precision is low for common names. |
| Activity versus profile inputs | Operations | Customer master and KYC repository | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: baselines are weak for new customers. |
| Document expiry inputs | Core banking IT | Core banking or policy administration system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: dates are entered by hand and may be wrong. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: kyc_periodic_review_automation_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: ownership_change, type: double, nullable: false }
    - { name: adverse_media_hit, type: double, nullable: false }
    - { name: activity_versus_profile, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Ownership change and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Adverse media hit against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Ownership change, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| GoEmotions | https://github.com/google-research/google-research/tree/master/goemotions | Apache 2.0 (see the repository) | 58,000 Reddit comments labelled with 27 emotion categories | Reddit language; label subjectivity. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE kyc_periodic_review_automation_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE kyc_periodic_review_automation_fields (
  document_id TEXT NOT NULL REFERENCES kyc_periodic_review_automation_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE kyc_periodic_review_automation_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "KYC Periodic Review Automation & Risk Re-rating": Automate periodic KYC refreshes by checking customer files against fresh data and re-rating risk, escalating changes to analysts. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Conduct, fairness and customer outcomes | Regulators expect firms to treat customers fairly, identify vulnerable customers and handle complaints properly. Models that route, price or decline must be tested for disparate outcomes, and customers need a route to human review and redress. | A model that raises efficiency but worsens outcomes for one group is a conduct failure, not a success. |
| Capital: risk-weighted assets and the capital ratio | Regulators require banks to hold capital against risk-weighted assets, where each exposure's weight depends on its type, rating and collateral. Reducing RWA by selling, hedging or restructuring frees capital but costs income, so the choice is a trade-off between capital use and return. | Optimisation models must use the regulatory definitions exactly, and a reduction that cannot be executed is not a reduction. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Ownership change | Change in beneficial ownership recorded in a company registry since the last review. A key trigger for re-rating. | Leakage risk to design against: Registries update late. |
| A signal-versus-noise trap in this use case: Change | The true signal is material changes since the last review; the common noise is re-collecting everything from the customer. | Re-collection wastes the customer's time and the analyst's, and most files have not changed. |

**Ask the experts**

- [ ] What exactly does "An analyst decides every change to a high-risk rating" mean in practice for kyc periodic review automation & risk re-rating: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Ownership change" and "Adverse media hit", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Review time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labels come from past analyst decisions, so the model repeats earlier habits, and who can confirm the cut-off times and splits?
- [ ] How often does "Registry delay" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| KYC refresh | Periodic review of a customer's identity and risk information, more often for higher-risk customers. |
| Model tier | A classification of a model by its materiality, which sets how deeply it is validated. |
| Straight-through processing | Handling a transaction or claim end to end without manual touch. |
| PD, LGD, EAD | Probability of default, loss given default and exposure at default: the three inputs to expected credit loss. |
| Four-eyes principle | A control requiring a second person to approve a sensitive action. |
| Vulnerable customer | A customer who, because of circumstances such as illness or bereavement, is at greater risk of harm and needs extra care. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
