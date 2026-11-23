# Truck-Roll Avoidance Prediction: data and feature specification

> Generated from the blueprint `telecom/truck-roll-avoidance-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Truck-Roll Avoidance Prediction · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Truck-Roll Avoidance Prediction": Predict whether a customer fault can be fixed remotely so a technician is sent only when needed, and remote steps are tried first for the rest. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Delaying critical visits.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Line and modem diagnostics | line quality, sync and reboot history | Remote fixability | From the line test |   |   |   |
| Fault description class | classified customer fault type | Prior for outcome | Use categories |   |   |   |
| Past visit outcomes on the line | earlier no-fault-found visits | Pattern signal | Per line |   |   |   |
| Device and firmware state | modem model and firmware version | Known issues | From device management |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Visits that found no fault or a remote-fixable fault | Visits that closed quickly | Quick visits can still need a technician |
| Safety | Safety and critical-service rules first | A model decision on all faults | A missed critical fault is costly |
| Action | Remote diagnostics and resets in order | A single remote attempt | The sequence resolves many cases |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Technician name | irrelevant |
| Ticket age alone | weak link |
| Customer name | irrelevant and private |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Line and modem diagnostics inputs | Network engineering | OSS: inventory, fault and performance management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the line test. |
| Fault description class inputs | OSS/BSS platform team | BSS: CRM, order management and billing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: use categories. |
| Past visit outcomes on the line inputs | Customer data office | Network element configuration and orchestration layer | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: per line. |
| Device and firmware state inputs | Network engineering | OSS: inventory, fault and performance management | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from device management. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: truck_roll_avoidance_prediction_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: line_and_modem_diagnostics, type: double, nullable: false }
    - { name: fault_description_class, type: double, nullable: false }
    - { name: past_visit_outcomes_on_the_line, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Line and modem diagnostics and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Fault description class against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Line and modem diagnostics, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EPSS data and statistics | https://www.first.org/epss/ | Free to use with attribution (see the page) | Daily exploit prediction scores for all CVEs with historical data | Predicts exploitation probability, which you may want to improve on. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Avazu Click-Through Rate Prediction | https://www.kaggle.com/c/avazu-ctr-prediction | Competition rules; free Kaggle login | About 40 million mobile ad impressions over 10 days with hourly timestamps | No position or dwell time. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE truck_roll_avoidance_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  line_and_modem_diagnostics         DOUBLE PRECISION,
  fault_description_class            DOUBLE PRECISION,
  past_visit_outcomes_on_the_line    DOUBLE PRECISION,
  device_and_firmware_state          DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE truck_roll_avoidance_decisions (
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
CREATE TABLE truck_roll_avoidance_labels (
  decision_id    UUID        NOT NULL REFERENCES truck_roll_avoidance_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Truck-Roll Avoidance Prediction": Predict whether a customer fault can be fixed remotely so a technician is sent only when needed, and remote steps are tried first for the rest. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Network quality is not customer experience | Customers feel video stalls, call quality, slow pages and failed activations, which depend on the end-to-end path and the device and not just on cell KPIs. Care contacts and surveys lag the experience by days. | Optimising network KPIs alone can leave the customers who complain unchanged. |
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Line and modem diagnostics | Line quality, sync and reboot history. Remote fixability. | Leakage risk to design against: From the line test. |
| A signal-versus-noise trap in this use case: Label | The true signal is visits that found no fault or a remote-fixable fault; the common noise is visits that closed quickly. | Quick visits can still need a technician. |

**Ask the experts**

- [ ] What exactly does "Never delay a visit for a safety or service-critical fault" mean in practice for truck-roll avoidance prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Line and modem diagnostics" and "Fault description class", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Truck rolls avoided" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: delaying critical visits, and who can confirm the cut-off times and splits?
- [ ] How often does "Intermittent fault" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Truck roll | Sending a field technician to a site. |
| Trouble ticket | A record of a fault or complaint that tracks diagnosis and repair. |
| BSS | Business support systems: customer-facing systems such as ordering, billing and customer management. |
| QoS | Quality of service: measurable network performance such as latency, loss and throughput. |
| Provisioning | Configuring the network and systems so a purchased service works. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Platt scaling | Calibrating scores with a logistic curve. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
