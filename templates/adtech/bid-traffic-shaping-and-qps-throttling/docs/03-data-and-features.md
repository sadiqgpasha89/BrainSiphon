# Bid Traffic Shaping & QPS Throttling: data and feature specification

> Generated from the blueprint `adtech/bid-traffic-shaping-and-qps-throttling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Bid Traffic Shaping & QPS Throttling · **Domain:** adtech · **Latency tier:** sub-10ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Bid Traffic Shaping & QPS Throttling": Decide which bid requests to process or drop at ingestion to cut infrastructure cost while retaining most of the value. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating with historical traffic while throttling changes the data.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Segment win-rate and value | historical value per request type | Priority | Window |   |   |   |
| Per-exchange cost | processing cost per request | Cost | Cost model |   |   |   |
| Current load | cluster utilisation | Throttle | Real-time |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Value | Drop requests with the lowest expected value per CPU cost | Random sampling | Random sampling discards high-value traffic at the same rate |
| Feedback | Learn value from won outcomes with exploration | Static allow-lists | Allow-lists go stale |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Request ID | none |
| User-agent | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Segment win-rate and value inputs | Ad platform engineering | Campaign and budget ledger | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: window. |
| Per-exchange cost inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: cost model. |
| Current load inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 5 seconds freshness at p95 | Point-in-time rule: real-time. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: bid_traffic_shaping_and_qps_throttling_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: segment_win_rate_and_value, type: double, nullable: false }
    - { name: per_exchange_cost, type: double, nullable: false }
    - { name: current_load, type: double, nullable: false }
sla:
  freshness_p95: 5 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Segment win-rate and value and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Per-exchange cost against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 5 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Segment win-rate and value, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Azure Public Dataset | https://github.com/Azure/AzurePublicDataset | CC BY 4.0 (see the repository) | Anonymised VM, workload and resource utilisation traces from Azure | One cloud and period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ETT electricity transformer dataset | https://github.com/zhouhaoyi/ETDataset | CC BY-ND 4.0 (see the repository) | Multivariate transformer temperature and load data used for long-horizon forecasting benchmarks | One asset type. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE bid_traffic_shaping_and_qps_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  segment_win_rate_and_value         DOUBLE PRECISION,
  per_exchange_cost                  DOUBLE PRECISION,
  current_load                       DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE bid_traffic_shaping_and_qps_decisions (
  decision_id    UUID PRIMARY KEY,
  entity_id      TEXT        NOT NULL,
  decided_at     TIMESTAMPTZ NOT NULL,
  model_version  TEXT        NOT NULL,
  score          REAL,
  decision       TEXT        NOT NULL,
  reason_codes   JSONB,
  latency_ms     REAL,
  degraded       BOOLEAN     NOT NULL DEFAULT FALSE
) PARTITION BY RANGE (decided_at);

-- labels arrive late and may be revised; keep source + delay for survival-aware training
CREATE TABLE bid_traffic_shaping_and_qps_labels (
  decision_id    UUID        NOT NULL REFERENCES bid_traffic_shaping_and_qps_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Bid Traffic Shaping & QPS Throttling": Decide which bid requests to process or drop at ingestion to cut infrastructure cost while retaining most of the value. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Click quality and invalid traffic | Not every click is a real, interested human. Bots, click farms, accidental taps and misleading creatives produce invalid traffic that inflates click rates and wastes advertiser budget, and industry bodies set standards for filtering it. Very short dwell time after a click is a common signal. | Training on junk clicks teaches the model to reward what causes mistakes, and advertisers punish platforms that bill for them. |
| Feedback loops and exploration | You only observe clicks for ads that were shown, and the ranker decides what is shown. A new ad that is never shown never gets a click rate. Systems therefore keep a small exploration budget and a randomised slice that provides unbiased data. | Without exploration, new creatives are starved and offline evaluation rewards the incumbent ranker. |
| Pricing models and expected value | Advertisers pay per thousand impressions (CPM), per click (CPC) or per action (CPA). To compare bids on a common scale the system converts everything to expected revenue per thousand impressions (eCPM): for a click-priced bid it is bid times predicted click probability times 1000. | The predicted probability is multiplied by money, so calibration matters as much as ranking. A score that ranks well but is 30% too high overcharges and over-delivers. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Segment win-rate and value | Historical value per request type. Priority. | Leakage risk to design against: Window. |
| A signal-versus-noise trap in this use case: Value | The true signal is drop requests with the lowest expected value per CPU cost; the common noise is random sampling. | Random sampling discards high-value traffic at the same rate. |

**Ask the experts**

- [ ] What exactly does "Decision under 0.5 ms" mean in practice for bid traffic shaping & qps throttling: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Segment win-rate and value" and "Per-exchange cost", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Infrastructure cost per won impression" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating with historical traffic while throttling changes the data, and who can confirm the cut-off times and splits?
- [ ] How often does "Exchange traffic surges beyond capacity" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Throttling | Dropping or ignoring a share of bid requests to stay within capacity or budget. |
| Invalid traffic (IVT) | Clicks and impressions from bots or accidental taps that should not be billed. |
| Ad exchange | A marketplace that connects sellers and buyers and runs the auction. |
| First-price / second-price auction | Auction rules in which the winner pays their own bid or just above the runner-up's bid. |
| Impression | One instance of an ad being shown to a user; the denominator of click-through rate. |
| CTR | Click-through rate: clicks divided by impressions, typically a few percent or much less. |
| CPM / CPC / CPA | Pricing per thousand impressions, per click or per action such as a purchase or install. |
| eCPM | Effective cost per mille: expected revenue per thousand impressions, used to rank bids of different pricing types. |
| RTB | Real-time bidding: ads sold one impression at a time in an auction that runs while the page loads. |
| SSP | Supply-side platform, the system publishers use to sell their ad space. |
| Reward shaping | Adding extra reward terms to guide learning, which can cause unintended behaviour. |
| Policy | The rule that maps a situation to an action. |
| Contextual bandit | A decision problem where each round has a context, an action is chosen and only its reward is seen. |
| Regret | The reward lost by not always choosing the best action. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| p99 latency | The time within which 99% of requests complete. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
