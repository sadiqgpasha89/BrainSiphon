# Sponsored Products Ads Ranking: data and feature specification

> Generated from the blueprint `retail/sponsored-products-ads-ranking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Sponsored Products Ads Ranking · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Sponsored Products Ads Ranking": Rank sponsored listings in marketplace search by expected value to buyer, seller and platform in a second-price style auction. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Click logs shaped by the incumbent auction.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Query-ad relevance | cross-encoder relevance score | Eligibility | Same model as organic |   |   |   |
| Historical ad CTR with shrinkage | Bayesian smoothed CTR | Prior | Window before auction |   |   |   |
| Budget pacing multiplier | fraction of budget remaining vs time | Fairness over the day | Real-time state |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Calibration | Well-calibrated probabilities used in the auction | Ranking-only AUC | Billing needs calibrated probabilities |
| Relevance | Relevance gate before auction | Highest bidder wins | Irrelevant ads damage organic trust |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Advertiser name | favouritism risk |
| Bid amount in training | leaks the auction mechanism |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Query-ad relevance inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: same model as organic. |
| Historical ad CTR with shrinkage inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: window before auction. |
| Budget pacing multiplier inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: real-time state. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: sponsored_products_ads_ranking_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: query_ad_relevance, type: double, nullable: false }
    - { name: historical_ad_ctr_with_shrinkage, type: double, nullable: false }
    - { name: budget_pacing_multiplier, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Query-ad relevance and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Historical ad CTR with shrinkage against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Query-ad relevance, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| TalkingData AdTracking Fraud Detection | https://www.kaggle.com/c/talkingdata-adtracking-fraud-detection | Competition rules; free Kaggle login | 200 million mobile ad clicks with an app-download label to detect click fraud | Anonymised and from one platform. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| KDD Cup 2012 Track 2: ad click prediction | https://www.kaggle.com/c/kddcup2012-track2 | Competition rules; free Kaggle login | Search-ad impressions with query, ad, user and position fields | Old and anonymised, but it records the display position. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE sponsored_products_ads_ranking_impressions (
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

CREATE TABLE sponsored_products_ads_ranking_feedback (
  impression_id  UUID        NOT NULL REFERENCES sponsored_products_ads_ranking_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE sponsored_products_ads_ranking_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Sponsored Products Ads Ranking": Rank sponsored listings in marketplace search by expected value to buyer, seller and platform in a second-price style auction. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Search, browse and ranking in a marketplace | Shoppers arrive through search queries, category pages and recommendation strips. Each is a ranking problem with different signals: a query has explicit intent, a category page has none, and a marketplace must also be fair to sellers and obey sponsored-placement rules. Position bias means top slots get clicks regardless of quality. | Offline relevance judgments, click logs and revenue metrics disagree; ranking systems are judged by interleaving and online tests, with exposure and fairness constraints. |
| Trust and safety in marketplaces | Marketplaces face fake reviews, counterfeit goods, seller fraud, return abuse and checkout payment fraud. Attackers adapt, ground truth is partial, and enforcement affects honest sellers and buyers. | Precision matters as much as recall because every false action penalises a real seller or shopper. |
| Bots, crawlers and non-human traffic | Price scrapers, search crawlers and fraud bots click through catalogues quickly and in patterns, sometimes in id order. They often make up a large share of sessions and have no purchase intent. | Counting their clicks creates strong but spurious transitions that outrank real shopper behaviour. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Query-ad relevance | Cross-encoder relevance score. Eligibility. | Leakage risk to design against: Same model as organic. |
| A signal-versus-noise trap in this use case: Calibration | The true signal is well-calibrated probabilities used in the auction; the common noise is ranking-only AUC. | Billing needs calibrated probabilities. |

**Ask the experts**

- [ ] What exactly does "Calibrated pCTR/pCVR for billing" mean in practice for sponsored products ads ranking: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Query-ad relevance" and "Historical ad CTR with shrinkage", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Ad revenue per search" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: click logs shaped by the incumbent auction, and who can confirm the cut-off times and splits?
- [ ] How often does "New advertiser with no history" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Position bias | Items shown higher get more clicks regardless of quality, so click logs must be corrected. |
| Buy box | The featured offer on a product page that most purchases go through, which sellers compete for. |
| Learning to rank | Training models to order items by relevance, using pointwise, pairwise or listwise losses. |
| Impression / click | An impression is a recommendation being shown; a click is the shopper choosing it. |
| Conversion rate | The share of visits or sessions that end in a purchase. |
| Query understanding | Interpreting a search query: spelling correction, intent, entities and attributes. |
| Marketplace seller | A third-party business selling on a platform, whose fairness and quality the platform must manage. |
| NDCG | A ranking metric that discounts relevant items by how far down the list they appear. |
| Embedding / ANN | A learned vector for an item or session, and approximate nearest-neighbour search to find similar vectors quickly. |
| AOV | Average order value: revenue divided by the number of orders. |
| Two-tower model | A retrieval model with separate networks for user and item whose embeddings are compared by dot product. |
| ANN search | Approximate nearest-neighbour search that finds similar vectors quickly. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| p99 latency | The time within which 99% of requests complete. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
