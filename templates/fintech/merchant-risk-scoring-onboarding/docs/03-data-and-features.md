# Merchant Risk Scoring at Onboarding: data and feature specification

> Generated from the blueprint `fintech/merchant-risk-scoring-onboarding` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Merchant Risk Scoring at Onboarding · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Merchant Risk Scoring at Onboarding": Score new merchants for fraud, regulatory and credit risk during onboarding, auto-approving the safe majority within a minute. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Outcomes only observed for approved merchants.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| MCC-site mismatch | classifier probability that the site belongs to the declared MCC | Misdeclaration is a risk marker | Crawl at onboarding time and freeze |   |   |   |
| Shared-director risk | max risk score among entities sharing directors or addresses | Re-registration pattern | Graph snapshot as-of application |   |   |   |
| Projected volume anomaly | declared monthly volume versus category quantiles | Overstated or understated volume | Declared value not observed future volume |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Website truth | Website content versus declared MCC and products | Declared business description | Fraudulent merchants declare benign categories |
| Network | Ownership and director links to previously terminated merchants | Single-entity KYB checks | Terminated merchants reappear under new entities |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Company name length | no signal |
| Incorporation month | spurious seasonality |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| MCC-site mismatch inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: crawl at onboarding time and freeze. |
| Shared-director risk inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: graph snapshot as-of application. |
| Projected volume anomaly inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: declared value not observed future volume. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: merchant_risk_scoring_onboarding_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: mcc_site_mismatch, type: double, nullable: false }
    - { name: shared_director_risk, type: double, nullable: false }
    - { name: projected_volume_anomaly, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on MCC-site mismatch and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Shared-director risk against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as MCC-site mismatch, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Stanford SNAP network datasets | https://snap.stanford.edu/data/ | Per-dataset terms (see the site) | A large collection of social, web and transaction networks | Mostly social networks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE merchant_risk_scoring_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE merchant_risk_scoring_fields (
  document_id TEXT NOT NULL REFERENCES merchant_risk_scoring_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE merchant_risk_scoring_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "Merchant Risk Scoring at Onboarding": Score new merchants for fraud, regulatory and credit risk during onboarding, auto-approving the safe majority within a minute. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| The authorisation flow and where the model sits | The cardholder pays a merchant, the merchant's acquirer or payment service provider sends an authorisation request through the card network to the issuer, and the issuer approves or declines. The fraud model typically runs at the issuer (which sees the card's whole history) or at the PSP and merchant (which see the basket, the device and the checkout session), and each sees different data. | Your feature list is limited to what your position in the chain can see, and the latency budget is a slice of the whole authorisation round trip. |
| Kinds of fraud look different | Card-not-present fraud (online purchases with stolen card details), card testing (many tiny purchases to find live cards), account takeover (a criminal uses the genuine customer's account), lost or stolen card and first-party fraud (the customer disputes a purchase they made) are different problems. Velocity features catch testing and fast cash-outs; takeover needs device, address-change and session signals. | One score for all of them hides which attack you miss. Evaluate and report by fraud type, as the worked example's missed takeovers show. |
| Chargebacks, reason codes and label delay | A cardholder disputes a transaction with their bank, which can reverse it through the card network (a chargeback) weeks or months later. The network's reason codes say why, and only some codes mean fraud. Fraud that nobody notices is never labelled, and fraud that customers notice quickly is over-represented in recent data. | Labels are late and biased. Train only on matured labels and keep a maturity gap before the test period, or you teach the model that recent fraud is genuine. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: MCC-site mismatch | Classifier probability that the site belongs to the declared MCC. Misdeclaration is a risk marker. | Leakage risk to design against: Crawl at onboarding time and freeze. |
| A signal-versus-noise trap in this use case: Website truth | The true signal is website content versus declared MCC and products; the common noise is declared business description. | Fraudulent merchants declare benign categories. |

**Ask the experts**

- [ ] What exactly does "Prohibited-business screening" mean in practice for merchant risk scoring at onboarding: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "MCC-site mismatch" and "Shared-director risk", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to onboard" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: outcomes only observed for approved merchants, and who can confirm the cut-off times and splits?
- [ ] How often does "Website behind login" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Card network | The scheme such as Visa or Mastercard that carries authorisation messages between acquirer and issuer and sets dispute rules. |
| False decline | A genuine transaction that is wrongly refused, also called a false positive, and a direct cost in revenue and customer trust. |
| PAN | Primary account number, the 13-19 digit number on the card; storing it is tightly controlled, so systems use tokens instead. |
| BIN | Bank identification number, the first 6-8 digits of a PAN that identify the issuing bank and card product. |
| Issuer | The bank that issued the card to the cardholder and decides whether to approve each authorisation. |
| Acquirer | The bank or processor that handles card payments on behalf of the merchant and routes authorisations to the network. |
| PSP | Payment service provider, a company such as a payment gateway that gives merchants one integration for accepting payments. |
| Authorisation | The real-time request in which the issuer approves or declines a payment; money moves later in clearing and settlement. |
| Clearing and settlement | The batch process after authorisation in which transaction details are exchanged and funds are actually transferred. |
| Chargeback | A reversal of a payment forced through the card network after the cardholder disputes it, usually weeks or months later. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Heterogeneous graph | A graph with several kinds of nodes and edges, such as users, devices and merchants. |
| Node / edge | The entities in a graph and the relationships between them. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
