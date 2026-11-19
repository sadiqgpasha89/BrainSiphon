# Dynamic Product Ads & Feed Recommendations: data and feature specification

> Generated from the blueprint `adtech/dynamic-product-ads-feed-recs` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dynamic Product Ads & Feed Recommendations · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Dynamic Product Ads & Feed Recommendations": Select and rank products in dynamic ads from the advertiser catalogue per user to maximise conversions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on retargeted users biased toward high intent.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Recent item views | last viewed items | Intent | Window |   |   |   |
| Product popularity within category | trending score | Prior | Time |   |   |   |
| Stock and price status | feed freshness flags | Validity | Real-time |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Intent | Recent product views and cart events | Long-term profile only | Shopping intent is recent |
| Availability | Real-time stock and price sync | Static feeds | Advertising an out-of-stock product wastes impressions |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Product description length | none |
| Image size | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Recent item views inputs | Ad platform engineering | Campaign and budget ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: window. |
| Product popularity within category inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: time. |
| Stock and price status inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: real-time. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: dynamic_product_ads_feed_recs_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: recent_item_views, type: double, nullable: false }
    - { name: product_popularity_within_category, type: double, nullable: false }
    - { name: stock_and_price_status, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Recent item views and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Product popularity within category against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Recent item views, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RecSys Challenge 2015 (YooChoose clicks and buys) | https://www.kaggle.com/datasets/chadgostopp/recsys-challenge-2015 | See the dataset page; free Kaggle login | About 33 million click events in sessions with purchase outcomes | Old (2014) and coarse categories; keep a strict time split. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Amazon-M2 multilingual shopping sessions | https://arxiv.org/abs/2307.09688 | See the paper for the licence | Anonymised multi-locale shopping sessions with product attributes for next-item prediction | Several locales with different catalogues; evaluate each separately. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE dynamic_product_ads_feed_recs_impressions (
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

CREATE TABLE dynamic_product_ads_feed_recs_feedback (
  impression_id  UUID        NOT NULL REFERENCES dynamic_product_ads_feed_recs_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE dynamic_product_ads_feed_recs_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Dynamic Product Ads & Feed Recommendations": Select and rank products in dynamic ads from the advertiser catalogue per user to maximise conversions. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Privacy and signal loss | Consent rules (GDPR, CCPA), platform changes such as app tracking limits and the phase-out of third-party cookies remove cross-site identifiers. Models rely more on context, first-party signals and aggregated data. | Features you can use today may be unavailable next year; design for graceful loss of signals. |
| How an ad auction works | A publisher's page makes an ad request to a supply-side platform and exchange. Demand-side platforms bid on behalf of advertisers, often through the OpenRTB protocol. In a first-price auction the winner pays their bid; in a second-price auction they pay just above the next bid. A floor price sets the minimum. | Your model is one stage inside a hard time limit that the bid request announces, so latency and failure behaviour are part of the design. |
| Pricing models and expected value | Advertisers pay per thousand impressions (CPM), per click (CPC) or per action (CPA). To compare bids on a common scale the system converts everything to expected revenue per thousand impressions (eCPM): for a click-priced bid it is bid times predicted click probability times 1000. | The predicted probability is multiplied by money, so calibration matters as much as ranking. A score that ranks well but is 30% too high overcharges and over-delivers. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Recent item views | Last viewed items. Intent. | Leakage risk to design against: Window. |
| A signal-versus-noise trap in this use case: Intent | The true signal is recent product views and cart events; the common noise is long-term profile only. | Shopping intent is recent. |

**Ask the experts**

- [ ] What exactly does "Catalogue freshness and stock" mean in practice for dynamic product ads & feed recommendations: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Recent item views" and "Product popularity within category", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "ROAS" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on retargeted users biased toward high intent, and who can confirm the cut-off times and splits?
- [ ] How often does "Catalogue feed delays" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| First-price / second-price auction | Auction rules in which the winner pays their own bid or just above the runner-up's bid. |
| Floor price | The lowest price a publisher will accept for an impression. |
| Calibration | Predicted probabilities matching observed frequencies, so that ads scored at 3% really are clicked about 3% of the time. |
| Feature hashing | Mapping categorical values to a fixed-size vector with a hash function, so memory stays flat however many ids exist. |
| Impression | One instance of an ad being shown to a user; the denominator of click-through rate. |
| CTR | Click-through rate: clicks divided by impressions, typically a few percent or much less. |
| CPM / CPC / CPA | Pricing per thousand impressions, per click or per action such as a purchase or install. |
| eCPM | Effective cost per mille: expected revenue per thousand impressions, used to rank bids of different pricing types. |
| RTB | Real-time bidding: ads sold one impression at a time in an auction that runs while the page loads. |
| SSP | Supply-side platform, the system publishers use to sell their ad space. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
| Popularity bias | The tendency to recommend already-popular items. |
| Two-tower model | A retrieval model with separate networks for user and item whose embeddings are compared by dot product. |
| Hit rate@K | The share of cases in which the true item appears in the top K. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
