# Query–Ad Relevance Matching: data and feature specification

> Generated from the blueprint `adtech/query-ad-relevance-matching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Query–Ad Relevance Matching · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Query–Ad Relevance Matching": Score semantic relevance between queries and ads to gate eligibility and improve quality scores. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on clicks biased by position.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Dual-encoder similarity | query and ad embedding cosine | Fast match | Ad embedding refresh |   |   |   |
| Cross-encoder score | joint transformer relevance | Precision | Distillation |   |   |   |
| Keyword match type | exact, phrase, broad | Intent | Rules |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Labels | Human relevance judgments plus debiased clicks | Clicks only | Clicks reflect position and creative appeal |
| Serving | Dual-encoder retrieval and cross-encoder rerank of top few | Cross-encoder for all | Cross-encoder cost is prohibitive |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Ad ID | none |
| Bid amount | leaks auction |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Dual-encoder similarity inputs | Ad platform engineering | Campaign and budget ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: ad embedding refresh. |
| Cross-encoder score inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: distillation. |
| Keyword match type inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: rules. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: query_ad_relevance_matching_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: dual_encoder_similarity, type: double, nullable: false }
    - { name: cross_encoder_score, type: double, nullable: false }
    - { name: keyword_match_type, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Dual-encoder similarity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Cross-encoder score against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Dual-encoder similarity, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| KDD Cup 2012 Track 2: ad click prediction | https://www.kaggle.com/c/kddcup2012-track2 | Competition rules; free Kaggle login | Search-ad impressions with query, ad, user and position fields | Old and anonymised, but it records the display position. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MS MARCO | https://microsoft.github.io/msmarco/ | Non-commercial research use (see the page) | Large-scale passage and document ranking data from real search queries | Web search, not enterprise or docs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BEIR benchmark | https://github.com/beir-cellar/beir | Per-dataset licences (see the repository) | A heterogeneous benchmark of 18 retrieval datasets for zero-shot evaluation | Academic tasks; domain match varies. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE query_ad_relevance_matching_impressions (
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

CREATE TABLE query_ad_relevance_matching_feedback (
  impression_id  UUID        NOT NULL REFERENCES query_ad_relevance_matching_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE query_ad_relevance_matching_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Query–Ad Relevance Matching": Score semantic relevance between queries and ads to gate eligibility and improve quality scores. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Click quality and invalid traffic | Not every click is a real, interested human. Bots, click farms, accidental taps and misleading creatives produce invalid traffic that inflates click rates and wastes advertiser budget, and industry bodies set standards for filtering it. Very short dwell time after a click is a common signal. | Training on junk clicks teaches the model to reward what causes mistakes, and advertisers punish platforms that bill for them. |
| Feedback loops and exploration | You only observe clicks for ads that were shown, and the ranker decides what is shown. A new ad that is never shown never gets a click rate. Systems therefore keep a small exploration budget and a randomised slice that provides unbiased data. | Without exploration, new creatives are starved and offline evaluation rewards the incumbent ranker. |
| How an ad auction works | A publisher's page makes an ad request to a supply-side platform and exchange. Demand-side platforms bid on behalf of advertisers, often through the OpenRTB protocol. In a first-price auction the winner pays their bid; in a second-price auction they pay just above the next bid. A floor price sets the minimum. | Your model is one stage inside a hard time limit that the bid request announces, so latency and failure behaviour are part of the design. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Dual-encoder similarity | Query and ad embedding cosine. Fast match. | Leakage risk to design against: Ad embedding refresh. |
| A signal-versus-noise trap in this use case: Labels | The true signal is human relevance judgments plus debiased clicks; the common noise is clicks only. | Clicks reflect position and creative appeal. |

**Ask the experts**

- [ ] What exactly does "10 ms scoring with cached ad embeddings" mean in practice for query–ad relevance matching: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Dual-encoder similarity" and "Cross-encoder score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Ad quality complaints" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on clicks biased by position, and who can confirm the cut-off times and splits?
- [ ] How often does "Brand queries for competitors" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Normalised cross-entropy (NE) | Log loss divided by the log loss of always predicting the average click rate; below 1 means better than the base rate. |
| Impression | One instance of an ad being shown to a user; the denominator of click-through rate. |
| CTR | Click-through rate: clicks divided by impressions, typically a few percent or much less. |
| CPM / CPC / CPA | Pricing per thousand impressions, per click or per action such as a purchase or install. |
| eCPM | Effective cost per mille: expected revenue per thousand impressions, used to rank bids of different pricing types. |
| RTB | Real-time bidding: ads sold one impression at a time in an auction that runs while the page loads. |
| SSP | Supply-side platform, the system publishers use to sell their ad space. |
| DSP | Demand-side platform, the system advertisers use to buy impressions and where a CTR model usually lives. |
| Ad exchange | A marketplace that connects sellers and buyers and runs the auction. |
| OpenRTB | A widely used protocol for bid requests and responses, which includes a maximum response time. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Position bias | Higher slots get more attention regardless of relevance. |
| ANN search | Approximate nearest-neighbour search that finds similar vectors quickly. |
| Two-tower model | A retrieval model with separate networks for user and item whose embeddings are compared by dot product. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
