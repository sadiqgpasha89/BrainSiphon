# Bayesian Marketing Mix Modelling: data and feature specification

> Generated from the blueprint `adtech/marketing-mix-modeling-bayesian` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Bayesian Marketing Mix Modelling · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Bayesian Marketing Mix Modelling": Estimate channel-level incremental ROI and saturation curves from aggregate data to guide cross-channel budgets. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Overfitting with many parameters on short history.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Adstock decay parameter | geometric carryover per channel | Lag effect | Prior |   |   |   |
| Saturation half-saturation point | Hill curve parameter | Diminishing returns | Spend range |   |   |   |
| Seasonality and baseline | trend and holidays | Baseline | Calendar |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Identification | Calibrate with lift tests via priors | Fit only observational data | Collinear channels are not separable without experiments |
| Dynamics | Adstock carryover and saturation curves | Linear spend effects | Returns diminish and carry over |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Daily noise in spend | aggregated weekly |
| Creative-level data | too granular |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Adstock decay parameter inputs | Ad platform engineering | Campaign and budget ledger | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: prior. |
| Saturation half-saturation point inputs | Measurement science | Billing and invoicing | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: spend range. |
| Seasonality and baseline inputs | Privacy engineering | Identity graph and consent store (CMP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: calendar. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: marketing_mix_modeling_bayesian_inputs.v1
owner: ad-platform-engineering@example.com
system_of_record: Campaign and budget ledger
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: adstock_decay_parameter, type: double, nullable: false }
    - { name: saturation_half_saturation_point, type: double, nullable: false }
    - { name: seasonality_and_baseline, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Adstock decay parameter and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Saturation half-saturation point against Campaign and budget ledger
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Adstock decay parameter, traces back to Campaign and budget ledger; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE marketing_mix_modeling_forecasts (
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
CREATE TABLE marketing_mix_modeling_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE marketing_mix_modeling_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Online advertising is sold through auctions that run in the time it takes a page to load. When a user opens an app or page, an ad request goes to an exchange, several buyers bid, and the winner's ad is shown, all within roughly 100 ms. The click-through-rate model supplies the number that turns a bid into a ranking, so a wrong or miscalibrated probability changes who wins and what they pay. Learn how the auction uses your score before tuning the model. For this use case, "Bayesian Marketing Mix Modelling": Estimate channel-level incremental ROI and saturation curves from aggregate data to guide cross-channel budgets. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Measurement, attribution and incrementality | Which ads caused a conversion? Last-click credits whoever came last, multi-touch attribution shares credit along a path, media mix models use aggregate spend and outcomes, and experiments (geo tests, holdouts) measure true incremental lift. Privacy limits individual-level tracking. | Correlation between ad exposure and purchase is not causation; targeting people who would have bought anyway inflates apparent performance. |
| Forecasting inventory and spend | Publishers forecast available impressions for guaranteed deals; advertisers forecast spend and returns across channels; delivery systems must neither over- nor under-deliver. Seasonality, events and policy changes dominate. | Guaranteed contracts create penalties for under-delivery, so forecasts are used at conservative quantiles. |
| Seasonality, trend and calendar effects | Most business series repeat daily, weekly and annually, with holidays, promotions and outages on top. Models must separate these from real change, and know which calendar effects are known in advance. | Ignoring seasonality makes a normal Monday look like an incident and hides slow-moving real changes. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Adstock decay parameter | Geometric carryover per channel. Lag effect. | Leakage risk to design against: Prior. |
| A signal-versus-noise trap in this use case: Identification | The true signal is calibrate with lift tests via priors; the common noise is fit only observational data. | Collinear channels are not separable without experiments. |

**Ask the experts**

- [ ] What exactly does "Aggregate weekly data" mean in practice for bayesian marketing mix modelling: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Adstock decay parameter" and "Saturation half-saturation point", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "ROAS of reallocated budget" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: overfitting with many parameters on short history, and who can confirm the cut-off times and splits?
- [ ] How often does "Spend moves in lockstep across channels" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Media mix model (MMM) | A statistical model of sales as a function of channel spend, seasonality and controls. |
| Saturation curve | The diminishing return from additional spend in a channel. |
| ROAS | Return on ad spend: revenue generated per currency unit of advertising. |
| Adstock | The lagged, decaying effect of advertising that continues after the ad is seen. |
| Incrementality | The extra outcome that exists because of advertising, compared with what would have happened anyway. |
| Synthetic control | A weighted blend of untreated regions that mimics a treated region before the test. |
| Normalised cross-entropy (NE) | Log loss divided by the log loss of always predicting the average click rate; below 1 means better than the base rate. |
| Calibration | Predicted probabilities matching observed frequencies, so that ads scored at 3% really are clicked about 3% of the time. |
| Feature hashing | Mapping categorical values to a fixed-size vector with a hash function, so memory stays flat however many ids exist. |
| Geo experiment | A test that varies advertising across regions to measure lift without user-level tracking. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Lag feature | A past value of the series used as a predictor. |
| Forecast horizon | How many steps ahead a forecast looks. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Guardrail metric | A metric that must not get worse when optimising the main objective. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
