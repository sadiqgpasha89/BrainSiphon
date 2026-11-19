# Insurance Claims Fraud Detection: data and feature specification

> Generated from the blueprint `fintech/insurance-claims-fraud-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Insurance Claims Fraud Detection · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Insurance Claims Fraud Detection": Triage incoming claims by fraud likelihood to route investigators to the highest recovery opportunities while paying genuine claims fast. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels only from investigated claims.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Provider-claimant co-occurrence | count of past claims where the pair appears together | Collusion marker | Use claims before the current one |   |   |   |
| Claim-timing anomaly | days between policy inception and loss | Fraud near inception | Policy dates from the policy admin system as-of |   |   |   |
| Narrative similarity | embedding similarity of this loss description to prior flagged claims | Template reuse | Exclude same-claim documents |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Network | Shared providers, lawyers, repair shops and addresses across claims | Single claim attributes | Organised fraud lives in the links between claims |
| Text | Narrative inconsistency across statements and reports | Keyword flags | Keyword lists are trivially avoided |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Claim number | arbitrary identifier |
| Adjuster ID | memorises staff, not claim risk |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Provider-claimant co-occurrence inputs | Payments engineering | Core banking ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use claims before the current one. |
| Claim-timing anomaly inputs | Risk analytics | Card management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: policy dates from the policy admin system as-of. |
| Narrative similarity inputs | Customer data office | Customer identity and KYC (CIAM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: exclude same-claim documents. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: insurance_claims_fraud_detection_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: provider_claimant_co_occurrence, type: double, nullable: false }
    - { name: claim_timing_anomaly, type: double, nullable: false }
    - { name: narrative_similarity, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Provider-claimant co-occurrence and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Claim-timing anomaly against Core banking ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Provider-claimant co-occurrence, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Porto Seguro Safe Driver Prediction | https://www.kaggle.com/c/porto-seguro-safe-driver-prediction | Competition rules; free Kaggle login | 600K insurance policies with anonymised features and a claim-filed label | Anonymised features limit domain feature work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Credit Card Fraud Detection (ULB / Worldline) | https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud | Database Contents License (DbCL) v1.0; free Kaggle login | 284,807 European card transactions over two days with 492 frauds; a clean imbalanced benchmark for model and metric code | Features are PCA-anonymised and only 48 hours long: no velocity windows, merchants or label delay. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE insurance_claims_fraud_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE insurance_claims_fraud_outputs (
  run_id TEXT NOT NULL REFERENCES insurance_claims_fraud_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE insurance_claims_fraud_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE insurance_claims_fraud_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "Insurance Claims Fraud Detection": Triage incoming claims by fraud likelihood to route investigators to the highest recovery opportunities while paying genuine claims fast. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Insurance: claims, pricing and fraud | Insurers price risk from the expected frequency and severity of claims, collect premiums and pay claims. A loss ratio compares claims paid with premium earned. Claims data are heavy-tailed with many zeros, and fraud ranges from exaggerated claims to organised rings. | Models predict skewed targets (Poisson or Tweedie losses), must avoid unfair discrimination, and claims outcomes take months to settle. |
| Chargebacks, reason codes and label delay | A cardholder disputes a transaction with their bank, which can reverse it through the card network (a chargeback) weeks or months later. The network's reason codes say why, and only some codes mean fraud. Fraud that nobody notices is never labelled, and fraud that customers notice quickly is over-represented in recent data. | Labels are late and biased. Train only on matured labels and keep a maturity gap before the test period, or you teach the model that recent fraud is genuine. |
| Back-office documents and reconciliation | Banks still run on invoices, statements, journal entries and ledgers. Reconciliation matches records between systems, extraction pulls fields from documents, and both must tie to totals: line items add up, debits equal credits. | Arithmetic and accounting rules are hard constraints that a model's output can be checked against, which makes them strong validation signals. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Provider-claimant co-occurrence | Count of past claims where the pair appears together. Collusion marker. | Leakage risk to design against: Use claims before the current one. |
| A signal-versus-noise trap in this use case: Network | The true signal is shared providers, lawyers, repair shops and addresses across claims; the common noise is single claim attributes. | Organised fraud lives in the links between claims. |

**Ask the experts**

- [ ] What exactly does "Straight-through payment for low-risk claims" mean in practice for insurance claims fraud detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Provider-claimant co-occurrence" and "Claim-timing anomaly", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Fraud recovery per investigator hour" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labels only from investigated claims, and who can confirm the cut-off times and splits?
- [ ] How often does "Catastrophe event (hurricane) floods genuine claims" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Frequency / severity | How often claims occur and how large each one is; their product is expected loss. |
| Loss ratio | Claims paid divided by premium earned, a core measure of insurance profitability. |
| FNOL | First notice of loss: the first report of an insured event, where claims triage begins. |
| Subrogation | The insurer's right to recover claim payments from a party responsible for the loss. |
| Card network | The scheme such as Visa or Mastercard that carries authorisation messages between acquirer and issuer and sets dispute rules. |
| False decline | A genuine transaction that is wrongly refused, also called a false positive, and a direct cost in revenue and customer trust. |
| Underwriting | The process of deciding whether to lend or insure and on what terms. |
| ISO 20022 | A global standard for financial messages with rich structured data used by modern payment systems. |
| PAN | Primary account number, the 13-19 digit number on the card; storing it is tightly controlled, so systems use tokens instead. |
| BIN | Bank identification number, the first 6-8 digits of a PAN that identify the issuing bank and card product. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Blocking | Cheaply selecting candidate pairs for comparison so not all pairs are compared. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| Heterogeneous graph | A graph with several kinds of nodes and edges, such as users, devices and merchants. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
