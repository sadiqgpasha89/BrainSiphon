# Retargeting Window & Churn Optimisation: data and feature specification

> Generated from the blueprint `adtech/retargeting-window-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Retargeting Window & Churn Optimisation · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Retargeting Window & Churn Optimisation": Decide whether, when and how long to retarget each visitor to maximise incremental conversions and avoid chasing converted users. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Observational lift inflated by selection.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Time since last visit | hours since visit | Hazard | Clock |   |   |   |
| Depth of engagement | pages and cart adds | Intent | Window |   |   |   |
| Prior conversion flag | converted already | Suppression | Real-time |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Hazard | Conversion hazard decays with time since visit | Fixed 30-day windows | Most conversions happen in the first days |
| Incrementality | Incremental lift not last-touch | Credit for organic converters | Retargeting often claims credit for organic conversions |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Visitor ID | none |
| Page URL | high-cardinality |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Time since last visit inputs | Ad platform engineering | Campaign and budget ledger | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: clock. |
| Depth of engagement inputs | Measurement science | Billing and invoicing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: window. |
| Prior conversion flag inputs | Privacy engineering | Identity graph and consent store (CMP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: real-time. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: retargeting_window_optimization_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: time_since_last_visit, type: double, nullable: false }
    - { name: depth_of_engagement, type: double, nullable: false }
    - { name: prior_conversion_flag, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Time since last visit and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Depth of engagement against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Time since last visit, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| KKBox Churn Prediction Challenge | https://www.kaggle.com/c/kkbox-churn-prediction-challenge | Competition rules; free Kaggle login | Subscription and listening logs for a music service with a churn label | Music streaming, not B2B SaaS. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Instacart Market Basket Analysis | https://www.kaggle.com/datasets/psparks/instacart-market-basket-analysis | Competition rules; free Kaggle login | 3 million grocery orders from 200K users with reorder labels | No timestamps beyond day-of-week and hour; US grocery only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Online Retail | https://archive.ics.uci.edu/dataset/352/online+retail | CC BY 4.0 (see the UCI page) | About 540K invoices from a UK gift retailer over a year | Single retailer, no sessions; good for RFM, churn and basket work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE retargeting_window_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  time_since_last_visit              DOUBLE PRECISION,
  depth_of_engagement                DOUBLE PRECISION,
  prior_conversion_flag              DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE retargeting_window_decisions (
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
CREATE TABLE retargeting_window_labels (
  decision_id    UUID        NOT NULL REFERENCES retargeting_window_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Retargeting Window & Churn Optimisation": Decide whether, when and how long to retarget each visitor to maximise incremental conversions and avoid chasing converted users. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Measurement, attribution and incrementality | Which ads caused a conversion? Last-click credits whoever came last, multi-touch attribution shares credit along a path, media mix models use aggregate spend and outcomes, and experiments (geo tests, holdouts) measure true incremental lift. Privacy limits individual-level tracking. | Correlation between ad exposure and purchase is not causation; targeting people who would have bought anyway inflates apparent performance. |
| Privacy and signal loss | Consent rules (GDPR, CCPA), platform changes such as app tracking limits and the phase-out of third-party cookies remove cross-site identifiers. Models rely more on context, first-party signals and aggregated data. | Features you can use today may be unavailable next year; design for graceful loss of signals. |
| Audiences, identity and privacy | Targeting uses audience segments, lookalikes built from seed customers, and identity graphs that link devices and cookies. Consent laws, platform rules and cookie deprecation push the industry to context, first-party data, clean rooms and aggregated or privacy-preserving measurement. | Features and joins that were routine are becoming unavailable; designs must tolerate missing identifiers and prove privacy properties. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Time since last visit | Hours since visit. Hazard. | Leakage risk to design against: Clock. |
| A signal-versus-noise trap in this use case: Hazard | The true signal is conversion hazard decays with time since visit; the common noise is fixed 30-day windows. | Most conversions happen in the first days. |

**Ask the experts**

- [ ] What exactly does "Suppress after conversion" mean in practice for retargeting window & churn optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Time since last visit" and "Depth of engagement", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Incremental ROAS" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: observational lift inflated by selection, and who can confirm the cut-off times and splits?
- [ ] How often does "Conversion postbacks delayed" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Retargeting | Showing ads to people who have already visited a site or product. |
| Frequency cap | A limit on how many times one person sees the same ad. |
| First-price / second-price auction | Auction rules in which the winner pays their own bid or just above the runner-up's bid. |
| Log loss | The negative log-likelihood of the observed clicks under the predicted probabilities, the standard training loss. |
| Calibration | Predicted probabilities matching observed frequencies, so that ads scored at 3% really are clicked about 3% of the time. |
| Incrementality | The extra outcome that exists because of advertising, compared with what would have happened anyway. |
| Impression | One instance of an ad being shown to a user; the denominator of click-through rate. |
| CTR | Click-through rate: clicks divided by impressions, typically a few percent or much less. |
| CPM / CPC / CPA | Pricing per thousand impressions, per click or per action such as a purchase or install. |
| eCPM | Effective cost per mille: expected revenue per thousand impressions, used to rank bids of different pricing types. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| Right-censoring | Observation ending before the event happens, so only a lower bound on the time is known. |
| Concordance index | A ranking measure for survival models: the chance the unit that fails first is ranked as riskier. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| State-space / Kalman filter | A model that tracks a hidden state through noisy observations and updates it over time. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| p99 latency | The time within which 99% of requests complete. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
