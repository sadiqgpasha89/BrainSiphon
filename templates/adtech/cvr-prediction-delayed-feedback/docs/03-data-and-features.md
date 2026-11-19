# Conversion Rate Prediction with Delayed Feedback: data and feature specification

> Generated from the blueprint `adtech/cvr-prediction-delayed-feedback` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Conversion Rate Prediction with Delayed Feedback · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Conversion Rate Prediction with Delayed Feedback": Predict conversion probability when conversions arrive minutes to weeks after the click, without biasing toward fast converters. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on immature labels.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Elapsed time since click | seconds since click at label time | Delay modelling | Server clock |   |   |   |
| Product category delay profile | median delay by vertical | Prior for delay | Matured cohorts |   |   |   |
| Click quality features | dwell time on landing page | Intent | Consent |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Delay | Delay model jointly learned with conversion probability | Labelling unconverted recent clicks as negatives | Recent negatives are mostly not-yet-converted |
| Windows | Fixed observation window for evaluation labels | Mixed windows across cohorts | Mixed windows make metrics incomparable |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Click ID | random |
| Campaign creation date | cohort artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Elapsed time since click inputs | Ad platform engineering | Campaign and budget ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: server clock. |
| Product category delay profile inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: matured cohorts. |
| Click quality features inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: consent. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: cvr_prediction_delayed_feedback_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: elapsed_time_since_click, type: double, nullable: false }
    - { name: product_category_delay_profile, type: double, nullable: false }
    - { name: click_quality_features, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Elapsed time since click and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Product category delay profile against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Elapsed time since click, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Avazu Click-Through Rate Prediction | https://www.kaggle.com/c/avazu-ctr-prediction | Competition rules; free Kaggle login | About 40 million mobile ad impressions over 10 days with hourly timestamps | No position or dwell time. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo AI Lab datasets | https://ailab.criteo.com/ressources/ | Research-use terms on the Criteo AI Lab page | Large click logs, uplift, attribution and counterfactual datasets from Criteo | Terabyte scale for some sets; research-use terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE cvr_prediction_delayed_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  elapsed_time_since_click           DOUBLE PRECISION,
  product_category_delay_profile     DOUBLE PRECISION,
  click_quality_features             DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE cvr_prediction_delayed_decisions (
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
CREATE TABLE cvr_prediction_delayed_labels (
  decision_id    UUID        NOT NULL REFERENCES cvr_prediction_delayed_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Conversion Rate Prediction with Delayed Feedback": Predict conversion probability when conversions arrive minutes to weeks after the click, without biasing toward fast converters. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Feedback loops and exploration | You only observe clicks for ads that were shown, and the ranker decides what is shown. A new ad that is never shown never gets a click rate. Systems therefore keep a small exploration budget and a randomised slice that provides unbiased data. | Without exploration, new creatives are starved and offline evaluation rewards the incumbent ranker. |
| Measurement, attribution and incrementality | Which ads caused a conversion? Last-click credits whoever came last, multi-touch attribution shares credit along a path, media mix models use aggregate spend and outcomes, and experiments (geo tests, holdouts) measure true incremental lift. Privacy limits individual-level tracking. | Correlation between ad exposure and purchase is not causation; targeting people who would have bought anyway inflates apparent performance. |
| Click quality and invalid traffic | Not every click is a real, interested human. Bots, click farms, accidental taps and misleading creatives produce invalid traffic that inflates click rates and wastes advertiser budget, and industry bodies set standards for filtering it. Very short dwell time after a click is a common signal. | Training on junk clicks teaches the model to reward what causes mistakes, and advertisers punish platforms that bill for them. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Elapsed time since click | Seconds since click at label time. Delay modelling. | Leakage risk to design against: Server clock. |
| A signal-versus-noise trap in this use case: Delay | The true signal is delay model jointly learned with conversion probability; the common noise is labelling unconverted recent clicks as negatives. | Recent negatives are mostly not-yet-converted. |

**Ask the experts**

- [ ] What exactly does "Fresh model within hours" mean in practice for conversion rate prediction with delayed feedback: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Elapsed time since click" and "Product category delay profile", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Cost per acquisition after full attribution" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating on immature labels, and who can confirm the cut-off times and splits?
- [ ] How often does "Attribution partner changes lookback window" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Delayed conversion | A purchase or install that happens hours or days after the click, so recent labels are incomplete. |
| First-price / second-price auction | Auction rules in which the winner pays their own bid or just above the runner-up's bid. |
| Attribution | Assigning credit for a conversion, such as a purchase, to the ads that preceded it. |
| Log loss | The negative log-likelihood of the observed clicks under the predicted probabilities, the standard training loss. |
| Calibration | Predicted probabilities matching observed frequencies, so that ads scored at 3% really are clicked about 3% of the time. |
| Feature hashing | Mapping categorical values to a fixed-size vector with a hash function, so memory stays flat however many ids exist. |
| Retargeting | Showing ads to people who have already visited a site or product. |
| Multi-touch attribution (MTA) | Assigning conversion credit across all the ad exposures along a customer's path. |
| SKAN / ATT | Apple's privacy frameworks for app tracking and install attribution that limit user-level data. |
| Impression | One instance of an ad being shown to a user; the denominator of click-through rate. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Platt scaling | Calibrating scores with a logistic curve. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Lag feature | A past value of the series used as a predictor. |
| State-space / Kalman filter | A model that tracks a hidden state through noisy observations and updates it over time. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
