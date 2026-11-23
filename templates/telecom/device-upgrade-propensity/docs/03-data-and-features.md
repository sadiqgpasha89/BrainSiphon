# Device Upgrade Propensity: data and feature specification

> Generated from the blueprint `telecom/device-upgrade-propensity` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Device Upgrade Propensity · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Device Upgrade Propensity": Predict which customers are likely to upgrade a handset soon so retail, logistics and campaigns plan stock and offers sensibly. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counting visits as upgrades.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Device age | months since the device was acquired | Main driver | From the device record |   |   |   |
| Contract and instalment status | months left on the plan or payment | Upgrade eligibility | From billing |   |   |   |
| Battery and performance proxies | device health indicators with consent | Need to replace | Only with consent |   |   |   |
| Launch proximity | days since the last flagship launch | Demand wave | From the calendar |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Completed upgrades within 90 days | Store visits | Visits do not always lead to upgrades |
| Timing | Launch calendar and contract end | Calendar-free scoring | Upgrades cluster at launches and contract ends |
| Stock | Forecast by device and region | One national number | Stock outs are local |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer name | irrelevant and private |
| Colour preference | weak link |
| Store opening hours | no link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Device age inputs | Network engineering | OSS: inventory, fault and performance management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the device record. |
| Contract and instalment status inputs | OSS/BSS platform team | BSS: CRM, order management and billing | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from billing. |
| Battery and performance proxies inputs | Customer data office | Network element configuration and orchestration layer | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: only with consent. |
| Launch proximity inputs | Network engineering | OSS: inventory, fault and performance management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the calendar. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: device_upgrade_propensity_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: device_age, type: double, nullable: false }
    - { name: contract_and_instalment_status, type: double, nullable: false }
    - { name: battery_and_performance_proxies, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Device age and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Contract and instalment status against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Device age, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Rossmann Store Sales | https://www.kaggle.com/c/rossmann-store-sales | Competition rules; free Kaggle login | Daily sales for 1,115 drugstores with promotion, holiday and competitor features | Store-level totals, not SKU level. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE device_upgrade_propensity_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE device_upgrade_propensity_outputs (
  run_id TEXT NOT NULL REFERENCES device_upgrade_propensity_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE device_upgrade_propensity_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE device_upgrade_propensity_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Device Upgrade Propensity": Predict which customers are likely to upgrade a handset soon so retail, logistics and campaigns plan stock and offers sensibly. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Capacity is planned for the busy hour | Traffic is forecast per cell and per link for the busiest period, with growth from new devices, video and events. Spectrum and backhaul upgrades take months, so forecasts must be early and carry uncertainty. | Planning on average load causes congestion at peak, while over-building wastes capital. |
| Churn has drivers and a cost to prevent | Subscribers leave because of price, network quality, service failures, competitor offers and contract end dates. Retention offers cost margin, so they should go to customers who are both at risk and persuadable. | Predicting only who will leave wastes offers on customers who would have stayed or who cannot be saved. |
| Provisioning turns an order into a working service | Activation spans order capture, inventory, number and SIM assignment, network configuration and billing set-up across OSS and BSS systems. Failures often come from data mismatches between those systems. | Fall-out in the middle of a multi-system flow leaves a paying customer without service, so orders need compensating steps and clear status. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Device age | Months since the device was acquired. Main driver. | Leakage risk to design against: From the device record. |
| A signal-versus-noise trap in this use case: Label | The true signal is completed upgrades within 90 days; the common noise is store visits. | Visits do not always lead to upgrades. |

**Ask the experts**

- [ ] What exactly does "Use only consented marketing data" mean in practice for device upgrade propensity: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Device age" and "Contract and instalment status", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Stock outs" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: counting visits as upgrades, and who can confirm the cut-off times and splits?
- [ ] How often does "New device launch" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| BSS | Business support systems: customer-facing systems such as ordering, billing and customer management. |
| CDR | Call detail record: a record of a call or data session used for billing and analytics. |
| SIM swap | Moving a number to a new SIM, a step abused in account takeover. |
| KPI | Key performance indicator: a measured value used to track cell or service health. |
| Backhaul | The link that carries traffic from a cell site to the core network. |
| Number portability | The right to keep a phone number when changing operator. |
| Mediation | The system that collects and normalises usage records before billing. |
| Rating | Applying tariffs to usage records to calculate charges. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
