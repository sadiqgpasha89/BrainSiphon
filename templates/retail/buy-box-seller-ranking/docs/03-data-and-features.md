# Buy-Box & Seller Offer Ranking: data and feature specification

> Generated from the blueprint `retail/buy-box-seller-ranking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Buy-Box & Seller Offer Ranking · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Buy-Box & Seller Offer Ranking": Select which seller wins the featured offer for each product based on price, speed, reliability and customer-experience. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Outcomes confounded by Buy Box position.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Landed price percentile | price plus shipping percentile | Value | Include taxes |   |   |   |
| Seller defect rate | order defect rate over 60 days | Quality | Matured outcomes |   |   |   |
| Delivery promise reliability | actual vs promised ratio | Trust | Seller-level shrinkage |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Value | Landed price, delivery speed and defect risk jointly | Lowest price wins | Cheapest sellers with poor fulfilment cause returns |
| Gaming | Robust features resistant to manipulation | Raw seller-reported speed | Reported speeds are inflated |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Seller review count | gameable |
| Seller registration age | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Landed price percentile inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: include taxes. |
| Seller defect rate inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: matured outcomes. |
| Delivery promise reliability inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: seller-level shrinkage. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: buy_box_seller_ranking_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: landed_price_percentile, type: double, nullable: false }
    - { name: seller_defect_rate, type: double, nullable: false }
    - { name: delivery_promise_reliability, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Landed price percentile and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Seller defect rate against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Landed price percentile, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Olist Brazilian E-Commerce | https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce | CC BY-NC-SA 4.0 (see the dataset page) | 100K orders with items, payments, reviews, delivery times and seller data | One marketplace and year; useful for delivery, review and seller analyses. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Online Retail | https://archive.ics.uci.edu/dataset/352/online+retail | CC BY 4.0 (see the UCI page) | About 540K invoices from a UK gift retailer over a year | Single retailer, no sessions; good for RFM, churn and basket work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE buy_box_seller_ranking_impressions (
  impression_id  UUID PRIMARY KEY,
  user_id        TEXT        NOT NULL,
  shown_at       TIMESTAMPTZ NOT NULL,
  surface        TEXT        NOT NULL,
  item_id        TEXT        NOT NULL,
  rank           SMALLINT    NOT NULL,
  score          REAL,
  propensity     REAL        NOT NULL,   -- probability the policy showed this item at this rank
  source         TEXT        NOT NULL,   -- ann | co-visit | trending | business-rule | exploration
  model_version  TEXT        NOT NULL,
  experiment_arm TEXT
) PARTITION BY RANGE (shown_at);

CREATE TABLE buy_box_seller_ranking_feedback (
  impression_id  UUID        NOT NULL REFERENCES buy_box_seller_ranking_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE buy_box_seller_ranking_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Buy-Box & Seller Offer Ranking": Select which seller wins the featured offer for each product based on price, speed, reliability and customer-experience. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Search, browse and ranking in a marketplace | Shoppers arrive through search queries, category pages and recommendation strips. Each is a ranking problem with different signals: a query has explicit intent, a category page has none, and a marketplace must also be fair to sellers and obey sponsored-placement rules. Position bias means top slots get clicks regardless of quality. | Offline relevance judgments, click logs and revenue metrics disagree; ranking systems are judged by interleaving and online tests, with exposure and fairness constraints. |
| Fulfilment, delivery promises and returns | Orders are routed to warehouses or stores, shipped and sometimes returned. A delivery promise shown at checkout must be one the network can keep; reverse logistics decides whether to resell, refurbish or liquidate a return. | Promising too early causes late deliveries and complaints; promising too late loses conversion, so errors are asymmetric. |
| Customers, lifetime value and churn | Retailers segment customers by recency, frequency and monetary value, estimate lifetime value, and try to predict who will lapse or repurchase. Marketing spend should go where it changes behaviour (uplift), not where customers would buy anyway. | Offers cost margin; a model that targets likely buyers rather than persuadable ones wastes discounts. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Exploration, cold start and diversity | New items and users have no history and are never shown without deliberate exploration; recommenders also need diversity and fairness constraints so long-tail items and sellers get exposure. Bandit methods manage the explore-exploit trade-off. | Coverage and new-item exposure are product metrics, not afterthoughts. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Landed price percentile | Price plus shipping percentile. Value. | Leakage risk to design against: Include taxes. |
| A signal-versus-noise trap in this use case: Value | The true signal is landed price, delivery speed and defect risk jointly; the common noise is lowest price wins. | Cheapest sellers with poor fulfilment cause returns. |

**Ask the experts**

- [ ] What exactly does "Transparent seller policy" mean in practice for buy-box & seller offer ranking: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Landed price percentile" and "Seller defect rate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Defect rate of buy-box orders" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: outcomes confounded by Buy Box position, and who can confirm the cut-off times and splits?
- [ ] How often does "Seller price manipulation timed with ranking refresh" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Buy box | The featured offer on a product page that most purchases go through, which sellers compete for. |
| Conversion rate | The share of visits or sessions that end in a purchase. |
| Dark store | A shop or warehouse used only for fulfilling online orders. |
| Click-and-collect | Ordering online and picking up in store. |
| Loyalty programme | A scheme that rewards repeat purchases with points or offers. |
| Cold start | A new item or visitor with no history to learn from. |
| Learning to rank | Training models to order items by relevance, using pointwise, pairwise or listwise losses. |
| Position bias | Items shown higher get more clicks regardless of quality, so click logs must be corrected. |
| Uplift | The additional outcome caused by a treatment such as a coupon, compared with doing nothing. |
| Delivery promise | The delivery date or window shown to the customer at checkout. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Slate / list-wise optimisation | Choosing a whole list of items together rather than scoring each independently. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
| MRR | Mean reciprocal rank: the average of one over the rank of the first relevant item. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Coverage | The share of the catalogue that is ever recommended. |
| Multi-armed bandit | A decision setting that balances trying options to learn and using the best known option. |
