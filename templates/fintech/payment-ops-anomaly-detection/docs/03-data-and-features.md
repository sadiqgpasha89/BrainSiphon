# Payments Operations Anomaly Detection: data and feature specification

> Generated from the blueprint `fintech/payment-ops-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Payments Operations Anomaly Detection · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Payments Operations Anomaly Detection": Detect abnormal drops in success rate, latency or volume across thousands of payment dimensions within minutes of onset. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Synthetic injected anomalies unlike real outages.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Success-rate residual z-score | residual of success rate vs seasonal forecast | Anomaly measure | Forecast uses only past data |   |   |   |
| Volume-weighted impact | residual times affected volume | Prioritises business impact | Use rolling volume baseline |   |   |   |
| Dimension co-movement | which dimension values explain the drop | Root cause | Control for multiple comparisons |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Dimensions | Hierarchical detection across (acquirer, BIN, region, method) | Monitoring only top-line success rate | Segment outages hide inside healthy aggregates |
| Noise | Seasonality-adjusted residuals with adaptive thresholds | Static thresholds | Weekly and diurnal cycles break static thresholds |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Single-minute dips in tiny segments | statistical noise |
| Holiday raw volumes | predictable via calendar |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Success-rate residual z-score inputs | Payments engineering | Core banking ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: forecast uses only past data. |
| Volume-weighted impact inputs | Risk analytics | Card management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: use rolling volume baseline. |
| Dimension co-movement inputs | Customer data office | Customer identity and KYC (CIAM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: control for multiple comparisons. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: payment_ops_anomaly_detection_inputs.v1
owner: payments-engineering@example.com
system_of_record: Core banking ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: success_rate_residual_z_score, type: double, nullable: false }
    - { name: volume_weighted_impact, type: double, nullable: false }
    - { name: dimension_co_movement, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Success-rate residual z-score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Volume-weighted impact against Core banking ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Success-rate residual z-score, traces back to Core banking ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Server Machine Dataset (OmniAnomaly) | https://github.com/NetManAIOps/OmniAnomaly | MIT licence (see the repository) | Multivariate server metrics from an internet company with labelled anomalies | One company; coarse labels. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE payment_ops_anomaly_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  success_rate_residual_z_score      DOUBLE PRECISION,
  volume_weighted_impact             DOUBLE PRECISION,
  dimension_co_movement              DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE payment_ops_anomaly_detection_decisions (
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
CREATE TABLE payment_ops_anomaly_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES payment_ops_anomaly_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

A card payment passes through several companies in a few hundred milliseconds, and the fraud decision is made inside that window by whoever you work for: usually the card issuer or a payment service provider. What you can see, what you can do and how long you wait to learn the truth all follow from where you sit in that chain, so learn the chain first. UPI, India's instant account-to-account payment system, works differently: payments are final within seconds and there is no chargeback, so fraud is recovered through complaints and bank-to-bank processes instead. For this use case, "Payments Operations Anomaly Detection": Detect abnormal drops in success rate, latency or volume across thousands of payment dimensions within minutes of onset. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Chargebacks, reason codes and label delay | A cardholder disputes a transaction with their bank, which can reverse it through the card network (a chargeback) weeks or months later. The network's reason codes say why, and only some codes mean fraud. Fraud that nobody notices is never labelled, and fraud that customers notice quickly is over-represented in recent data. | Labels are late and biased. Train only on matured labels and keep a maturity gap before the test period, or you teach the model that recent fraud is genuine. |
| Anti-money-laundering and know-your-customer | Banks must verify who customers are (KYC), monitor transactions for patterns such as structuring and layering, screen names against sanctions and politically exposed person lists, and file suspicious activity reports with regulators within deadlines. Monitoring generates alerts that investigators review; most are false. | The cost of an alert is analyst time and the cost of a miss is regulatory penalty, so evaluation uses alert-to-report ratios and investigator capacity, not accuracy. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Success-rate residual z-score | Residual of success rate vs seasonal forecast. Anomaly measure. | Leakage risk to design against: Forecast uses only past data. |
| A signal-versus-noise trap in this use case: Dimensions | The true signal is hierarchical detection across (acquirer, BIN, region, method); the common noise is monitoring only top-line success rate. | Segment outages hide inside healthy aggregates. |

**Ask the experts**

- [ ] What exactly does "Alert latency under 3 minutes" mean in practice for payments operations anomaly detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Success-rate residual z-score" and "Volume-weighted impact", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Mean time to detect" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: synthetic injected anomalies unlike real outages, and who can confirm the cut-off times and splits?
- [ ] How often does "Planned maintenance window" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Reconciliation | Matching records between two systems, for example bank statements and ledger entries, and investigating differences. |
| ISO 20022 | A global standard for financial messages with rich structured data used by modern payment systems. |
| Acquirer | The bank or processor that handles card payments on behalf of the merchant and routes authorisations to the network. |
| False decline | A genuine transaction that is wrongly refused, also called a false positive, and a direct cost in revenue and customer trust. |
| BNPL | Buy now, pay later: short-term instalment credit offered at checkout, often with limited underwriting. |
| Transaction monitoring | Rules and models that scan account activity for suspicious patterns and raise alerts. |
| Interchange | The fee that a merchant's bank pays the card issuer on each card transaction. |
| Payment routing | Choosing which processor or acquirer sends a transaction, to maximise approval and minimise cost. |
| Authorisation rate | The share of payment attempts that are approved, a key revenue metric for merchants. |
| FX spread | The margin a bank adds to the market exchange rate when converting currency. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Robust z-score | A deviation measure using the median and median absolute deviation, which outliers do not distort. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
