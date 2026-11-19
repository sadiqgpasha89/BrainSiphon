# Real-Time Card & UPI Fraud Detection: data and feature specification

> Generated from the blueprint `fintech/real-time-card-upi-fraud-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Real-Time Card & UPI Fraud Detection · **Domain:** fintech · **Latency tier:** sub-10ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Real-Time Card & UPI Fraud Detection": Block fraudulent authorisations inside the payment auth path while keeping false declines under 0.3% of genuine volume. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on confirmed fraud only hides review-queue selection bias.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Card velocity 1m/1h/24h | count and sum of authorisations in sliding windows keyed by card token | Fraudsters cash out quickly | Windows must close strictly before decision time |   |   |   |
| Device-card fan-out | distinct cards seen on the device fingerprint in 24h | Mule devices touch many cards | Fingerprint must be hashed at event time, not retro-joined |   |   |   |
| Merchant risk drift | 7-day chargeback rate of the merchant versus its 90-day baseline | Compromised merchants shift abruptly | Chargebacks mature in 30-90 days so use matured labels only |   |   |   |
| New device for card | first time this card token is seen on this device fingerprint | Takeover and card testing start on unfamiliar devices | The first-seen table must be built from events before the decision, not from full history |   |   |   |
| Amount versus card baseline | amount divided by the card's trailing 90-day median ticket | A ten-times-normal basket is unusual for this card even if small in absolute terms | The baseline must exclude the scored transaction and any fraud already known |   |   |   |
| Mule-ring risk scalar | component risk and hop distance to known mule seeds, written to the online store every few seconds by a streaming graph worker (Flink with Neo4j or TigerGraph, or incremental connected components) | Rings share devices and beneficiaries and rotate accounts | Seed list and graph snapshot must be frozen at decision time |   |   |   |
| Payload-only score inputs | amount, payee MCC, device fingerprint and a local Bloom-filter blocklist hit, all present in the request | Keeps a usable score when the feature store times out | Must read nothing from the store or the fallback silently depends on it |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Velocity | Rolling counts and sums per card, device and merchant over 1m/1h/24h | Lifetime averages and static account age | Lifetime aggregates dilute a burst that lasts 90 seconds |
| Metrics | PR-AUC at a fixed 0.5% false-positive rate | Accuracy and ROC-AUC on a 0.1% positive class | ROC-AUC reads 0.99 while the operating region is useless |
| Labels | Labels used only after the chargeback window closes, with unreported recent rows excluded | Treating every transaction not yet reported as fraud as a genuine one | Recent fraud trained as negative teaches the model to ignore this week's attacks |
| Takeover | Account takeover signals such as a new device, changed contact details and session behaviour | Velocity as the only fraud signal | Quiet takeovers make three ordinary purchases and never trip a velocity rule |
| Action space | Three actions: allow, step-up challenge (OTP, biometric, cool-off) and hard block | One binary allow or block threshold | Ambiguous high-value payments are either declined, breaching the false-decline ceiling, or approved with no label; a challenge protects both and returns verified ground truth |
| Graph | Mule-ring risk precomputed by an asynchronous streaming graph worker and read as scalar features | Multi-hop GNN inference inside the authorisation path | Graph traversal cannot fit the budget, so write component risk and seed distance to the online store every few seconds for an O(1) lookup |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Cardholder name length | no causal link to fraud, overfits to data-entry quirks |
| Raw merchant free-text | high cardinality, replaced by MCC and a learned merchant embedding |
| Issuer country alone | too coarse, mostly proxies for population and creates unfair declines for travellers |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Card velocity 1m/1h/24h inputs | Payments engineering | Card management system and authorisation ledger | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: windows must close strictly before decision time. |
| Device-card fan-out inputs | Risk analytics | Core banking ledger | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: fingerprint must be hashed at event time, not retro-joined. |
| Merchant risk drift inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: chargebacks mature in 30-90 days so use matured labels only. |
| New device for card inputs | Payments engineering | HSM-backed token vault (PAN tokenisation) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: the first-seen table must be built from events before the decision, not from full history. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: real_time_card_upi_fraud_detection_inputs.v1
owner: payments-engineering@example.com
system_of_record: Card management system and authorisation ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: card_velocity_1m_1h_24h, type: double, nullable: false }
    - { name: device_card_fan_out, type: double, nullable: false }
    - { name: merchant_risk_drift, type: double, nullable: false }
sla:
  freshness_p95: 5 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Card velocity 1m/1h/24h and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Device-card fan-out against Card management system and authorisation ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 5 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Card velocity 1m/1h/24h, traces back to Card management system and authorisation ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Credit Card Fraud Detection (ULB / Worldline) | https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud | Database Contents License (DbCL) v1.0; free Kaggle login required | 284,807 European card transactions over two days with 492 frauds (0.17%); a clean imbalanced benchmark for the model and metric code | Features are PCA-anonymised and only 48 hours long, so there are no velocity windows, devices or merchants and no label delay; do not draw conclusions about feature engineering from it |
| IEEE-CIS Fraud Detection | https://www.kaggle.com/c/ieee-fraud-detection | Competition rules; accept them on Kaggle with a free login | About 590K e-commerce transactions with card, address, email-domain and device fields plus a 6-month time axis; the closest public set to a real auth log | Columns are masked (V1-V339) and identity is joined by a hashed key; build time-based splits by TransactionDT and expect a noisy private-leaderboard-style shift |
| PaySim synthetic mobile-money transactions | https://www.kaggle.com/datasets/ealaxi/paysim1 | CC BY-SA 4.0 (check the dataset page); free Kaggle login | 6.3M simulated transfers with sender and recipient accounts, useful for account-level velocity and mule-account graph features | Simulated from one real company's logs, so fraud patterns are simpler than production; there is no card, device or merchant dimension |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE real_time_card_upi_fraud_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  card_velocity_1m_1h_24h            DOUBLE PRECISION,
  device_card_fan_out                DOUBLE PRECISION,
  merchant_risk_drift                DOUBLE PRECISION,
  new_device_for_card                DOUBLE PRECISION,
  amount_versus_card_baseline        DOUBLE PRECISION,
  mule_ring_risk_scalar              DOUBLE PRECISION,
  payload_only_score_inputs          DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE real_time_card_upi_fraud_decisions (
  decision_id    UUID PRIMARY KEY,
  entity_id      TEXT        NOT NULL,
  decided_at     TIMESTAMPTZ NOT NULL,
  model_version  TEXT        NOT NULL,
  score          REAL,
  decision       TEXT        NOT NULL,
  reason_codes   JSONB,
  latency_ms     REAL,
  degraded       BOOLEAN     NOT NULL DEFAULT FALSE
) PARTITION BY RANGE (decided_at);

-- labels arrive late and may be revised; keep source + delay for survival-aware training
CREATE TABLE real_time_card_upi_fraud_labels (
  decision_id    UUID        NOT NULL REFERENCES real_time_card_upi_fraud_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| The authorisation flow and where the model sits | The cardholder pays a merchant, the merchant's acquirer or payment service provider sends an authorisation request through the card network to the issuer, and the issuer approves or declines. The fraud model typically runs at the issuer (which sees the card's whole history) or at the PSP and merchant (which see the basket, the device and the checkout session), and each sees different data. | Your feature list is limited to what your position in the chain can see, and the latency budget is a slice of the whole authorisation round trip. |
| Kinds of fraud look different | Card-not-present fraud (online purchases with stolen card details), card testing (many tiny purchases to find live cards), account takeover (a criminal uses the genuine customer's account), lost or stolen card and first-party fraud (the customer disputes a purchase they made) are different problems. Velocity features catch testing and fast cash-outs; takeover needs device, address-change and session signals. | One score for all of them hides which attack you miss. Evaluate and report by fraud type, as the worked example's missed takeovers show. |
| Chargebacks, reason codes and label delay | A cardholder disputes a transaction with their bank, which can reverse it through the card network (a chargeback) weeks or months later. The network's reason codes say why, and only some codes mean fraud. Fraud that nobody notices is never labelled, and fraud that customers notice quickly is over-represented in recent data. | Labels are late and biased. Train only on matured labels and keep a maturity gap before the test period, or you teach the model that recent fraud is genuine. |
| The cost asymmetry and the operating point | A missed fraud costs the transaction amount plus fees and handling. A false decline costs the margin, a frustrated customer and sometimes the customer. The business chooses a point on the trade-off, expressed as fraud basis points (fraud loss per 10,000 currency units of sales) and a false-decline rate, not as accuracy. | Metrics like accuracy or ROC-AUC mean nothing at a 0.4% fraud rate. Everything is evaluated at the fixed false-positive rate the business agrees in M0. |
| Rules, models and step-up authentication | Production systems combine a rules engine, one or more models and a policy layer with three outcomes, not two: approve, decline or challenge. A challenge asks the customer to prove themselves, for example 3-D Secure or a one-time code, and a review queue gives human analysts the grey zone within their capacity. | Scores between the review and block thresholds should usually become a challenge, which cuts false declines without letting fraud through. |
| Compliance shapes the design | PCI DSS restricts where full card numbers may be stored or processed, so features are computed on tokens, not card numbers. Declines often need reason codes, and data protection law (such as GDPR) limits profiling and requires explanations for automated decisions that affect customers. | Explainability and data minimisation are requirements on the baseline model, which is one reason a calibrated logistic regression stays in the system as a fallback. |

**Ask the experts**

- [ ] What are today's fraud basis points and false-decline rate, and what targets has the business set for each?
- [ ] Which dispute reason codes count as fraud for labelling, and how long until a transaction's label is final?
- [ ] What can the policy do between approve and decline (challenge, hold, review), and how many review cases can analysts handle per day?
- [ ] Which fields are allowed inside the authorisation path under our PCI scope, and which cannot be used as features?
- [ ] For UPI, how are fraudulent transfers reported and recovered, and how quickly are they flagged?

**Glossary**

| Term | Definition |
|---|---|
| PAN | Primary account number, the 13-19 digit number on the card; storing it is tightly controlled, so systems use tokens instead. |
| BIN | Bank identification number, the first 6-8 digits of a PAN that identify the issuing bank and card product. |
| Issuer | The bank that issued the card to the cardholder and decides whether to approve each authorisation. |
| Acquirer | The bank or processor that handles card payments on behalf of the merchant and routes authorisations to the network. |
| PSP | Payment service provider, a company such as a payment gateway that gives merchants one integration for accepting payments. |
| Card network | The scheme such as Visa or Mastercard that carries authorisation messages between acquirer and issuer and sets dispute rules. |
| Authorisation | The real-time request in which the issuer approves or declines a payment; money moves later in clearing and settlement. |
| Clearing and settlement | The batch process after authorisation in which transaction details are exchanged and funds are actually transferred. |
| Chargeback | A reversal of a payment forced through the card network after the cardholder disputes it, usually weeks or months later. |
| Reason code | The network's code on a dispute that says why it was raised, for example fraud, goods not received or processing error. |
| Card-not-present (CNP) | A payment made without the physical card, mainly online or by phone, which has a much higher fraud rate than chip-and-PIN. |
| Card testing | Fraudsters making many tiny purchases with stolen card numbers to learn which ones are still live before a larger cash-out. |
| Account takeover (ATO) | A criminal gaining control of a genuine customer's account or card credentials and acting as them. |
| Mule | An account, device or person used to receive or move stolen funds or goods, often shared across many victims. |
| 3-D Secure / SCA | A customer authentication step (3-D Secure) used to meet strong customer authentication rules such as PSD2 in Europe. |
| False decline | A genuine transaction that is wrongly refused, also called a false positive, and a direct cost in revenue and customer trust. |
| Fraud basis points (bps) | Fraud losses per 10,000 units of sales value, the standard way to report fraud rates to the business. |
| Velocity check | A rule or feature based on how many transactions or how much value a card, device or merchant has seen in a recent time window. |
| Tokenisation | Replacing the card number with a surrogate value so systems can link transactions without holding the real number. |
| UPI | Unified Payments Interface, India's real-time account-to-account payment system, where payments are immediate and normally irreversible. |
