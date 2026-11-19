# Ledger & Journal Entry Anomaly Audit: data and feature specification

> Generated from the blueprint `fintech/ledger-journal-entry-anomaly-audit` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ledger & Journal Entry Anomaly Audit · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Ledger & Journal Entry Anomaly Audit": Flag unusual journal entries and postings for auditors by learning normal posting behaviour across accounts, users and periods. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Seeded anomalies unlike real fraud.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Round-amount and just-below-threshold | proximity to approval limits | Structuring | Limits as-of date |   |   |   |
| Unusual preparer-account pair | rarity of this user posting to this account | Control override cue | Use history before the entry |   |   |   |
| Posting time anomaly | weekend or night postings relative to peer pattern | Manual override sign | Timezone normalised |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Population | Test 100% of entries with ranked risk | Random sampling of 5% | Fraud hides in entries the sample missed |
| Context | Peer-group baselines by account, preparer and period | Global thresholds | Month-end adjustments look odd globally but are normal |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Description length | no risk content |
| Entry sequence | arbitrary |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Round-amount and just-below-threshold inputs | Payments engineering | Core banking ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: limits as-of date. |
| Unusual preparer-account pair inputs | Risk analytics | Card management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use history before the entry. |
| Posting time anomaly inputs | Customer data office | Customer identity and KYC (CIAM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: timezone normalised. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: ledger_journal_entry_anomaly_audit_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: round_amount_and_just_below_threshold, type: double, nullable: false }
    - { name: unusual_preparer_account_pair, type: double, nullable: false }
    - { name: posting_time_anomaly, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Round-amount and just-below-threshold and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Unusual preparer-account pair against Core banking ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Round-amount and just-below-threshold, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| GH Archive | https://www.gharchive.org/ | Public event data (see the site) | Hourly public GitHub events: pushes, pull requests, issues and reviews | Public repositories only; bot noise. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE ledger_journal_entry_anomaly_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE ledger_journal_entry_anomaly_fields (
  document_id TEXT NOT NULL REFERENCES ledger_journal_entry_anomaly_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE ledger_journal_entry_anomaly_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "Ledger & Journal Entry Anomaly Audit": Flag unusual journal entries and postings for auditors by learning normal posting behaviour across accounts, users and periods. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Back-office documents and reconciliation | Banks still run on invoices, statements, journal entries and ledgers. Reconciliation matches records between systems, extraction pulls fields from documents, and both must tie to totals: line items add up, debits equal credits. | Arithmetic and accounting rules are hard constraints that a model's output can be checked against, which makes them strong validation signals. |
| Chargebacks, reason codes and label delay | A cardholder disputes a transaction with their bank, which can reverse it through the card network (a chargeback) weeks or months later. The network's reason codes say why, and only some codes mean fraud. Fraud that nobody notices is never labelled, and fraud that customers notice quickly is over-represented in recent data. | Labels are late and biased. Train only on matured labels and keep a maturity gap before the test period, or you teach the model that recent fraud is genuine. |
| Selection bias in lending data | You only observe repayment for applicants you approved. Rejected applicants have no outcome, so models trained on approved customers can be wrong for the people they would reject. Techniques such as reject inference and random approval experiments try to correct it. | A scorecard that looks accurate on past approvals can fail on the new applicants a policy change lets in. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Round-amount and just-below-threshold | Proximity to approval limits. Structuring. | Leakage risk to design against: Limits as-of date. |
| A signal-versus-noise trap in this use case: Population | The true signal is test 100% of entries with ranked risk; the common noise is random sampling of 5%. | Fraud hides in entries the sample missed. |

**Ask the experts**

- [ ] What exactly does "Full population testing not sampling" mean in practice for ledger & journal entry anomaly audit: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Round-amount and just-below-threshold" and "Unusual preparer-account pair", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Findings per hundred hours" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: seeded anomalies unlike real fraud, and who can confirm the cut-off times and splits?
- [ ] How often does "Quarter-end close creates posting spikes" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| General ledger | The master accounting record of a company's financial transactions, built from debits and credits. |
| Reconciliation | Matching records between two systems, for example bank statements and ledger entries, and investigating differences. |
| Card testing | Fraudsters making many tiny purchases with stolen card numbers to learn which ones are still live before a larger cash-out. |
| Account takeover (ATO) | A criminal gaining control of a genuine customer's account or card credentials and acting as them. |
| PAN | Primary account number, the 13-19 digit number on the card; storing it is tightly controlled, so systems use tokens instead. |
| BIN | Bank identification number, the first 6-8 digits of a PAN that identify the issuing bank and card product. |
| Issuer | The bank that issued the card to the cardholder and decides whether to approve each authorisation. |
| Acquirer | The bank or processor that handles card payments on behalf of the merchant and routes authorisations to the network. |
| PSP | Payment service provider, a company such as a payment gateway that gives merchants one integration for accepting payments. |
| Card network | The scheme such as Visa or Mastercard that carries authorisation messages between acquirer and issuer and sets dispute rules. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
