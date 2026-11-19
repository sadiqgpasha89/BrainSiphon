# Trade Surveillance: Spoofing & Layering Detection: data and feature specification

> Generated from the blueprint `fintech/trade-surveillance-spoofing-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Trade Surveillance: Spoofing & Layering Detection · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Trade Surveillance: Spoofing & Layering Detection": Detect order-book manipulation patterns (spoofing, layering, wash trades) in near real time for regulators and venues. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Few labelled cases drawn from enforcement bias.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Opposite-side execution after cancel | execution on side B within 500 ms of cancelling side A | Spoof signature | Use exchange sequence numbers |   |   |   |
| Large-order fleeting time | lifetime of large resting orders | Layering signal | Normalise by instrument liquidity |   |   |   |
| Price impact of cancelled orders | quote move caused by the resting order | Manipulative effect | Counterfactual using same-time books |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Sequence | Order cancel-after-trade sequences on opposite sides | Order cancel ratio alone | Market makers have high cancel ratios legitimately |
| Intent | Order-to-trade ratio conditioned on same-side execution | Raw message counts | Message counts reflect strategy not manipulation |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Trading volume per day | trader size, not behaviour |
| Account tenure | not an intent signal |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Opposite-side execution after cancel inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: use exchange sequence numbers. |
| Large-order fleeting time inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: normalise by instrument liquidity. |
| Price impact of cancelled orders inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: counterfactual using same-time books. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: trade_surveillance_spoofing_detection_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: opposite_side_execution_after_cancel, type: double, nullable: false }
    - { name: large_order_fleeting_time, type: double, nullable: false }
    - { name: price_impact_of_cancelled_orders, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Opposite-side execution after cancel and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Large-order fleeting time against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Opposite-side execution after cancel, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE trade_surveillance_spoofing_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  opposite_side_execution_after_cancel DOUBLE PRECISION,
  large_order_fleeting_time          DOUBLE PRECISION,
  price_impact_of_cancelled_orders   DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE trade_surveillance_spoofing_decisions (
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
CREATE TABLE trade_surveillance_spoofing_labels (
  decision_id    UUID        NOT NULL REFERENCES trade_surveillance_spoofing_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "Trade Surveillance: Spoofing & Layering Detection": Detect order-book manipulation patterns (spoofing, layering, wash trades) in near real time for regulators and venues. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Markets, execution and backtesting | Trading models forecast returns, volatility or the cost of trading. Orders move prices (market impact), the gap between expected and achieved price is slippage, and a strategy's apparent performance in history is easily inflated by look-ahead bias, survivorship bias and trying many variants (overfitting the backtest). | Evaluation must respect time, include transaction costs and treat any number from a backtest as an upper bound. |
| Back-office documents and reconciliation | Banks still run on invoices, statements, journal entries and ledgers. Reconciliation matches records between systems, extraction pulls fields from documents, and both must tie to totals: line items add up, debits equal credits. | Arithmetic and accounting rules are hard constraints that a model's output can be checked against, which makes them strong validation signals. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Opposite-side execution after cancel | Execution on side B within 500 ms of cancelling side A. Spoof signature. | Leakage risk to design against: Use exchange sequence numbers. |
| A signal-versus-noise trap in this use case: Sequence | The true signal is order cancel-after-trade sequences on opposite sides; the common noise is order cancel ratio alone. | Market makers have high cancel ratios legitimately. |

**Ask the experts**

- [ ] What exactly does "Sub-100ms detection of live patterns" mean in practice for trade surveillance: spoofing & layering detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Opposite-side execution after cancel" and "Large-order fleeting time", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Cases opened per month" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: few labelled cases drawn from enforcement bias, and who can confirm the cut-off times and splits?
- [ ] How often does "Venue sends corrected sequence numbers" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Limit order book | The list of buy and sell orders at each price for a security, which defines the market's liquidity. |
| Bid-ask spread | The difference between the highest price buyers offer and the lowest price sellers ask; a cost of trading. |
| Slippage | The difference between the price expected when an order is decided and the price actually obtained. |
| Market impact | The adverse price movement caused by one's own trading. |
| Spoofing | Placing orders with no intention to execute them to mislead other traders, a form of market abuse. |
| VWAP / TWAP | Volume-weighted and time-weighted average price: benchmarks and simple schedules for executing large orders. |
| Market making | Quoting both buy and sell prices continuously to earn the spread while managing inventory risk. |
| Inventory risk | The risk a market maker carries from holding a position whose price may move against it. |
| Sharpe ratio | Excess return per unit of risk; a common but easily inflated measure of strategy quality. |
| Look-ahead bias | Using information in a backtest that would not have been available at decision time. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Lag feature | A past value of the series used as a predictor. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| F1 score | The harmonic mean of precision and recall. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
