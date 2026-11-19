# Ad Click-Through Rate Prediction: data and feature specification

> Generated from the blueprint `adtech/ctr-prediction-ads` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ad Click-Through Rate Prediction · **Domain:** adtech · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Ad Click-Through Rate Prediction": Predict click probability for each ad candidate with calibrated outputs at millions of requests per second. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Position bias unmodelled so the model learns the old ranking.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Ad-user embedding interaction | dot product of ad and user embeddings | Captures personal relevance that ids alone cannot | Embedding versions must match between training and serving |   |   |   |
| Historical CTR with smoothing | Bayesian-smoothed CTR by ad and placement | A strong prior for ads with some history | Count only impressions before the scored one |   |   |   |
| Context features | placement, device, hour | Placement and time change click propensity a lot | All known at request time |   |   |   |
| Position at display | slot number where the ad was shown, used in training and set to the top slot at serving | Separates how good the ad is from how visible it was | Forgetting to neutralise it at serving time double-counts the position |   |   |   |
| Ad age and impression count | hours since first impression and log of impressions so far | Tells the model how far to trust the ad's own history | Computed from impressions strictly before the scored one |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Features | Feature crosses learned by DCN or DeepFM with hashed embeddings | Handcrafted crosses only | Manual crosses cannot cover billions of ID pairs |
| Freshness | Hourly incremental updates | Daily retrain only | New ads cold-start badly under daily retraining |
| Position | Position-aware training and a randomised exploration slice | Learning click rates from logs ranked by the old model | The model learns the old ranking and punishes ads that were never shown on top |
| Calibration | Calibrated probabilities per placement because the auction multiplies them by bids | Optimising AUC only | A well-ranked but miscalibrated score misprices every auction |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Impression ID | random |
| Advertiser name text | high cardinality duplicate of advertiser ID |
| Raw user agent string | thousands of rare variants that hash into noise, device class already carries the signal |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Ad-user embedding interaction inputs | Ad platform engineering | Campaign, budget and pacing ledger | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: embedding versions must match between training and serving. |
| Historical CTR with smoothing inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: count only impressions before the scored one. |
| Context features inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: all known at request time. |
| Position at display inputs | Ad platform engineering | Exchange and partner registry | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: forgetting to neutralise it at serving time double-counts the position. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: ctr_prediction_ads_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign, budget and pacing ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: ad_user_embedding_interaction, type: double, nullable: false }
    - { name: historical_ctr_with_smoothing, type: double, nullable: false }
    - { name: context_features, type: double, nullable: false }
sla:
  freshness_p95: 5 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Ad-user embedding interaction and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Historical CTR with smoothing against Campaign, budget and pacing ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 5 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Ad-user embedding interaction, traces back to Campaign, budget and pacing ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Kaggle competition rules; free Kaggle login | About 45 million display-ad impressions over 7 days with 13 numeric and 26 hashed categorical features and a click label, the standard sparse CTR benchmark | Feature names are anonymised and there is no position, timestamp or user id, so you cannot do point-in-time history or position-aware training |
| Avazu Click-Through Rate Prediction | https://www.kaggle.com/c/avazu-ctr-prediction | Kaggle competition rules; free Kaggle login | About 40 million mobile ad impressions over 10 days with hourly timestamps, site and app ids and device fields; allows a proper chronological split | No display position or dwell time, and ids are hashed, so history features are possible but position bias is not observable |
| Criteo AI Lab datasets (1 TB click logs) | https://ailab.criteo.com/ressources/ | Research-use terms on the Criteo AI Lab page; read them before any commercial use | The large-scale version of the Criteo click logs for testing how your hashing, embeddings and training loop scale | Terabyte scale needs a cluster or heavy subsampling; if you downsample negatives you must correct the predicted probabilities or calibration is lost |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE ctr_prediction_ads_impressions (
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

