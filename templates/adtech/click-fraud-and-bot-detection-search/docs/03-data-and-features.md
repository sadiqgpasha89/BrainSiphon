# Click Fraud Detection for Search Ads: data and feature specification

> Generated from the blueprint `adtech/click-fraud-and-bot-detection-search` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Click Fraud Detection for Search Ads · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Click Fraud Detection for Search Ads": Detect competitor clicking and click farms on paid search to protect advertisers' budgets and keep trust. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Confirmed fraud sample biased to obvious cases.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Post-click dwell and bounce | seconds on landing page | Intent | Consent |   |   |   |
| Advertiser-competitor click pattern | repeated clicks from rivals' networks | Malicious | Known competitors |   |   |   |
| Session-level click sequence | click timing patterns | Automation | Window |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Intent | Post-click behaviour (bounce, dwell, conversion) | Click count per IP | Click farms rotate IPs |
| Value | Weight by cost per click | Equal weighting | Expensive clicks matter most |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Query text | not fraud signal |
| Advertiser industry | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Post-click dwell and bounce inputs | Ad platform engineering | Campaign and budget ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: consent. |
| Advertiser-competitor click pattern inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: known competitors. |
| Session-level click sequence inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: window. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: click_fraud_and_bot_detection_search_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: post_click_dwell_and_bounce, type: double, nullable: false }
    - { name: advertiser_competitor_click_pattern, type: double, nullable: false }
    - { name: session_level_click_sequence, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Post-click dwell and bounce and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Advertiser-competitor click pattern against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Post-click dwell and bounce, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| TalkingData AdTracking Fraud Detection | https://www.kaggle.com/c/talkingdata-adtracking-fraud-detection | Competition rules; free Kaggle login | 200 million mobile ad clicks with an app-download label to detect click fraud | Anonymised and from one platform. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IEEE-CIS Fraud Detection | https://www.kaggle.com/c/ieee-fraud-detection | Competition rules; free Kaggle login | About 590K e-commerce transactions with card, address, email-domain and device fields over six months | Columns are masked and identity is joined by a hashed key; build time-based splits. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE click_fraud_and_bot_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  post_click_dwell_and_bounce        DOUBLE PRECISION,
  advertiser_competitor_click_pattern DOUBLE PRECISION,
  session_level_click_sequence       DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE click_fraud_and_bot_detection_decisions (
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
CREATE TABLE click_fraud_and_bot_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES click_fraud_and_bot_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Click Fraud Detection for Search Ads": Detect competitor clicking and click farms on paid search to protect advertisers' budgets and keep trust. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Fraud, bots and invalid traffic | Click farms, bots and fake installs consume budget and distort models. Detection mixes device and network signals, behavioural patterns and downstream quality signals such as retention or conversion. | Filtering must happen before billing and before model training, or the system learns to pay for fraud. |
| Privacy and signal loss | Consent rules (GDPR, CCPA), platform changes such as app tracking limits and the phase-out of third-party cookies remove cross-site identifiers. Models rely more on context, first-party signals and aggregated data. | Features you can use today may be unavailable next year; design for graceful loss of signals. |
| How an ad auction works | A publisher's page makes an ad request to a supply-side platform and exchange. Demand-side platforms bid on behalf of advertisers, often through the OpenRTB protocol. In a first-price auction the winner pays their bid; in a second-price auction they pay just above the next bid. A floor price sets the minimum. | Your model is one stage inside a hard time limit that the bid request announces, so latency and failure behaviour are part of the design. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Post-click dwell and bounce | Seconds on landing page. Intent. | Leakage risk to design against: Consent. |
| A signal-versus-noise trap in this use case: Intent | The true signal is post-click behaviour (bounce, dwell, conversion); the common noise is click count per IP. | Click farms rotate IPs. |

**Ask the experts**

- [ ] What exactly does "Real-time filtering within billing" mean in practice for click fraud detection for search ads: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Post-click dwell and bounce" and "Advertiser-competitor click pattern", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Filtered spend share" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: confirmed fraud sample biased to obvious cases, and who can confirm the cut-off times and splits?
- [ ] How often does "Mobile carrier NAT aggregates many users" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| First-price / second-price auction | Auction rules in which the winner pays their own bid or just above the runner-up's bid. |
| Feature hashing | Mapping categorical values to a fixed-size vector with a hash function, so memory stays flat however many ids exist. |
| Landing page | The page a user reaches after clicking an ad, whose quality affects conversion and cost. |
| Quality score | A platform's estimate of an ad's relevance and landing-page quality that affects its price and rank. |
| Impression | One instance of an ad being shown to a user; the denominator of click-through rate. |
| CTR | Click-through rate: clicks divided by impressions, typically a few percent or much less. |
| CPM / CPC / CPA | Pricing per thousand impressions, per click or per action such as a purchase or install. |
| eCPM | Effective cost per mille: expected revenue per thousand impressions, used to rank bids of different pricing types. |
| RTB | Real-time bidding: ads sold one impression at a time in an auction that runs while the page loads. |
| SSP | Supply-side platform, the system publishers use to sell their ad space. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| F1 score | The harmonic mean of precision and recall. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Lag feature | A past value of the series used as a predictor. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
