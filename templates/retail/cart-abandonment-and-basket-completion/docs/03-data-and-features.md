# Cart Abandonment & Basket Completion: data and feature specification

> Generated from the blueprint `retail/cart-abandonment-and-basket-completion` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cart Abandonment & Basket Completion · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Cart Abandonment & Basket Completion": Predict abandonment in-session and trigger the least intrusive intervention (shipping clarity, saved cart, add-ons) that lifts completed checkouts. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Non-random past interventions.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Shipping-cost shock | shipping fee as a share of cart value at reveal | Top abandonment reason | Compute at the reveal event |   |   |   |
| Payment error count | declines and validation errors in-session | Friction | Count before intervention |   |   |   |
| Return-visit pattern | number of cart revisits in 48 hours | Intent | Session stitching consent |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Intervention | Uplift on checkout completion per intervention type | Abandonment propensity | Discounting buyers who would have purchased burns margin |
| Friction | Shipping cost reveal, payment errors and form friction | Page-view counts | The step that failed is the lever |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Number of pages viewed | confounded with browsing |
| Referrer domain | channel artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Shipping-cost shock inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: compute at the reveal event. |
| Payment error count inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: count before intervention. |
| Return-visit pattern inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: session stitching consent. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: cart_abandonment_and_basket_completion_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: shipping_cost_shock, type: double, nullable: false }
    - { name: payment_error_count, type: double, nullable: false }
    - { name: return_visit_pattern, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Shipping-cost shock and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Payment error count against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Shipping-cost shock, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Instacart Market Basket Analysis | https://www.kaggle.com/datasets/psparks/instacart-market-basket-analysis | Competition rules; free Kaggle login | 3 million grocery orders from 200K users with reorder labels | No timestamps beyond day-of-week and hour; US grocery only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Online Retail | https://archive.ics.uci.edu/dataset/352/online+retail | CC BY 4.0 (see the UCI page) | About 540K invoices from a UK gift retailer over a year | Single retailer, no sessions; good for RFM, churn and basket work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Bandit Dataset | https://research.zozo.com/data.html | CC BY 4.0 (see the page) | Logged bandit feedback from a fashion e-commerce site with propensities, for off-policy evaluation | One platform and a short period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE cart_abandonment_and_basket_impressions (
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

CREATE TABLE cart_abandonment_and_basket_feedback (
  impression_id  UUID        NOT NULL REFERENCES cart_abandonment_and_basket_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE cart_abandonment_and_basket_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Cart Abandonment & Basket Completion": Predict abandonment in-session and trigger the least intrusive intervention (shipping clarity, saved cart, add-ons) that lifts completed checkouts. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Fulfilment, delivery promises and returns | Orders are routed to warehouses or stores, shipped and sometimes returned. A delivery promise shown at checkout must be one the network can keep; reverse logistics decides whether to resell, refurbish or liquidate a return. | Promising too early causes late deliveries and complaints; promising too late loses conversion, so errors are asymmetric. |
| Intent and the funnel | Shoppers move from browsing to comparing to buying: product views, add-to-cart, checkout and purchase. What is useful changes along the way: alternatives when someone is still choosing, accessories and complements once something is in the cart. | A good next item for a browsing shopper is a bad one for someone about to pay. Decide which stage each placement serves. |
| Offline metrics versus business outcomes | Offline ranking metrics (hit rate, MRR, NDCG) measure whether the held-out next item was ranked high. The business cares about click-through on the strip, add-to-cart and revenue per visit, plus catalogue coverage so that long-tail sellers get exposure. Recommendations also obey merchandising rules: stock, margin, brand and sponsored items. | A model can improve MRR while concentrating on a few popular items. Track coverage and run online tests. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Implicit feedback, exposure and bias | Clicks and purchases are implicit feedback: only shown items can be clicked, higher positions get more attention and popular items are shown more. Logs therefore reflect the old system as much as user taste; corrections include position features, propensity weighting, exploration and randomised data. | Training and evaluating on logs of the incumbent ranker rewards imitating it. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Shipping-cost shock | Shipping fee as a share of cart value at reveal. Top abandonment reason. | Leakage risk to design against: Compute at the reveal event. |
| A signal-versus-noise trap in this use case: Intervention | The true signal is uplift on checkout completion per intervention type; the common noise is abandonment propensity. | Discounting buyers who would have purchased burns margin. |

**Ask the experts**

- [ ] What exactly does "Interventions must not discount unnecessarily" mean in practice for cart abandonment & basket completion: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Shipping-cost shock" and "Payment error count", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Checkout completion rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: non-random past interventions, and who can confirm the cut-off times and splits?
- [ ] How often does "Payment provider outage looks like abandonment" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Add-to-cart / conversion | Adding an item to the basket, and completing a purchase; the later funnel stages. |
| AOV | Average order value: revenue divided by the number of orders. |
| Basket | The set of items in a customer's cart or order; basket analysis finds items bought together. |
| Complementary item | A product bought together with another, such as a case with a phone. |
| Session | A visit: an ordered sequence of one visitor's actions, ended by inactivity or leaving. |
| Catalogue | The set of items the shop sells, with attributes, prices and stock. |
| Impression / click | An impression is a recommendation being shown; a click is the shopper choosing it. |
| Co-visitation | Counting how often two items are viewed in the same session, the basis of item-to-item recommenders. |
| Item-to-item | Recommending items related to the item the shopper is currently looking at. |
| Substitute / complement | An alternative to the current item, versus an item bought together with it. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Inverse propensity weighting | Weighting logged examples by the inverse of how likely they were to be shown, to correct exposure bias. |
| Sequence model (SASRec) | A transformer that predicts the next item from a user's recent history. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
