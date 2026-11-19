# Pre-Purchase Return Risk & Prevention: data and feature specification

> Generated from the blueprint `retail/pre-purchase-return-risk` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Pre-Purchase Return Risk & Prevention · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Pre-Purchase Return Risk & Prevention": Predict the likelihood a specific order line will be returned and use gentle interventions (fit info, alternate size) to prevent avoidable returns. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on observational nudges.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Bracketing behaviour | multiple sizes of same item in cart | Intentional return | Cart state at time |   |   |   |
| Item return-rate by size | historic return rate for that item size | Fit risk | Matured outcomes |   |   |   |
| Reviews mention fit | share of reviews flagging fit issues | Product expectation | Review snapshot |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Intervention | Uplift of nudges on avoidable returns | Return propensity | Some returns are unavoidable and some customers keep anyway |
| Reason | Predict returns by reason code (fit, quality, expectation) | Binary return flag | Different reasons need different actions |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Cart creation hour | none |
| Browser | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Bracketing behaviour inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: cart state at time. |
| Item return-rate by size inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: matured outcomes. |
| Reviews mention fit inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: review snapshot. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: pre_purchase_return_risk_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: bracketing_behaviour, type: double, nullable: false }
    - { name: item_return_rate_by_size, type: double, nullable: false }
    - { name: reviews_mention_fit, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Bracketing behaviour and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Item return-rate by size against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Bracketing behaviour, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Olist Brazilian E-Commerce | https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce | CC BY-NC-SA 4.0 (see the dataset page) | 100K orders with items, payments, reviews, delivery times and seller data | One marketplace and year; useful for delivery, review and seller analyses. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Telco Customer Churn | https://www.kaggle.com/datasets/blastchar/telco-customer-churn | See the dataset page; free Kaggle login | 7,000 subscribers with services, contract and churn label | Small, one telco, no time axis. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| GH Archive | https://www.gharchive.org/ | Public event data (see the site) | Hourly public GitHub events: pushes, pull requests, issues and reviews | Public repositories only; bot noise. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE pre_purchase_return_risk_impressions (
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

CREATE TABLE pre_purchase_return_risk_feedback (
  impression_id  UUID        NOT NULL REFERENCES pre_purchase_return_risk_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE pre_purchase_return_risk_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Pre-Purchase Return Risk & Prevention": Predict the likelihood a specific order line will be returned and use gentle interventions (fit info, alternate size) to prevent avoidable returns. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Trust and safety in marketplaces | Marketplaces face fake reviews, counterfeit goods, seller fraud, return abuse and checkout payment fraud. Attackers adapt, ground truth is partial, and enforcement affects honest sellers and buyers. | Precision matters as much as recall because every false action penalises a real seller or shopper. |
| Fulfilment, delivery promises and returns | Orders are routed to warehouses or stores, shipped and sometimes returned. A delivery promise shown at checkout must be one the network can keep; reverse logistics decides whether to resell, refurbish or liquidate a return. | Promising too early causes late deliveries and complaints; promising too late loses conversion, so errors are asymmetric. |
| Intent and the funnel | Shoppers move from browsing to comparing to buying: product views, add-to-cart, checkout and purchase. What is useful changes along the way: alternatives when someone is still choosing, accessories and complements once something is in the cart. | A good next item for a browsing shopper is a bad one for someone about to pay. Decide which stage each placement serves. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Bracketing behaviour | Multiple sizes of same item in cart. Intentional return. | Leakage risk to design against: Cart state at time. |
| A signal-versus-noise trap in this use case: Intervention | The true signal is uplift of nudges on avoidable returns; the common noise is return propensity. | Some returns are unavoidable and some customers keep anyway. |

**Ask the experts**

- [ ] What exactly does "Do not discourage genuine purchases" mean in practice for pre-purchase return risk & prevention: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Bracketing behaviour" and "Item return-rate by size", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Net revenue after returns" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on observational nudges, and who can confirm the cut-off times and splits?
- [ ] How often does "Intended bracketing for try-at-home" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Return rate | The share of purchases that are sent back, high in fashion and a major cost. |
| Size and fit | The relationship between a garment's size label and how it fits a person, a main cause of returns. |
| Add-to-cart / conversion | Adding an item to the basket, and completing a purchase; the later funnel stages. |
| Item-to-item | Recommending items related to the item the shopper is currently looking at. |
| Reverse logistics | Handling returned goods: inspection, resale, refurbishment, liquidation or recycling. |
| Chargeback | A payment reversed after the customer disputes it with their bank. |
| Click-and-collect | Ordering online and picking up in store. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Negative sampling | Choosing non-chosen items as negatives for training; easy negatives inflate offline metrics. |
| Collaborative filtering | Recommending items liked by users similar to you. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
