# Healthcare Contract-Based Price Variance Detection: data and feature specification

> Generated from the blueprint `healthcare/healthcare-contract-price-variance-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract-Based Price Variance Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Contract-Based Price Variance Detection": Find differences between contracted and invoiced or paid prices after accounting for units, tiers, rebates, freight, taxes and amendments, and quantify the recoverable amount for finance to validate. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Treating all variance as recoverable.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Contract price at invoice date | effective-dated scheduled price for the item and tier | The expected price | Version at invoice date |   |   |   |
| Tier and rebate position | cumulative volume against tier thresholds and rebates earned | Explains legitimate differences | Cumulative at invoice date |   |   |   |
| Freight and tax adjustments | computed components | Separates add-ons from price | Rules |   |   |   |
| Variance persistence | repeated variance on the item over time | Systematic errors differ from one-offs | Past invoices |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Expected price | Deterministic computation from the contract schedule | A model estimate of the price | The expected price is defined by contract not learned |
| Components | Unit conversion, tier, rebate, freight and tax modelled | Headline price compare | Most differences are legitimate components |
| Reason | Variance explained by cause | Raw difference | Finance disputes need a cause |
| Recoverability | Estimated recoverable amount with dispute rules | Total variance | Not all variance is recoverable |
| Matching | Identifier-first item crosswalk | Description similarity | Wrong matches create false claims |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Invoice layout | style |
| Buyer identity | not a cause |
| Supplier sales representative | personal |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Contract price at invoice date inputs | Accounts payable | Accounts-payable and procurement system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: version at invoice date. |
| Tier and rebate position inputs | Procurement | Contract price schedules | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: cumulative at invoice date. |
| Freight and tax adjustments inputs | Contract management | Item crosswalk and master data | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: rules. |
| Variance persistence inputs | Finance | Payment system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: past invoices. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_contract_price_variance_inputs.v1
owner: accounts-payable@example.com
system_of_record: Accounts-payable and procurement system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: contract_price_at_invoice_date, type: double, nullable: false }
    - { name: tier_and_rebate_position, type: double, nullable: false }
    - { name: freight_and_tax_adjustments, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Contract price at invoice date and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Tier and rebate position against Accounts-payable and procurement system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Contract price at invoice date, traces back to Accounts-payable and procurement system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| EMBER malware dataset | https://github.com/elastic/ember | AGPL-3.0 (see the repository) | 1 million Windows PE file feature vectors with benign and malicious labels and a time split | Features, not raw files; labelling cut-off artefacts. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IEEE-CIS Fraud Detection | https://www.kaggle.com/c/ieee-fraud-detection | Competition rules; free Kaggle login | About 590K e-commerce transactions with card, address, email-domain and device fields over six months | Columns are masked and identity is joined by a hashed key; build time-based splits. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE healthcare_contract_price_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE healthcare_contract_price_fields (
  document_id TEXT NOT NULL REFERENCES healthcare_contract_price_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE healthcare_contract_price_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Contract-Based Price Variance Detection": Find differences between contracted and invoiced or paid prices after accounting for units, tiers, rebates, freight, taxes and amendments, and quantify the recoverable amount for finance to validate. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Regulation, privacy and trust in clinical AI | Clinical software may be regulated as a medical device, patient data is protected by privacy law, models must be validated on the population where they will run, and clinicians need to understand and override outputs. Federated approaches let hospitals learn together without sharing records. | Plan for validation evidence, post-deployment monitoring and de-identification from the first design review. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Contract price at invoice date | Effective-dated scheduled price for the item and tier. The expected price. | Leakage risk to design against: Version at invoice date. |
| A signal-versus-noise trap in this use case: Expected price | The true signal is deterministic computation from the contract schedule; the common noise is a model estimate of the price. | The expected price is defined by contract not learned. |

**Ask the experts**

- [ ] What exactly does "A deterministic calculation gives the expected price and anomaly prioritisation only ranks the residual" mean in practice for healthcare contract-based price variance detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Contract price at invoice date" and "Tier and rebate position", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Recovered amount" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: treating all variance as recoverable, and who can confirm the cut-off times and splits?
- [ ] How often does "Contract price schedule revised" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| Remote patient monitoring | Tracking patients' vital signs at home and alerting clinicians to changes. |
| Pathogenic variant | A genetic change that causes or raises the risk of disease. |
| Eligibility criteria | The rules that determine whether a patient may join a clinical trial. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
