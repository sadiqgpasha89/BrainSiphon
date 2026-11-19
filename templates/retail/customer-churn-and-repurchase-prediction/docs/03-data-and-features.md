# Customer Repurchase & Churn Prediction: data and feature specification

> Generated from the blueprint `retail/customer-churn-and-repurchase-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Customer Repurchase & Churn Prediction · **Domain:** retail · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Customer Repurchase & Churn Prediction": Predict who will order again in the next 30/60/90 days to time retention actions and acquisition value estimates. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Random split mixing customer periods.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Recency over expected interval | days since last order divided by personal median interval | Lapse measure | Median from prior orders |   |   |   |
| Category mix breadth | number of categories purchased | Engagement depth | Cumulative to date |   |   |   |
| Return and complaint ratio | returns plus complaints over orders | Dissatisfaction | Use settled events |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Definition | Churn as exceeding the expected repurchase interval | Fixed 90-day inactivity | Replenishment cycles vary from days to years |
| Targeting | Uplift on retention actions | Churn probability | Customers about to churn may be unsavable |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer ID cohort | arbitrary |
| Marketing consent flag | channel artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Recency over expected interval inputs | Catalogue operations | Product information management (PIM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: median from prior orders. |
| Category mix breadth inputs | E-commerce engineering | Order management system (OMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: cumulative to date. |
| Return and complaint ratio inputs | Customer analytics | Customer data platform (CDP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use settled events. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: customer_churn_and_repurchase_prediction_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: recency_over_expected_interval, type: double, nullable: false }
    - { name: category_mix_breadth, type: double, nullable: false }
    - { name: return_and_complaint_ratio, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Recency over expected interval and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Category mix breadth against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Recency over expected interval, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCI Online Retail | https://archive.ics.uci.edu/dataset/352/online+retail | CC BY 4.0 (see the UCI page) | About 540K invoices from a UK gift retailer over a year | Single retailer, no sessions; good for RFM, churn and basket work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| KKBox Churn Prediction Challenge | https://www.kaggle.com/c/kkbox-churn-prediction-challenge | Competition rules; free Kaggle login | Subscription and listening logs for a music service with a churn label | Music streaming, not B2B SaaS. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE customer_churn_and_repurchase_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE customer_churn_and_repurchase_outputs (
  run_id TEXT NOT NULL REFERENCES customer_churn_and_repurchase_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE customer_churn_and_repurchase_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE customer_churn_and_repurchase_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Customer Repurchase & Churn Prediction": Predict who will order again in the next 30/60/90 days to time retention actions and acquisition value estimates. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Customers, lifetime value and churn | Retailers segment customers by recency, frequency and monetary value, estimate lifetime value, and try to predict who will lapse or repurchase. Marketing spend should go where it changes behaviour (uplift), not where customers would buy anyway. | Offers cost margin; a model that targets likely buyers rather than persuadable ones wastes discounts. |
| Fulfilment, delivery promises and returns | Orders are routed to warehouses or stores, shipped and sometimes returned. A delivery promise shown at checkout must be one the network can keep; reverse logistics decides whether to resell, refurbish or liquidate a return. | Promising too early causes late deliveries and complaints; promising too late loses conversion, so errors are asymmetric. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Seasonality, trend and calendar effects | Most business series repeat daily, weekly and annually, with holidays, promotions and outages on top. Models must separate these from real change, and know which calendar effects are known in advance. | Ignoring seasonality makes a normal Monday look like an incident and hides slow-moving real changes. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Recency over expected interval | Days since last order divided by personal median interval. Lapse measure. | Leakage risk to design against: Median from prior orders. |
| A signal-versus-noise trap in this use case: Definition | The true signal is churn as exceeding the expected repurchase interval; the common noise is fixed 90-day inactivity. | Replenishment cycles vary from days to years. |

**Ask the experts**

- [ ] What exactly does "Non-contractual setting" mean in practice for customer repurchase & churn prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Recency over expected interval" and "Category mix breadth", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Retained customers per marketing dollar" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: random split mixing customer periods, and who can confirm the cut-off times and splits?
- [ ] How often does "Seasonal buyers (gifting)" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| RFM | Recency, frequency and monetary value: three measures used to segment customers. |
| Loyalty programme | A scheme that rewards repeat purchases with points or offers. |
| Uplift | The additional outcome caused by a treatment such as a coupon, compared with doing nothing. |
| Customer lifetime value (CLV) | The total value a customer is expected to bring over their relationship with the retailer. |
| Leave-last-out | Evaluation that hides each session's final item and asks the model to predict it from the rest. |
| Learning to rank | Training models to order items by relevance, using pointwise, pairwise or listwise losses. |
| Position bias | Items shown higher get more clicks regardless of quality, so click logs must be corrected. |
| Replenishment | Ordering or moving stock to restore inventory to target levels. |
| Return rate | The share of purchases that are sent back, high in fashion and a major cost. |
| Reverse logistics | Handling returned goods: inspection, resale, refurbishment, liquidation or recycling. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Right-censoring | Observation ending before the event happens, so only a lower bound on the time is known. |
| Concordance index | A ranking measure for survival models: the chance the unit that fails first is ranked as riskier. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Robust z-score | A deviation measure using the median and median absolute deviation, which outliers do not distort. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
