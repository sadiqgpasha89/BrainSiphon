# Out-of-Home Footfall Attribution: data and feature specification

> Generated from the blueprint `adtech/ooh-footfall-attribution` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Out-of-Home Footfall Attribution · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Out-of-Home Footfall Attribution": Attribute store visits to out-of-home ad exposure using mobility data and control groups with privacy safeguards. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: No control group.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Visibility-weighted exposure | line-of-sight and dwell | Exposure | Geometry |   |   |   |
| Pre-period visit propensity | baseline store visits | Matching | Window |   |   |   |
| Daypart and weather | context | Confounders | Data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Exposure | Probabilistic exposure from visibility and trajectories | Proximity radius only | Proximity includes unexposed people |
| Control | Matched controls on pre-period mobility | Naive unexposed baseline | Exposed people differ systematically |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Device ID | none |
| Precise coordinates | privacy |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Visibility-weighted exposure inputs | Ad platform engineering | Campaign and budget ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: geometry. |
| Pre-period visit propensity inputs | Measurement science | Billing and invoicing | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: window. |
| Daypart and weather inputs | Privacy engineering | Identity graph and consent store (CMP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: ooh_footfall_attribution_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: visibility_weighted_exposure, type: double, nullable: false }
    - { name: pre_period_visit_propensity, type: double, nullable: false }
    - { name: daypart_and_weather, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Visibility-weighted exposure and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Pre-period visit propensity against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Visibility-weighted exposure, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo AI Lab datasets | https://ailab.criteo.com/ressources/ | Research-use terms on the Criteo AI Lab page | Large click logs, uplift, attribution and counterfactual datasets from Criteo | Terabyte scale for some sets; research-use terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Bandit Dataset | https://research.zozo.com/data.html | CC BY 4.0 (see the page) | Logged bandit feedback from a fashion e-commerce site with propensities, for off-policy evaluation | One platform and a short period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE ooh_footfall_attribution_forecasts (
  series_id      TEXT        NOT NULL,
  origin         TIMESTAMPTZ NOT NULL,   -- the as_of the forecast was made at
  target_period  DATE        NOT NULL,
  horizon_step   SMALLINT    NOT NULL,
  p10            REAL        NOT NULL,
  p50            REAL        NOT NULL,
  p90            REAL        NOT NULL,
  model_version  TEXT        NOT NULL,
  is_fallback    BOOLEAN     NOT NULL DEFAULT FALSE,
  PRIMARY KEY (series_id, origin, target_period)
) PARTITION BY RANGE (origin);

-- actuals land after the fact; joining on (series_id, target_period) gives forecast error by horizon
CREATE TABLE ooh_footfall_attribution_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE ooh_footfall_attribution_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Out-of-Home Footfall Attribution": Attribute store visits to out-of-home ad exposure using mobility data and control groups with privacy safeguards. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Measurement, attribution and incrementality | Which ads caused a conversion? Last-click credits whoever came last, multi-touch attribution shares credit along a path, media mix models use aggregate spend and outcomes, and experiments (geo tests, holdouts) measure true incremental lift. Privacy limits individual-level tracking. | Correlation between ad exposure and purchase is not causation; targeting people who would have bought anyway inflates apparent performance. |
| Position, placement and context | The same ad gets very different click rates depending on where it appears (top of the feed versus a sidebar), on the device and on the time of day. Users also look at higher positions more, so observed click rates mix the quality of an ad with how visible it was. | Logs ranked by an old model teach a new model the old ranking unless position is handled explicitly. |
| Entity resolution and transitivity | Resolving duplicates means deciding which records refer to the same real-world entity. Because 'same as' is transitive, one wrong link can merge two large groups, so precision on links matters more than recall and clusters are monitored for abnormal size. | Weight shared attributes by their rarity and cap hubs before clustering. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Visibility-weighted exposure | Line-of-sight and dwell. Exposure. | Leakage risk to design against: Geometry. |
| A signal-versus-noise trap in this use case: Exposure | The true signal is probabilistic exposure from visibility and trajectories; the common noise is proximity radius only. | Proximity includes unexposed people. |

**Ask the experts**

- [ ] What exactly does "Location privacy" mean in practice for out-of-home footfall attribution: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Visibility-weighted exposure" and "Pre-period visit propensity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Incremental visits per spend" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: no control group, and who can confirm the cut-off times and splits?
- [ ] How often does "Panel under-represents certain groups" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Out-of-home (OOH) | Advertising in physical places such as billboards and transit, measured with location data. |
| SKAN / ATT | Apple's privacy frameworks for app tracking and install attribution that limit user-level data. |
| Attribution | Assigning credit for a conversion, such as a purchase, to the ads that preceded it. |
| Clean room | A secure environment where two parties combine data for analysis without exposing individual records. |
| Multi-touch attribution (MTA) | Assigning conversion credit across all the ad exposures along a customer's path. |
| Incrementality | The extra outcome that exists because of advertising, compared with what would have happened anyway. |
| Synthetic control | A weighted blend of untreated regions that mimics a treated region before the test. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Blocking | Cheaply selecting candidate pairs for comparison so not all pairs are compared. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
