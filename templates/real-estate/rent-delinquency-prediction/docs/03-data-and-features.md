# Rent Delinquency Prediction: data and feature specification

> Generated from the blueprint `real-estate/rent-delinquency-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Rent Delinquency Prediction · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Rent Delinquency Prediction": Predict which tenants will miss rent in the next month so property managers can reach out early with payment plans. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Outreach changes outcomes, so a tenant helped by a plan looks like a false alarm.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Payment timing drift | change in days between the due date and payment over the last 4 months | A growing lag is the earliest sign of stress | Autopay hides it, so analyse autopay tenants through a different signal |   |   |   |
| Portal activity | visits to the payment page without a payment in the 10 days before the due date | Shows intent and difficulty | Noisy, and depends on how often tenants log in |   |   |   |
| Rent burden change | percentage rent increase minus any change in verified income | A sharp rise in burden predicts missed rent | Income data are often missing, so mark unknown explicitly |   |   |   |
| Maintenance disputes | count of open maintenance complaints older than 14 days | Tenants withhold rent over unresolved repairs | Logging is inconsistent, so use only closed-loop ticket data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Early | Signals that appear before the due date, such as payment-page visits and a drift in timing | The late-payment flag itself | By the time rent is late the manager has lost the chance to offer a plan |
| Cause | Signs of distress such as a job change, a rent increase and an open dispute | Past lateness alone | A first-time problem has no history, and lateness alone misses new trouble |
| Action | Payment plans and referrals that help the tenant | Scores used to punish | Tenants who feel watched stop engaging, and the programme loses the trust it needs to work |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Unit number | An arbitrary label that can proxy for building quality or floor |
| Name | Irrelevant to payment behaviour and a route to bias |
| Lease start day | Weakly tied to payment dates and not to difficulty paying |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Payment timing drift inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: autopay hides it, so analyse autopay tenants through a different signal. |
| Portal activity inputs | Property operations | Listing (MLS) feed and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: noisy, and depends on how often tenants log in. |
| Rent burden change inputs | Geospatial team | Building management system (BMS) and IoT hub | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: income data are often missing, so mark unknown explicitly. |
| Maintenance disputes inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: logging is inconsistent, so use only closed-loop ticket data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: rent_delinquency_prediction_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: payment_timing_drift, type: double, nullable: false }
    - { name: portal_activity, type: double, nullable: false }
    - { name: rent_burden_change, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Payment timing drift and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Portal activity against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Payment timing drift, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EPSS data and statistics | https://www.first.org/epss/ | Free to use with attribution (see the page) | Daily exploit prediction scores for all CVEs with historical data | Predicts exploitation probability, which you may want to improve on. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE rent_delinquency_prediction_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE rent_delinquency_prediction_outputs (
  run_id TEXT NOT NULL REFERENCES rent_delinquency_prediction_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE rent_delinquency_prediction_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE rent_delinquency_prediction_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Rent Delinquency Prediction": Predict which tenants will miss rent in the next month so property managers can reach out early with payment plans. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Leasing, rent and property operations | A landlord sets rent, screens applicants, collects payments, handles maintenance and decides renewals. Rent is observed as an asking rent and a signed rent, which differ, and tenant behaviour is shaped by notice periods, rent-control rules and payment cycles. | Operational models should support care and service (early outreach, correct dispatch) as much as revenue, and rules such as rent caps are hard constraints. |
| Commercial real estate: leases, rent roll and income | Commercial properties earn rent under long, negotiated leases with options, breaks, indexation and incentives. The rent roll lists each tenant, rent and expiry, net operating income is rent minus operating costs, and value is set by income and the cap rate investors accept. | Lease terms are the data, and most of them are in documents, so extraction quality directly limits forecasting and valuation. |
| Buildings as systems: HVAC, energy and sensors | Buildings run on heating, ventilation and air-conditioning plants controlled by a building management system with sensors for temperature, CO2, occupancy and energy. Comfort, cost and carbon are traded off, and equipment ages and fails in patterns visible in sensor data. | Control models must stay inside comfort and safety limits and fall back to the schedule when sensors fail. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Payment timing drift | Change in days between the due date and payment over the last 4 months. A growing lag is the earliest sign of stress. | Leakage risk to design against: Autopay hides it, so analyse autopay tenants through a different signal. |
| A signal-versus-noise trap in this use case: Early | The true signal is signals that appear before the due date, such as payment-page visits and a drift in timing; the common noise is the late-payment flag itself. | By the time rent is late the manager has lost the chance to offer a plan. |

**Ask the experts**

- [ ] What exactly does "Outreach is supportive and offers help, never a threat" mean in practice for rent delinquency prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Payment timing drift" and "Portal activity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Rent collected on time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: outreach changes outcomes, so a tenant helped by a plan looks like a false alarm, and who can confirm the cut-off times and splits?
- [ ] How often does "Payday timing" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Delinquency | A tenant being late on rent beyond the grace period. |
| NOI | Net operating income: rental income minus operating expenses, before debt service and tax. |
| Rent roll | A schedule of each tenant, unit, rent and lease expiry for a property. |
| Effective rent | Rent net of incentives such as free months, spread across the lease term. |
| Security deposit | Money held against damage or unpaid rent, returned after deductions at move-out. |
| Take-off | Measuring quantities from drawings to estimate materials and cost. |
| Data room | A secure online repository of documents shared during a property sale or due diligence. |
| Hedonic model | A regression that explains price from property characteristics such as size, rooms and location. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| Days on market | The number of days a listing takes to go under contract. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Lag feature | A past value of the series used as a predictor. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