CREATE TABLE ctr_prediction_ads_feedback (
  impression_id  UUID        NOT NULL REFERENCES ctr_prediction_ads_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE ctr_prediction_ads_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| How an ad auction works | A publisher's page makes an ad request to a supply-side platform and exchange. Demand-side platforms bid on behalf of advertisers, often through the OpenRTB protocol. In a first-price auction the winner pays their bid; in a second-price auction they pay just above the next bid. A floor price sets the minimum. | Your model is one stage inside a hard time limit that the bid request announces, so latency and failure behaviour are part of the design. |
| Pricing models and expected value | Advertisers pay per thousand impressions (CPM), per click (CPC) or per action (CPA). To compare bids on a common scale the system converts everything to expected revenue per thousand impressions (eCPM): for a click-priced bid it is bid times predicted click probability times 1000. | The predicted probability is multiplied by money, so calibration matters as much as ranking. A score that ranks well but is 30% too high overcharges and over-delivers. |
| Position, placement and context | The same ad gets very different click rates depending on where it appears (top of the feed versus a sidebar), on the device and on the time of day. Users also look at higher positions more, so observed click rates mix the quality of an ad with how visible it was. | Logs ranked by an old model teach a new model the old ranking unless position is handled explicitly. |
| Click quality and invalid traffic | Not every click is a real, interested human. Bots, click farms, accidental taps and misleading creatives produce invalid traffic that inflates click rates and wastes advertiser budget, and industry bodies set standards for filtering it. Very short dwell time after a click is a common signal. | Training on junk clicks teaches the model to reward what causes mistakes, and advertisers punish platforms that bill for them. |
| Feedback loops and exploration | You only observe clicks for ads that were shown, and the ranker decides what is shown. A new ad that is never shown never gets a click rate. Systems therefore keep a small exploration budget and a randomised slice that provides unbiased data. | Without exploration, new creatives are starved and offline evaluation rewards the incumbent ranker. |
| Privacy and signal loss | Consent rules (GDPR, CCPA), platform changes such as app tracking limits and the phase-out of third-party cookies remove cross-site identifiers. Models rely more on context, first-party signals and aggregated data. | Features you can use today may be unavailable next year; design for graceful loss of signals. |

**Ask the experts**

- [ ] Is our auction first-price or second-price, and exactly where in the bid does the predicted click probability enter?
- [ ] What does a valid, billable click mean here, and which invalid-traffic filters run before clicks reach the training logs?
- [ ] Do the logs record the display position, and do we have randomised-position traffic we can use for evaluation?
- [ ] What is the time budget for the model inside the bid request, and what happens when it is exceeded?
- [ ] Which identifiers and consent signals will we still have next year, and which features depend on ones that are going away?

**Glossary**

| Term | Definition |
|---|---|
| Impression | One instance of an ad being shown to a user; the denominator of click-through rate. |
| CTR | Click-through rate: clicks divided by impressions, typically a few percent or much less. |
| CPM / CPC / CPA | Pricing per thousand impressions, per click or per action such as a purchase or install. |
| eCPM | Effective cost per mille: expected revenue per thousand impressions, used to rank bids of different pricing types. |
| RTB | Real-time bidding: ads sold one impression at a time in an auction that runs while the page loads. |
| SSP | Supply-side platform, the system publishers use to sell their ad space. |
| DSP | Demand-side platform, the system advertisers use to buy impressions and where a CTR model usually lives. |
| Ad exchange | A marketplace that connects sellers and buyers and runs the auction. |
| OpenRTB | A widely used protocol for bid requests and responses, which includes a maximum response time. |
| First-price / second-price auction | Auction rules in which the winner pays their own bid or just above the runner-up's bid. |
| Floor price | The lowest price a publisher will accept for an impression. |
| Pacing | Spreading an advertiser's budget over the day so it is neither spent in minutes nor left unspent. |
| Creative | The ad itself: image, video or text, in a given size and format. |
| Placement | The slot where an ad appears, such as feed, sidebar or banner; position is the rank within it. |
| Viewability | Whether an ad was actually on screen long enough to be seen, a quality measure advertisers care about. |
| Invalid traffic (IVT) | Clicks and impressions from bots or accidental taps that should not be billed. |
| Attribution | Assigning credit for a conversion, such as a purchase, to the ads that preceded it. |
| Log loss | The negative log-likelihood of the observed clicks under the predicted probabilities, the standard training loss. |
| Normalised cross-entropy (NE) | Log loss divided by the log loss of always predicting the average click rate; below 1 means better than the base rate. |
| Calibration | Predicted probabilities matching observed frequencies, so that ads scored at 3% really are clicked about 3% of the time. |
| Feature hashing | Mapping categorical values to a fixed-size vector with a hash function, so memory stays flat however many ids exist. |
| Cold start | A new ad, user or placement with no history, whose click rate must be guessed from priors and similar items. |
