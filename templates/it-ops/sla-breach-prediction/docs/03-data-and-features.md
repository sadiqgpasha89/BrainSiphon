# SLA Breach Prediction: data and feature specification

> Generated from the blueprint `it-ops/sla-breach-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SLA Breach Prediction · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "SLA Breach Prediction": Predict which open tickets will breach their service level and alert queue owners early enough to rebalance work, using queue and ticket signals and not individual performance. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Individual agent pressure.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Time remaining versus predicted work | clock and estimated effort | Core | From the ITSM |   |   |   |
| Queue load and staffing | open items and available people | Core | From the queue |   |   |   |
| Waiting state | waiting on customer or vendor | Pause | From the ticket |   |   |   |
| Priority and category | urgency and type | Context | From the ticket |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Tickets that breached the target | Tickets closed late for any reason | Customer holds are not breaches |
| Action | Queue rebalancing and escalation | Chasing individual agents | Individual pressure harms quality |
| Pause rules | Clock pauses applied correctly | Elapsed time | Pauses change the clock |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Agent name | personal data |
| Requester name | personal data |
| Ticket number | an identifier |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Time remaining versus predicted work inputs | Infrastructure and operations | IT service management platform | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the ITSM. |
| Queue load and staffing inputs | Service management | Configuration management database | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the queue. |
| Waiting state inputs | Security operations | Monitoring, logging and cloud billing platforms | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the ticket. |
| Priority and category inputs | Infrastructure and operations | IT service management platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the ticket. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: sla_breach_prediction_inputs.v1
owner: infrastructure-and-operations@example.com
system_of_record: IT service management platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: time_remaining_versus_predicted_work, type: double, nullable: false }
    - { name: queue_load_and_staffing, type: double, nullable: false }
    - { name: waiting_state, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Time remaining versus predicted work and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Queue load and staffing against IT service management platform
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Time remaining versus predicted work, traces back to IT service management platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EPSS data and statistics | https://www.first.org/epss/ | Free to use with attribution (see the page) | Daily exploit prediction scores for all CVEs with historical data | Predicts exploitation probability, which you may want to improve on. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE sla_breach_prediction_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  time_remaining_versus_predicted_work DOUBLE PRECISION,
  queue_load_and_staffing            DOUBLE PRECISION,
  waiting_state                      DOUBLE PRECISION,
  priority_and_category              DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE sla_breach_prediction_decisions (
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
CREATE TABLE sla_breach_prediction_labels (
  decision_id    UUID        NOT NULL REFERENCES sla_breach_prediction_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

IT operations keeps services running and people productive across data centres, clouds, networks and devices. Data arrives as huge volumes of metrics, logs, alerts and tickets, most of it noise, and changes made to production by automation must be controlled as carefully as changes made by people. For this use case, "SLA Breach Prediction": Predict which open tickets will breach their service level and alert queue owners early enough to rebalance work, using queue and ticket signals and not individual performance. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Service desks resolve repeat requests | Most tickets are password resets, access requests, device problems and how-to questions with known answers. Good knowledge and automation deflect them while keeping humans for complex cases. | Closing a chat without solving the problem looks like success in the numbers and fails the employee. |
| Incidents are solved from evidence | Responders compare metrics, logs, traces and recent changes to find the cause. Many incidents follow a change, so change records are strong evidence. | A diagnosis that does not cite its evidence cannot be tested by the commander. |
| Changes cause most incidents | Releases, configuration changes and patches are the main cause of outages. Risk-based change management, configuration baselines and staged rollouts reduce harm. | Drift between declared and actual configuration hides risk until something fails. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Time remaining versus predicted work | Clock and estimated effort. Core. | Leakage risk to design against: From the ITSM. |
| A signal-versus-noise trap in this use case: Label | The true signal is tickets that breached the target; the common noise is tickets closed late for any reason. | Customer holds are not breaches. |

**Ask the experts**

- [ ] What exactly does "Alerts at least 2 hours before a breach" mean in practice for sla breach prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Time remaining versus predicted work" and "Queue load and staffing", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "SLA breaches" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: individual agent pressure, and who can confirm the cut-off times and splits?
- [ ] How often does "Surge of tickets" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| SLA | Service level agreement: a commitment on service performance. |
| ITSM | IT service management: the practice and tools for managing IT services. |
| Incident | An unplanned interruption or reduction in service quality. |
| Change request | A proposal to change a production system. |
| SLO | Service level objective: a target for a service measure. |
| Tagging | Labels on resources used to assign cost and owners. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Lag feature | A past value of the series used as a predictor. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| F1 score | The harmonic mean of precision and recall. |
