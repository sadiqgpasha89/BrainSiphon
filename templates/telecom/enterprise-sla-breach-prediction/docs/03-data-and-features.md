# Enterprise SLA Breach Prediction: data and feature specification

> Generated from the blueprint `telecom/enterprise-sla-breach-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Enterprise SLA Breach Prediction · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Enterprise SLA Breach Prediction": Predict which enterprise services are likely to breach their SLA in the current period and trigger early action, so credits and churn fall. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using one SLA formula.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| SLA budget consumed | minutes of downtime used against the allowed budget | Primary signal | Contract rules applied |   |   |   |
| Incident rate on the path | incidents on the service path in 30 days | Reliability trend | From fault records |   |   |   |
| Maintenance planned | scheduled work that counts against the SLA | Future budget use | From change calendars |   |   |   |
| Redundancy state | whether the backup path is healthy | Risk amplifier | From topology |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Definition | The contractual SLA formula per customer | A generic availability figure | Contracts differ in measurement and exclusions |
| Horizon | Probability of a breach by period end given the budget used | End-of-period outcomes only | Action needs time to help |
| Action | Prioritised fixes on the services at risk | A report | Reports do not change outcomes |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Account manager | irrelevant |
| Customer logo | irrelevant |
| Contract number | an identifier |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| SLA budget consumed inputs | Network engineering | OSS: inventory, fault and performance management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: contract rules applied. |
| Incident rate on the path inputs | OSS/BSS platform team | BSS: CRM, order management and billing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from fault records. |
| Maintenance planned inputs | Customer data office | Network element configuration and orchestration layer | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from change calendars. |
| Redundancy state inputs | Network engineering | OSS: inventory, fault and performance management | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from topology. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: enterprise_sla_breach_prediction_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: sla_budget_consumed, type: double, nullable: false }
    - { name: incident_rate_on_the_path, type: double, nullable: false }
    - { name: maintenance_planned, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on SLA budget consumed and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Incident rate on the path against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as SLA budget consumed, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE enterprise_sla_breach_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  sla_budget_consumed                DOUBLE PRECISION,
  incident_rate_on_the_path          DOUBLE PRECISION,
  maintenance_planned                DOUBLE PRECISION,
  redundancy_state                   DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE enterprise_sla_breach_decisions (
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
CREATE TABLE enterprise_sla_breach_labels (
  decision_id    UUID        NOT NULL REFERENCES enterprise_sla_breach_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Enterprise SLA Breach Prediction": Predict which enterprise services are likely to breach their SLA in the current period and trigger early action, so credits and churn fall. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Network quality is not customer experience | Customers feel video stalls, call quality, slow pages and failed activations, which depend on the end-to-end path and the device and not just on cell KPIs. Care contacts and surveys lag the experience by days. | Optimising network KPIs alone can leave the customers who complain unchanged. |
| Radio access KPIs describe cell health | Cells are judged on accessibility, retention (drop rate), throughput, handover success, resource block use and interference. These vary strongly by hour, cell type and terrain. | A KPI that is normal for a rural macro cell is a failure for a dense urban cell, so baselines must be per cell and per hour. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: SLA budget consumed | Minutes of downtime used against the allowed budget. Primary signal. | Leakage risk to design against: Contract rules applied. |
| A signal-versus-noise trap in this use case: Definition | The true signal is the contractual SLA formula per customer; the common noise is a generic availability figure. | Contracts differ in measurement and exclusions. |

**Ask the experts**

- [ ] What exactly does "Per-contract SLA definitions applied exactly" mean in practice for enterprise sla breach prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "SLA budget consumed" and "Incident rate on the path", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "SLA credits paid" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using one SLA formula, and who can confirm the cut-off times and splits?
- [ ] How often does "Disputed outage" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| SLA | Service level agreement: the availability or performance a provider commits to. |
| MTTR | Mean time to repair: the average time from fault to restored service. |
| Trouble ticket | A record of a fault or complaint that tracks diagnosis and repair. |
| Number portability | The right to keep a phone number when changing operator. |
| Site outage | Loss of service at a cell site or link. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Stationarity | A series whose statistical properties do not change over time. |
| Lag feature | A past value of the series used as a predictor. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
