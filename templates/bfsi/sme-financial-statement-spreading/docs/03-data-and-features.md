# SME Financial Statement Spreading: data and feature specification

> Generated from the blueprint `bfsi/sme-financial-statement-spreading` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SME Financial Statement Spreading · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "SME Financial Statement Spreading": Convert scanned or digital SME financial statements into standard spread lines so ratios and ratings use consistent definitions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Clean statements in training hide scanner noise in production.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Foot check residual | difference between reported totals and the sum of lines | Residuals show extraction errors | Rounding in thousands needs a tolerance |   |   |   |
| Label to account similarity | embedding similarity between a label and the account definitions | Handles synonyms and languages | Needs per-language calibration |   |   |   |
| Column role classification | probability a column is current, prior or note | Drives period correctness | Layout varies by auditor |   |   |   |
| Cross-statement consistency | profit on the income statement equals the movement in equity | Catches mapping errors | Dividends and other movements need explicit handling |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Foot and balance | Arithmetic validation that rows sum and the balance sheet balances | Trusting extracted numbers because the text read cleanly | OCR confuses 3, 8 and 5 while a balance check catches it |
| Mapping | Mapping to a standard chart of accounts by meaning and position | Matching label strings | The same item is labelled differently across firms and languages |
| Period | Correct period and currency per column | Assuming the rightmost column is the current year | Comparative columns switch order across filers |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Logo and letterhead | irrelevant visual content |
| Auditor name | no relation to the numbers |
| Page background colour | scanner artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Foot check residual inputs | Core banking IT | Core banking or policy administration system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: rounding in thousands needs a tolerance. |
| Label to account similarity inputs | Risk data office | General ledger and risk data warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: needs per-language calibration. |
| Column role classification inputs | Operations | Customer master and KYC repository | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: layout varies by auditor. |
| Cross-statement consistency inputs | Core banking IT | Core banking or policy administration system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: dividends and other movements need explicit handling. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: sme_financial_statement_spreading_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: foot_check_residual, type: double, nullable: false }
    - { name: label_to_account_similarity, type: double, nullable: false }
    - { name: column_role_classification, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Foot check residual and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Label to account similarity against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Foot check residual, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE sme_financial_statement_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE sme_financial_statement_detections (
  frame_id TEXT NOT NULL REFERENCES sme_financial_statement_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE sme_financial_statement_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "SME Financial Statement Spreading": Convert scanned or digital SME financial statements into standard spread lines so ratios and ratings use consistent definitions. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| How a bank lends: origination, servicing and workout | A loan is originated (application, underwriting, approval, documents), serviced for years (payments, covenants, reviews) and, if the borrower struggles, moved to collections or workout. Each stage has its own data, owner and model: underwriting models see applicants, behaviour models see accounts, early-warning models see covenant and cash-flow signals. | Which stage you are modelling decides the label, the delay before you learn the outcome and which team acts on your score. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Expected credit loss, IFRS 9 staging and provisions | Banks hold provisions against expected credit losses: twelve-month loss for performing loans (stage 1), lifetime loss once credit risk has increased significantly (stage 2) and for impaired loans (stage 3). Probability of default, loss given default and exposure at default are combined across scenarios, and a stage change can move provisions sharply. | A model that is slightly wrong near a stage boundary can move reported profit, so stability, hysteresis and explainability matter as much as discrimination. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Foot check residual | Difference between reported totals and the sum of lines. Residuals show extraction errors. | Leakage risk to design against: Rounding in thousands needs a tolerance. |
| A signal-versus-noise trap in this use case: Foot and balance | The true signal is arithmetic validation that rows sum and the balance sheet balances; the common noise is trusting extracted numbers because the text read cleanly. | OCR confuses 3, 8 and 5 while a balance check catches it. |

**Ask the experts**

- [ ] What exactly does "Totals must foot and balance, assets equal liabilities plus equity" mean in practice for sme financial statement spreading: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Foot check residual" and "Label to account similarity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Analyst minutes per statement" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: clean statements in training hide scanner noise in production, and who can confirm the cut-off times and splits?
- [ ] How often does "Handwritten amendments" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Spreading | Entering a borrower's financial statements into standard lines so ratios can be compared across firms. |
| Model tier | A classification of a model by its materiality, which sets how deeply it is validated. |
| PD, LGD, EAD | Probability of default, loss given default and exposure at default: the three inputs to expected credit loss. |
| DTI | Debt-to-income: total monthly debt payments divided by monthly income, a standard affordability measure. |
| Covenant | A condition in a loan agreement, such as a maximum leverage ratio, that the borrower must keep to; a breach lets the lender act. |
| RWA | Risk-weighted assets: exposures scaled by regulatory risk weights, used to compute capital requirements. |
| CET1 | Common equity tier 1: the highest-quality regulatory capital, held as a ratio of risk-weighted assets. |
| Corporate action | An event initiated by an issuer, such as a dividend, split or merger, that affects security holders. |
| Catastrophe model | A simulation of hazard, exposure and vulnerability that estimates insured losses from events such as storms or earthquakes. |
| Four-eyes principle | A control requiring a second person to approve a sensitive action. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| OCR / text detection | Finding and reading text in images. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Brier score | The mean squared difference between predicted probability and the 0/1 outcome. |
