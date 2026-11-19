# Corporate Actions Event Extraction: data and feature specification

> Generated from the blueprint `bfsi/corporate-actions-event-extraction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Corporate Actions Event Extraction · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Corporate Actions Event Extraction": Extract corporate action events (dividends, splits, mergers, rights issues) and their terms from notices and vendor feeds into a golden source for downstream processing. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on a single vendor format.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Field confidence | calibrated confidence per extracted field | Routes to review | Calibration drifts by language |   |   |   |
| Source agreement | whether vendor and issuer notices agree | Flags errors | Different timing across sources |   |   |   |
| Date consistency | order check: announcement, ex, record, payment | Catches misreads | Market conventions differ |   |   |   |
| Instrument match | security identifier resolution | Links to holdings | Identifier changes after events |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Fields | Event type, record date, ex-date, rate, election deadlines | Free-text description | Dates and rates drive entitlements |
| Verification | Agreement between two independent sources | Trusting the first notice | Vendor errors and late amendments are frequent |
| Mandatory vs voluntary | Event class determines the process | Treating all events alike | Voluntary events need client elections by deadlines |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Notice formatting | varies across issuers |
| Letterhead | irrelevant |
| Notice length | style |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Field confidence inputs | Core banking IT | Core banking or policy administration system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: calibration drifts by language. |
| Source agreement inputs | Risk data office | General ledger and risk data warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: different timing across sources. |
| Date consistency inputs | Operations | Customer master and KYC repository | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: market conventions differ. |
| Instrument match inputs | Core banking IT | Core banking or policy administration system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: identifier changes after events. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: corporate_actions_event_extraction_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: field_confidence, type: double, nullable: false }
    - { name: source_agreement, type: double, nullable: false }
    - { name: date_consistency, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Field confidence and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Source agreement against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Field confidence, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
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
CREATE TABLE corporate_actions_event_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE corporate_actions_event_fields (
  document_id TEXT NOT NULL REFERENCES corporate_actions_event_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE corporate_actions_event_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Corporate Actions Event Extraction": Extract corporate action events (dividends, splits, mergers, rights issues) and their terms from notices and vendor feeds into a golden source for downstream processing. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Capital markets operations: trade, settle, reconcile | After a trade is agreed it is confirmed, matched, allocated and settled, usually a day or two later, and the books of the bank, the custodian and the counterparty are reconciled. Fails, breaks and corporate actions create exceptions that operations teams chase against deadlines and penalties. | Operations capacity is the constraint, so models are judged on how well they rank exceptions within the number of items a team can handle. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Treasury, liquidity and interest-rate risk | The treasury funds the bank, keeps enough liquid assets to survive outflows and manages how net interest income reacts to rates. Key ideas are intraday liquidity, deposit run-off, behavioural assumptions for deposits and prepayments, and the liquidity coverage and net stable funding rules. | Forecast errors here are measured in buffers held and funding costs paid, and the tail (a run, a rate shock) matters more than the average. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Field confidence | Calibrated confidence per extracted field. Routes to review. | Leakage risk to design against: Calibration drifts by language. |
| A signal-versus-noise trap in this use case: Fields | The true signal is event type, record date, ex-date, rate, election deadlines; the common noise is free-text description. | Dates and rates drive entitlements. |

**Ask the experts**

- [ ] What exactly does "Accuracy above 99.5% on mandatory events" mean in practice for corporate actions event extraction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Field confidence" and "Source agreement", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Manual touches per event" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating on a single vendor format, and who can confirm the cut-off times and splits?
- [ ] How often does "Late amendment" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Corporate action | An event initiated by an issuer, such as a dividend, split or merger, that affects security holders. |
| Covenant | A condition in a loan agreement, such as a maximum leverage ratio, that the borrower must keep to; a breach lets the lender act. |
| Intraday liquidity | The funds a bank needs during the day to make payments before incoming payments arrive. |
| Four-eyes principle | A control requiring a second person to approve a sensitive action. |
| NII | Net interest income: interest earned on assets minus interest paid on liabilities. |
| Deposit beta | How much of a change in the policy rate the bank passes on to depositors. |
| Securities lending | Temporarily lending securities for a fee against collateral, often to short sellers. |
| Suitability | The requirement that a recommended product fits the client's objectives, risk tolerance and circumstances. |
| Mis-selling | Selling a product that does not suit the client or by misleading them about it. |
| Rebalancing | Trading a portfolio back to its target allocation after market moves. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Distribution shift | A change in the data a model sees compared with training. |
