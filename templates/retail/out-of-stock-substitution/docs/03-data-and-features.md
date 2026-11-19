# Out-of-Stock Substitution Recommendations: data and feature specification

> Generated from the blueprint `retail/out-of-stock-substitution` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Out-of-Stock Substitution Recommendations · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Out-of-Stock Substitution Recommendations": Offer the best in-stock substitute when a grocery or retail item is unavailable, preserving the order and customer trust. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Acceptance logged only for offered items.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Historic substitution acceptance | acceptance rate for the item pair | Direct signal | Matured pairs |   |   |   |
| Price delta and unit size delta | relative price and size difference | Tolerance | Normalised units |   |   |   |
| User substitution tolerance | personal acceptance history | Personalisation | Excludes the current order |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Acceptance | Learn from accepted and rejected substitutions | Content similarity only | Similar items are often rejected because of brand loyalty |
| Constraints | Hard rules for allergens and diet | Soft similarity | A wrong allergen substitution is a safety incident |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Item popularity | picks popular not suitable |
| Picker ID | personal habit |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Historic substitution acceptance inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: matured pairs. |
| Price delta and unit size delta inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: normalised units. |
| User substitution tolerance inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: excludes the current order. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: out_of_stock_substitution_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: historic_substitution_acceptance, type: double, nullable: false }
    - { name: price_delta_and_unit_size_delta, type: double, nullable: false }
    - { name: user_substitution_tolerance, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Historic substitution acceptance and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Price delta and unit size delta against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Historic substitution acceptance, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Instacart Market Basket Analysis | https://www.kaggle.com/datasets/psparks/instacart-market-basket-analysis | Competition rules; free Kaggle login | 3 million grocery orders from 200K users with reorder labels | No timestamps beyond day-of-week and hour; US grocery only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Amazon Reviews 2023 | https://amazon-reviews-2023.github.io/ | Research terms on the project page | Hundreds of millions of product reviews with item metadata across categories | Very large; consumer-review language and bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Retailrocket recommender system dataset | https://www.kaggle.com/datasets/retailrocket/ecommerce-dataset | CC BY-NC-SA 4.0 (see the dataset page) | About 2.7 million view, add-to-cart and purchase events with item properties | Anonymised ids and no dwell time. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE out_of_stock_substitution_impressions (
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

CREATE TABLE out_of_stock_substitution_feedback (
  impression_id  UUID        NOT NULL REFERENCES out_of_stock_substitution_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE out_of_stock_substitution_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Out-of-Stock Substitution Recommendations": Offer the best in-stock substitute when a grocery or retail item is unavailable, preserving the order and customer trust. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Inventory, replenishment and assortment | Stores and warehouses hold stock to meet uncertain demand. Replenishment decides when and how much to order, assortment planning decides which items to carry given limited shelf space, and substitution handles out-of-stock moments. Overstock ties up cash and expires; understock loses sales and customers. | Every forecast or recommendation has to respect stock: a perfect recommendation for an unavailable item is a failed one. |
| Offline metrics versus business outcomes | Offline ranking metrics (hit rate, MRR, NDCG) measure whether the held-out next item was ranked high. The business cares about click-through on the strip, add-to-cart and revenue per visit, plus catalogue coverage so that long-tail sellers get exposure. Recommendations also obey merchandising rules: stock, margin, brand and sponsored items. | A model can improve MRR while concentrating on a few popular items. Track coverage and run online tests. |
| Customers, lifetime value and churn | Retailers segment customers by recency, frequency and monetary value, estimate lifetime value, and try to predict who will lapse or repurchase. Marketing spend should go where it changes behaviour (uplift), not where customers would buy anyway. | Offers cost margin; a model that targets likely buyers rather than persuadable ones wastes discounts. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Historic substitution acceptance | Acceptance rate for the item pair. Direct signal. | Leakage risk to design against: Matured pairs. |
| A signal-versus-noise trap in this use case: Acceptance | The true signal is learn from accepted and rejected substitutions; the common noise is content similarity only. | Similar items are often rejected because of brand loyalty. |

**Ask the experts**

- [ ] What exactly does "Dietary and allergy constraints" mean in practice for out-of-stock substitution recommendations: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Historic substitution acceptance" and "Price delta and unit size delta", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Substitution acceptance rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: acceptance logged only for offered items, and who can confirm the cut-off times and splits?
- [ ] How often does "Inventory data inaccurate" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Substitution | Offering a different item when the ordered one is out of stock. |
| Item-to-item | Recommending items related to the item the shopper is currently looking at. |
| Substitute / complement | An alternative to the current item, versus an item bought together with it. |
| Popularity bias | The tendency of recommenders to push already-popular items, starving the long tail. |
| Learning to rank | Training models to order items by relevance, using pointwise, pairwise or listwise losses. |
| Position bias | Items shown higher get more clicks regardless of quality, so click logs must be corrected. |
| Stock-out | A period when an item is unavailable, so demand is lost or substituted. |
| Complementary item | A product bought together with another, such as a case with a phone. |
| Loyalty programme | A scheme that rewards repeat purchases with points or offers. |
| Session | A visit: an ordered sequence of one visitor's actions, ended by inactivity or leaving. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
| Collaborative filtering | Recommending items liked by users similar to you. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
