# Promotion Uplift & Coupon Targeting: data and feature specification

> Generated from the blueprint `retail/promotion-uplift-and-coupon-targeting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Promotion Uplift & Coupon Targeting · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Promotion Uplift & Coupon Targeting": Send coupons only to customers whose purchase probability rises because of the coupon, maximising incremental margin per promotion dollar. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on non-randomised past promotions.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Price sensitivity score | historical response to discount depth | Persuadable indicator | Randomised promos only |   |   |   |
| Purchase recency gap | days since last order vs typical cycle | Lapse risk | Cycle estimate from prior data |   |   |   |
| Category exposure | share of basket in coupon category | Relevance | Pre-campaign window |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Uplift | Incremental purchase effect per customer | Purchase propensity | High-propensity customers buy without the coupon |
| Validation | Randomised control group in every campaign | Pre/post comparison | Seasonality masks coupon effects |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Email open count | confounded with engagement |
| Customer city | weakly informative |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Price sensitivity score inputs | Catalogue operations | Product information management (PIM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: randomised promos only. |
| Purchase recency gap inputs | E-commerce engineering | Order management system (OMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: cycle estimate from prior data. |
| Category exposure inputs | Customer analytics | Customer data platform (CDP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: pre-campaign window. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: promotion_uplift_and_coupon_targeting_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: price_sensitivity_score, type: double, nullable: false }
    - { name: purchase_recency_gap, type: double, nullable: false }
    - { name: category_exposure, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Price sensitivity score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Purchase recency gap against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Price sensitivity score, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCI Online Retail | https://archive.ics.uci.edu/dataset/352/online+retail | CC BY 4.0 (see the UCI page) | About 540K invoices from a UK gift retailer over a year | Single retailer, no sessions; good for RFM, churn and basket work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE promotion_uplift_and_coupon_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE promotion_uplift_and_coupon_outputs (
  run_id TEXT NOT NULL REFERENCES promotion_uplift_and_coupon_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE promotion_uplift_and_coupon_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE promotion_uplift_and_coupon_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Promotion Uplift & Coupon Targeting": Send coupons only to customers whose purchase probability rises because of the coupon, maximising incremental margin per promotion dollar. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Price, promotion and demand | Price changes demand (elasticity), promotions pull sales forward or steal them from similar items (cannibalisation), and markdowns clear stock at the end of a season. Forecasts must treat promotions as known inputs, and price decisions as causal questions, not correlations. | Naively learning price from history confuses cause and effect: retailers discount slow items, so low prices correlate with low sales. |
| Customers, lifetime value and churn | Retailers segment customers by recency, frequency and monetary value, estimate lifetime value, and try to predict who will lapse or repurchase. Marketing spend should go where it changes behaviour (uplift), not where customers would buy anyway. | Offers cost margin; a model that targets likely buyers rather than persuadable ones wastes discounts. |
| Search, browse and ranking in a marketplace | Shoppers arrive through search queries, category pages and recommendation strips. Each is a ranking problem with different signals: a query has explicit intent, a category page has none, and a marketplace must also be fair to sellers and obey sponsored-placement rules. Position bias means top slots get clicks regardless of quality. | Offline relevance judgments, click logs and revenue metrics disagree; ranking systems are judged by interleaving and online tests, with exposure and fairness constraints. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Price sensitivity score | Historical response to discount depth. Persuadable indicator. | Leakage risk to design against: Randomised promos only. |
| A signal-versus-noise trap in this use case: Uplift | The true signal is incremental purchase effect per customer; the common noise is purchase propensity. | High-propensity customers buy without the coupon. |

**Ask the experts**

- [ ] What exactly does "Promotion budget" mean in practice for promotion uplift & coupon targeting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Price sensitivity score" and "Purchase recency gap", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Incremental margin per coupon dollar" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on non-randomised past promotions, and who can confirm the cut-off times and splits?
- [ ] How often does "Coupon leak on forums" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Uplift | The additional outcome caused by a treatment such as a coupon, compared with doing nothing. |
| Learning to rank | Training models to order items by relevance, using pointwise, pairwise or listwise losses. |
| Elasticity | How much demand changes for a given change in price. |
| Cannibalisation | A promotion on one item taking sales from a similar item rather than creating new demand. |
| RFM | Recency, frequency and monetary value: three measures used to segment customers. |
| Customer lifetime value (CLV) | The total value a customer is expected to bring over their relationship with the retailer. |
| Loyalty programme | A scheme that rewards repeat purchases with points or offers. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Champion / challenger | The model in production and a candidate that must beat it before promotion. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
