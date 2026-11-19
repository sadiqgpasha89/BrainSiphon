# Operational Risk Event Classification & Loss Forecasting: data and feature specification

> Generated from the blueprint `bfsi/operational-risk-event-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Operational Risk Event Classification & Loss Forecasting · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Operational Risk Event Classification & Loss Forecasting": Classify incident reports into the operational risk taxonomy and forecast loss severity so controls and capital reflect real event patterns. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels reflect the first classification, not the final one.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Text embedding of the report | encoder over the narrative | Captures cause and impact | Reports vary in quality |   |   |   |
| Control tested flag | whether a related control failed in the last test | Links event to control | Control IDs can be stale |   |   |   |
| Business line and process | process owner and value chain | Narrows event type | Org changes alter mapping |   |   |   |
| Similar prior events | nearest neighbours in prior loss events | Informs severity | Retrieval must exclude future events |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Taxonomy | Event type, cause and control failure as separate labels | One free-text category | Without causes, remediation repeats |
| Severity | Heavy-tailed loss distribution with the tail modelled separately | Mean loss | A few events dominate total losses |
| Reporting | Reports at the time of discovery with discovery lag | Date of incident as the report date | Many events are found months later |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Reporter name | arbitrary |
| Report length | style |
| Severity assigned by the reporter | not calibrated |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Text embedding of the report inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: reports vary in quality. |
| Control tested flag inputs | Risk data office | General ledger and risk data warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: control IDs can be stale. |
| Business line and process inputs | Operations | Customer master and KYC repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: org changes alter mapping. |
| Similar prior events inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: retrieval must exclude future events. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: operational_risk_event_classification_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: text_embedding_of_the_report, type: double, nullable: false }
    - { name: control_tested_flag, type: double, nullable: false }
    - { name: business_line_and_process, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Text embedding of the report and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Control tested flag against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Text embedding of the report, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| GoEmotions | https://github.com/google-research/google-research/tree/master/goemotions | Apache 2.0 (see the repository) | 58,000 Reddit comments labelled with 27 emotion categories | Reddit language; label subjectivity. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BEIR benchmark | https://github.com/beir-cellar/beir | Per-dataset licences (see the repository) | A heterogeneous benchmark of 18 retrieval datasets for zero-shot evaluation | Academic tasks; domain match varies. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Banking77 intent dataset | https://huggingface.co/datasets/PolyAI/banking77 | CC BY 4.0 (see the page) | 13,000 customer banking queries labelled with 77 intents | Short single-turn queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE operational_risk_event_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE operational_risk_event_outputs (
  run_id TEXT NOT NULL REFERENCES operational_risk_event_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE operational_risk_event_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE operational_risk_event_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Operational Risk Event Classification & Loss Forecasting": Classify incident reports into the operational risk taxonomy and forecast loss severity so controls and capital reflect real event patterns. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Regulatory change and reporting | Rules change constantly across prudential, conduct and financial crime regimes. Firms track consultations, map obligations to policies and controls, report to supervisors on fixed schedules and keep evidence of compliance. | Language-model tools that summarise regulation must cite the paragraph and the version in force, because a confident summary of superseded text is worse than none. |
| Capital: risk-weighted assets and the capital ratio | Regulators require banks to hold capital against risk-weighted assets, where each exposure's weight depends on its type, rating and collateral. Reducing RWA by selling, hedging or restructuring frees capital but costs income, so the choice is a trade-off between capital use and return. | Optimisation models must use the regulatory definitions exactly, and a reduction that cannot be executed is not a reduction. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Text embedding of the report | Encoder over the narrative. Captures cause and impact. | Leakage risk to design against: Reports vary in quality. |
| A signal-versus-noise trap in this use case: Taxonomy | The true signal is event type, cause and control failure as separate labels; the common noise is one free-text category. | Without causes, remediation repeats. |

**Ask the experts**

- [ ] What exactly does "Basel event types and business lines mapped" mean in practice for operational risk event classification & loss forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Text embedding of the report" and "Control tested flag", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Reviewer time per report" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labels reflect the first classification, not the final one, and who can confirm the cut-off times and splits?
- [ ] How often does "Novel event type" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Corporate action | An event initiated by an issuer, such as a dividend, split or merger, that affects security holders. |
| Catastrophe model | A simulation of hazard, exposure and vulnerability that estimates insured losses from events such as storms or earthquakes. |
| Model tier | A classification of a model by its materiality, which sets how deeply it is validated. |
| KYC refresh | Periodic review of a customer's identity and risk information, more often for higher-risk customers. |
| RWA | Risk-weighted assets: exposures scaled by regulatory risk weights, used to compute capital requirements. |
| CET1 | Common equity tier 1: the highest-quality regulatory capital, held as a ratio of risk-weighted assets. |
| Rebalancing | Trading a portfolio back to its target allocation after market moves. |
| Longevity risk | The risk that people live longer than assumed, raising the cost of pensions and annuities. |
| Four-eyes principle | A control requiring a second person to approve a sensitive action. |
| Obligation register | A list of regulatory requirements mapped to the policies and controls that satisfy them. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| F1 score | The harmonic mean of precision and recall. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
