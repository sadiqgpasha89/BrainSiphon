# Mortgage Underwriting Document Automation: data and feature specification

> Generated from the blueprint `bfsi/mortgage-underwriting-document-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Mortgage Underwriting Document Automation · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Mortgage Underwriting Document Automation": Classify, extract and cross-check the documents in a mortgage file (payslips, bank statements, tax returns, ID, valuation) so underwriters review exceptions instead of retyping fields. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test files from the same broker as training inflate extraction accuracy.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Net pay to statement credit match | absolute difference between payslip net pay and matched salary credit within 3 days of pay date | Genuine income reconciles, edited documents rarely do | Matching window must use document dates, not upload dates |   |   |   |
| Document tamper score | font, compression and metadata inconsistency score per page | Edited PDFs carry editing artefacts | Scanner and phone-camera files must not be scored against born-digital files |   |   |   |
| Field confidence margin | gap between top and second extraction hypothesis per field | Low margin predicts needed review | Margin must come from a calibrated model, not raw softmax |   |   |   |
| Pay frequency consistency | implied annual income from payslip versus year-to-date figure | Mismatch flags misread periods | Year-to-date fields are absent on some payslips |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Extraction scope | Fields that drive an affordability decision: gross income, employer, pay frequency, deductions | Extracting every printed field on the page | Wide extraction raises error surface while the decision uses ten fields |
| Consistency | Cross-document checks: payslip net pay against the bank statement credit | Judging each document alone | A forged payslip looks perfect alone and fails only against the statement |
| Layout shift | Template-free models robust to employer-specific payslip layouts | Per-template rules for the top 20 employers | Rules cover 60% of volume and silently fail on the long tail |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Page count of the pack | depends on the applicant's scanner and not on credit quality |
| File name | set by the broker and changes between submissions |
| Postcode of the applicant | proxy risk in a document task, adds nothing to extraction |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Net pay to statement credit match inputs | Core banking IT | Core banking or policy administration system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: matching window must use document dates, not upload dates. |
| Document tamper score inputs | Risk data office | General ledger and risk data warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: scanner and phone-camera files must not be scored against born-digital files. |
| Field confidence margin inputs | Operations | Customer master and KYC repository | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: margin must come from a calibrated model, not raw softmax. |
| Pay frequency consistency inputs | Core banking IT | Core banking or policy administration system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: year-to-date fields are absent on some payslips. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: mortgage_underwriting_document_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: net_pay_to_statement_credit_match, type: double, nullable: false }
    - { name: document_tamper_score, type: double, nullable: false }
    - { name: field_confidence_margin, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Net pay to statement credit match and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Document tamper score against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Net pay to statement credit match, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE mortgage_underwriting_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE mortgage_underwriting_detections (
  frame_id TEXT NOT NULL REFERENCES mortgage_underwriting_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE mortgage_underwriting_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Mortgage Underwriting Document Automation": Classify, extract and cross-check the documents in a mortgage file (payslips, bank statements, tax returns, ID, valuation) so underwriters review exceptions instead of retyping fields. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| How a bank lends: origination, servicing and workout | A loan is originated (application, underwriting, approval, documents), serviced for years (payments, covenants, reviews) and, if the borrower struggles, moved to collections or workout. Each stage has its own data, owner and model: underwriting models see applicants, behaviour models see accounts, early-warning models see covenant and cash-flow signals. | Which stage you are modelling decides the label, the delay before you learn the outcome and which team acts on your score. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Capital markets operations: trade, settle, reconcile | After a trade is agreed it is confirmed, matched, allocated and settled, usually a day or two later, and the books of the bank, the custodian and the counterparty are reconciled. Fails, breaks and corporate actions create exceptions that operations teams chase against deadlines and penalties. | Operations capacity is the constraint, so models are judged on how well they rank exceptions within the number of items a team can handle. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Shortcuts, domain shift and evaluation across sites | Vision models readily learn cues unrelated to the task: scanner markings, backgrounds, lighting, text overlays. Performance then collapses on a new device or site. Evaluation must hold out entire sites or cameras, and operating thresholds must be re-validated where they are deployed. | Split by physical item or patient, and always test on a site the model has not seen. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Net pay to statement credit match | Absolute difference between payslip net pay and matched salary credit within 3 days of pay date. Genuine income reconciles, edited documents rarely do. | Leakage risk to design against: Matching window must use document dates, not upload dates. |
| A signal-versus-noise trap in this use case: Extraction scope | The true signal is fields that drive an affordability decision: gross income, employer, pay frequency, deductions; the common noise is extracting every printed field on the page. | Wide extraction raises error surface while the decision uses ten fields. |

**Ask the experts**

- [ ] What exactly does "Every extracted field links to its source page and box" mean in practice for mortgage underwriting document automation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Net pay to statement credit match" and "Document tamper score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Underwriter minutes per file" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: test files from the same broker as training inflate extraction accuracy, and who can confirm the cut-off times and splits?
- [ ] How often does "Phone photo of a payslip" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| DTI | Debt-to-income: total monthly debt payments divided by monthly income, a standard affordability measure. |
| Underwriting | Assessing a risk and deciding whether to accept it and at what price. |
| Straight-through processing | Handling a transaction or claim end to end without manual touch. |
| Four-eyes principle | A control requiring a second person to approve a sensitive action. |
| Model tier | A classification of a model by its materiality, which sets how deeply it is validated. |
| LTV | Loan-to-value: the loan balance divided by the property value; a higher LTV means less equity cushion. |
| Spreading | Entering a borrower's financial statements into standard lines so ratios can be compared across firms. |
| PD, LGD, EAD | Probability of default, loss given default and exposure at default: the three inputs to expected credit loss. |
| Haircut | The percentage cut applied to an asset's market value when it is pledged as collateral. |
| KYC refresh | Periodic review of a customer's identity and risk information, more often for higher-risk customers. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| OCR / text detection | Finding and reading text in images. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
