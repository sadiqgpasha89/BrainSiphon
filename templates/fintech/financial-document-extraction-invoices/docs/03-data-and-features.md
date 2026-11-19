# Financial Document & Invoice Extraction: data and feature specification

> Generated from the blueprint `fintech/financial-document-extraction-invoices` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Financial Document & Invoice Extraction · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Financial Document & Invoice Extraction": Extract line items, totals and tax from invoices, receipts and statements with 98% field accuracy and straight-through processing above 70%. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test set from the same vendors as train.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Subtotal-tax-total identity | sum of lines times tax rate versus total | Catches misread digits | Rounding rules per currency |   |   |   |
| Vendor template memory | per-vendor field position priors | Repeated layouts extract better | Template drift when vendors redesign |   |   |   |
| Field confidence margin | calibrated probability of top candidate versus runner-up | Routes ambiguous fields | Calibrate per field type |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Validation | Arithmetic and cross-field consistency checks | Per-token OCR confidence | A confident wrong digit is worse than a low-confidence right one |
| Layout | Layout-aware models using position and structure | Plain text OCR to LLM | Reading order breaks tables and totals |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Logo detection | not an extraction target |
| Document colour | irrelevant to fields |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Subtotal-tax-total identity inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: rounding rules per currency. |
| Vendor template memory inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: template drift when vendors redesign. |
| Field confidence margin inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: calibrate per field type. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: financial_document_extraction_invoices_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: subtotal_tax_total_identity, type: double, nullable: false }
    - { name: vendor_template_memory, type: double, nullable: false }
    - { name: field_confidence_margin, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Subtotal-tax-total identity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Vendor template memory against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Subtotal-tax-total identity, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE financial_document_extraction_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE financial_document_extraction_detections (
  frame_id TEXT NOT NULL REFERENCES financial_document_extraction_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE financial_document_extraction_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. For this use case, "Financial Document & Invoice Extraction": Extract line items, totals and tax from invoices, receipts and statements with 98% field accuracy and straight-through processing above 70%. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Back-office documents and reconciliation | Banks still run on invoices, statements, journal entries and ledgers. Reconciliation matches records between systems, extraction pulls fields from documents, and both must tie to totals: line items add up, debits equal credits. | Arithmetic and accounting rules are hard constraints that a model's output can be checked against, which makes them strong validation signals. |
| Markets, execution and backtesting | Trading models forecast returns, volatility or the cost of trading. Orders move prices (market impact), the gap between expected and achieved price is slippage, and a strategy's apparent performance in history is easily inflated by look-ahead bias, survivorship bias and trying many variants (overfitting the backtest). | Evaluation must respect time, include transaction costs and treat any number from a backtest as an upper bound. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Subtotal-tax-total identity | Sum of lines times tax rate versus total. Catches misread digits. | Leakage risk to design against: Rounding rules per currency. |
| A signal-versus-noise trap in this use case: Validation | The true signal is arithmetic and cross-field consistency checks; the common noise is per-token OCR confidence. | A confident wrong digit is worse than a low-confidence right one. |

**Ask the experts**

- [ ] What exactly does "Support 40 languages" mean in practice for financial document & invoice extraction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Subtotal-tax-total identity" and "Vendor template memory", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Cost per processed document" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: test set from the same vendors as train, and who can confirm the cut-off times and splits?
- [ ] How often does "Handwritten annotations over printed totals" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| ISO 20022 | A global standard for financial messages with rich structured data used by modern payment systems. |
| KYC / CDD | Know your customer and customer due diligence: verifying identity and assessing risk when onboarding and during the relationship. |
| Limit order book | The list of buy and sell orders at each price for a security, which defines the market's liquidity. |
| Slippage | The difference between the price expected when an order is decided and the price actually obtained. |
| Market impact | The adverse price movement caused by one's own trading. |
| VWAP / TWAP | Volume-weighted and time-weighted average price: benchmarks and simple schedules for executing large orders. |
| Reconciliation | Matching records between two systems, for example bank statements and ledger entries, and investigating differences. |
| General ledger | The master accounting record of a company's financial transactions, built from debits and credits. |
| OCR / text detection | Finding and reading text in images. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Distribution shift | A change in the data a model sees compared with training. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
