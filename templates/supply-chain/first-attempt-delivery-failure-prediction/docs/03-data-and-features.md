# First-Attempt Delivery Failure Prediction: data and feature specification

> Generated from the blueprint `supply-chain/first-attempt-delivery-failure-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** First-Attempt Delivery Failure Prediction · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "First-Attempt Delivery Failure Prediction": Predict which deliveries will fail on the first attempt and intervene (confirm availability, safe-place, locker) to cut costly re-deliveries. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Interventions not randomised.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Address delivery history | past first-attempt success at the address | Access | Matured |   |   |   |
| Time-window vs customer availability | predicted at-home probability | Failure | Preferences |   |   |   |
| Delivery instructions quality | structured instruction present | Access info | Parsing |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Action | Choose an intervention by uplift | Prediction only | A prediction without a cheap fix creates no value |
| Context | Address-level history (access, concierge) | Customer-level only | Access issues are tied to the address |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Order number | none |
| Courier name | personal |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Address delivery history inputs | Supply-chain planning | ERP (orders, inventory, finance) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: matured. |
| Time-window vs customer availability inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: preferences. |
| Delivery instructions quality inputs | Master data team | Supplier and EDI network | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: parsing. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: first_attempt_delivery_failure_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: address_delivery_history, type: double, nullable: false }
    - { name: time_window_vs_customer_availability, type: double, nullable: false }
    - { name: delivery_instructions_quality, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Address delivery history and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Time-window vs customer availability against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Address delivery history, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Amazon Last Mile Routing Research Challenge | https://registry.opendata.aws/amazon-last-mile-challenges/ | CDLA-Sharing 1.0 (see the registry page) | Real delivery routes with stop sequences and driver behaviour for routing research | US urban routes in 2018; routes only, no demand. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Olist Brazilian E-Commerce | https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce | CC BY-NC-SA 4.0 (see the dataset page) | 100K orders with items, payments, reviews, delivery times and seller data | One marketplace and year; useful for delivery, review and seller analyses. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DataCo Smart Supply Chain | https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis | See the dataset page; free Kaggle login | 180K order lines with shipping modes, delivery status, late-delivery risk and customers | Synthetic-looking and single company; use for pipeline work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE first_attempt_delivery_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  address_delivery_history           DOUBLE PRECISION,
  time_window_vs_customer_availability DOUBLE PRECISION,
  delivery_instructions_quality      DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE first_attempt_delivery_decisions (
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
CREATE TABLE first_attempt_delivery_labels (
  decision_id    UUID        NOT NULL REFERENCES first_attempt_delivery_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "First-Attempt Delivery Failure Prediction": Predict which deliveries will fail on the first attempt and intervene (confirm availability, safe-place, locker) to cut costly re-deliveries. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Routing, scheduling and optimisation under uncertainty | Vehicle routing, dispatch, slotting, wave planning, yard planning and timetabling are combinatorial optimisation problems. Travel times, demand and service times are uncertain, so plans built on point predictions are optimistic and fragile. | Optimising predictions systematically picks options whose errors are favourable; robust methods add margins and re-plan as reality unfolds. |
| Estimated time of arrival and delivery promises | ETAs combine routes, traffic, dwell times at stops and historical behaviour. Customers and planners act on them, so under- and over-estimates have different costs, and quantile predictions (a promise at the 90th percentile) are more useful than averages. | A good ETA is calibrated and updates as the shipment moves, not a single early number. |
| Asset health and predictive maintenance | Vehicles, warehouse equipment and cold-chain units generate sensor data. Failures are rare and costly, the cost of a false alarm is a wasted inspection, and the data are right-censored (assets still running). | Value comes from lead time to act and avoided downtime, so evaluation uses cost-weighted decisions and time-to-failure, not accuracy. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Address delivery history | Past first-attempt success at the address. Access. | Leakage risk to design against: Matured. |
| A signal-versus-noise trap in this use case: Action | The true signal is choose an intervention by uplift; the common noise is prediction only. | A prediction without a cheap fix creates no value. |

**Ask the experts**

- [ ] What exactly does "Customer consent for messages" mean in practice for first-attempt delivery failure prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Address delivery history" and "Time-window vs customer availability", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "First-attempt success rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: interventions not randomised, and who can confirm the cut-off times and splits?
- [ ] How often does "New housing development" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| First-attempt delivery rate | The share of parcels delivered successfully on the first try. |
| Last mile | The final leg of delivery from a local hub to the customer's door, the most expensive part. |
| Time window | The interval in which a customer or dock must be served. |
| Service level / fill rate | The probability of not stocking out in a cycle, or the share of demand met from stock. |
| Promotion uplift | The additional demand caused by a promotion relative to the baseline without it. |
| VRP / VRPTW | Vehicle routing problem and its version with customer time windows. |
| ETA | Estimated time of arrival of a shipment or vehicle. |
| Predictive maintenance | Servicing equipment when data show failure is likely rather than on a fixed schedule. |
| Remaining useful life | The estimated time before a component fails. |
| Proof of delivery | Evidence, often a photo or signature, that a parcel reached the customer. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Platt scaling | Calibrating scores with a logistic curve. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
