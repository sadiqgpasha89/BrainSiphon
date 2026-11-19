# Account Takeover Detection: data and feature specification

> Generated from the blueprint `fintech/account-takeover-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Account Takeover Detection · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Account Takeover Detection": Detect credential-stuffing and session-hijack logins in real time and step up authentication without adding friction for real users. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Labels come only from users who reported fraud.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Device novelty vs history | hamming distance of device fingerprint to the account's top-3 devices | Takeovers come from unfamiliar devices | Fingerprint salt rotation must not create fake novelty |   |   |   |
| Impossible travel score | geodesic speed between consecutive logins | Physical constraint is hard to fake | Use IP geolocation confidence not raw coordinates |   |   |   |
| Login failure burst | failed attempts against the account in 15 minutes | Credential stuffing signature | Count attempts before the success only |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Behaviour | Typing cadence, navigation order and session continuity | IP reputation alone | Residential proxies make IP reputation near-useless |
| Sequence | Login followed by immediate payee or address change | Isolated login anomaly | Attackers act within minutes, the sequence is the signal |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Browser user-agent string | trivially spoofed, use TLS and canvas entropy features |
| Time-of-day of login | confounded with timezone, use deviation from the user's own pattern |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Device novelty vs history inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: fingerprint salt rotation must not create fake novelty. |
| Impossible travel score inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: use IP geolocation confidence not raw coordinates. |
| Login failure burst inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: count attempts before the success only. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: account_takeover_detection_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: device_novelty_vs_history, type: double, nullable: false }
    - { name: impossible_travel_score, type: double, nullable: false }
    - { name: login_failure_burst, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Device novelty vs history and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Impossible travel score against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Device novelty vs history, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| IEEE-CIS Fraud Detection | https://www.kaggle.com/c/ieee-fraud-detection | Competition rules; free Kaggle login | About 590K e-commerce transactions with card, address, email-domain and device fields over six months | Columns are masked and identity is joined by a hashed key; build time-based splits. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Credit Card Fraud Detection (ULB / Worldline) | https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud | Database Contents License (DbCL) v1.0; free Kaggle login | 284,807 European card transactions over two days with 492 frauds; a clean imbalanced benchmark for model and metric code | Features are PCA-anonymised and only 48 hours long: no velocity windows, merchants or label delay. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE account_takeover_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  device_novelty_vs_history          DOUBLE PRECISION,
  impossible_travel_score            DOUBLE PRECISION,
  login_failure_burst                DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE account_takeover_detection_decisions (
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
CREATE TABLE account_takeover_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES account_takeover_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "Account Takeover Detection": Detect credential-stuffing and session-hijack logins in real time and step up authentication without adding friction for real users. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Rules, models and step-up authentication | Production systems combine a rules engine, one or more models and a policy layer with three outcomes, not two: approve, decline or challenge. A challenge asks the customer to prove themselves, for example 3-D Secure or a one-time code, and a review queue gives human analysts the grey zone within their capacity. | Scores between the review and block thresholds should usually become a challenge, which cuts false declines without letting fraud through. |
| Chargebacks, reason codes and label delay | A cardholder disputes a transaction with their bank, which can reverse it through the card network (a chargeback) weeks or months later. The network's reason codes say why, and only some codes mean fraud. Fraud that nobody notices is never labelled, and fraud that customers notice quickly is over-represented in recent data. | Labels are late and biased. Train only on matured labels and keep a maturity gap before the test period, or you teach the model that recent fraud is genuine. |
| The authorisation flow and where the model sits | The cardholder pays a merchant, the merchant's acquirer or payment service provider sends an authorisation request through the card network to the issuer, and the issuer approves or declines. The fraud model typically runs at the issuer (which sees the card's whole history) or at the PSP and merchant (which see the basket, the device and the checkout session), and each sees different data. | Your feature list is limited to what your position in the chain can see, and the latency budget is a slice of the whole authorisation round trip. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Device novelty vs history | Hamming distance of device fingerprint to the account's top-3 devices. Takeovers come from unfamiliar devices. | Leakage risk to design against: Fingerprint salt rotation must not create fake novelty. |
| A signal-versus-noise trap in this use case: Behaviour | The true signal is typing cadence, navigation order and session continuity; the common noise is iP reputation alone. | Residential proxies make IP reputation near-useless. |

**Ask the experts**

- [ ] What exactly does "Added login latency under 60 ms" mean in practice for account takeover detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Device novelty vs history" and "Impossible travel score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "ATO loss per 10k logins" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: labels come only from users who reported fraud, and who can confirm the cut-off times and splits?
- [ ] How often does "Corporate VPN rollout" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Account takeover (ATO) | A criminal gaining control of a genuine customer's account or card credentials and acting as them. |
| False decline | A genuine transaction that is wrongly refused, also called a false positive, and a direct cost in revenue and customer trust. |
| Velocity check | A rule or feature based on how many transactions or how much value a card, device or merchant has seen in a recent time window. |
| PAN | Primary account number, the 13-19 digit number on the card; storing it is tightly controlled, so systems use tokens instead. |
| BIN | Bank identification number, the first 6-8 digits of a PAN that identify the issuing bank and card product. |
| Issuer | The bank that issued the card to the cardholder and decides whether to approve each authorisation. |
| Acquirer | The bank or processor that handles card payments on behalf of the merchant and routes authorisations to the network. |
| PSP | Payment service provider, a company such as a payment gateway that gives merchants one integration for accepting payments. |
| Card network | The scheme such as Visa or Mastercard that carries authorisation messages between acquirer and issuer and sets dispute rules. |
| Authorisation | The real-time request in which the issuer approves or declines a payment; money moves later in clearing and settlement. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Level shift | An abrupt, lasting change in a series' average. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
