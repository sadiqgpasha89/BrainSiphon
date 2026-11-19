# Money Mule Account Detection: data and feature specification

> Generated from the blueprint `fintech/mule-account-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Money Mule Account Detection · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Money Mule Account Detection": Identify accounts used to move proceeds of fraud (mules) before cash-out, using flow shape and onboarding signals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Positives only from accounts already investigated.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Dwell time of funds | median seconds between credit and debit | Mules pass funds through | Compute on settled transactions |   |   |   |
| Sender diversity | distinct unrelated senders to the account in 7 days | Collection point pattern | Exclude known family/household links |   |   |   |
| Beneficiary fan-out | new payees added in the first 30 days | Cash-out routes | Count payees before the alert |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Flow shape | In-and-out within hours with many unrelated senders | Total monthly volume | Mules have modest volume with unusual dwell time |
| Cohort | New-account behaviour in first 14 days | Long-run history | Mule accounts are young; history does not exist yet |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Account balance snapshot | mules keep balance near zero by design |
| Age of customer | weak and risks bias |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Dwell time of funds inputs | Payments engineering | Core banking ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: compute on settled transactions. |
| Sender diversity inputs | Risk analytics | Card management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: exclude known family/household links. |
| Beneficiary fan-out inputs | Customer data office | Customer identity and KYC (CIAM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: count payees before the alert. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: mule_account_detection_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: dwell_time_of_funds, type: double, nullable: false }
    - { name: sender_diversity, type: double, nullable: false }
    - { name: beneficiary_fan_out, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Dwell time of funds and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Sender diversity against Core banking ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Dwell time of funds, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| PaySim synthetic mobile-money transactions | https://www.kaggle.com/datasets/ealaxi/paysim1 | See the dataset page; free Kaggle login | 6.3M simulated transfers with sender and recipient accounts | Simulated from one company's logs, so patterns are simpler than production. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Credit Card Fraud Detection (ULB / Worldline) | https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud | Database Contents License (DbCL) v1.0; free Kaggle login | 284,807 European card transactions over two days with 492 frauds; a clean imbalanced benchmark for model and metric code | Features are PCA-anonymised and only 48 hours long: no velocity windows, merchants or label delay. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IEEE-CIS Fraud Detection | https://www.kaggle.com/c/ieee-fraud-detection | Competition rules; free Kaggle login | About 590K e-commerce transactions with card, address, email-domain and device fields over six months | Columns are masked and identity is joined by a hashed key; build time-based splits. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE mule_account_detection_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE mule_account_detection_outputs (
  run_id TEXT NOT NULL REFERENCES mule_account_detection_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE mule_account_detection_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE mule_account_detection_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "Money Mule Account Detection": Identify accounts used to move proceeds of fraud (mules) before cash-out, using flow shape and onboarding signals. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Chargebacks, reason codes and label delay | A cardholder disputes a transaction with their bank, which can reverse it through the card network (a chargeback) weeks or months later. The network's reason codes say why, and only some codes mean fraud. Fraud that nobody notices is never labelled, and fraud that customers notice quickly is over-represented in recent data. | Labels are late and biased. Train only on matured labels and keep a maturity gap before the test period, or you teach the model that recent fraud is genuine. |
| The cost asymmetry and the operating point | A missed fraud costs the transaction amount plus fees and handling. A false decline costs the margin, a frustrated customer and sometimes the customer. The business chooses a point on the trade-off, expressed as fraud basis points (fraud loss per 10,000 currency units of sales) and a false-decline rate, not as accuracy. | Metrics like accuracy or ROC-AUC mean nothing at a 0.4% fraud rate. Everything is evaluated at the fixed false-positive rate the business agrees in M0. |
| Compliance shapes the design | PCI DSS restricts where full card numbers may be stored or processed, so features are computed on tokens, not card numbers. Declines often need reason codes, and data protection law (such as GDPR) limits profiling and requires explanations for automated decisions that affect customers. | Explainability and data minimisation are requirements on the baseline model, which is one reason a calibrated logistic regression stays in the system as a fallback. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Dwell time of funds | Median seconds between credit and debit. Mules pass funds through. | Leakage risk to design against: Compute on settled transactions. |
| A signal-versus-noise trap in this use case: Flow shape | The true signal is in-and-out within hours with many unrelated senders; the common noise is total monthly volume. | Mules have modest volume with unusual dwell time. |

**Ask the experts**

- [ ] What exactly does "Case disposition within 48h" mean in practice for money mule account detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Dwell time of funds" and "Sender diversity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Mule accounts closed before cash-out" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: positives only from accounts already investigated, and who can confirm the cut-off times and splits?
- [ ] How often does "Genuine marketplace seller receives many payments" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Account takeover (ATO) | A criminal gaining control of a genuine customer's account or card credentials and acting as them. |
| Mule | An account, device or person used to receive or move stolen funds or goods, often shared across many victims. |
| False decline | A genuine transaction that is wrongly refused, also called a false positive, and a direct cost in revenue and customer trust. |
| PAN | Primary account number, the 13-19 digit number on the card; storing it is tightly controlled, so systems use tokens instead. |
| BIN | Bank identification number, the first 6-8 digits of a PAN that identify the issuing bank and card product. |
| Issuer | The bank that issued the card to the cardholder and decides whether to approve each authorisation. |
| Acquirer | The bank or processor that handles card payments on behalf of the merchant and routes authorisations to the network. |
| PSP | Payment service provider, a company such as a payment gateway that gives merchants one integration for accepting payments. |
| Card network | The scheme such as Visa or Mastercard that carries authorisation messages between acquirer and issuer and sets dispute rules. |
| Authorisation | The real-time request in which the issuer approves or declines a payment; money moves later in clearing and settlement. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Heterogeneous graph | A graph with several kinds of nodes and edges, such as users, devices and merchants. |
| Node / edge | The entities in a graph and the relationships between them. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
