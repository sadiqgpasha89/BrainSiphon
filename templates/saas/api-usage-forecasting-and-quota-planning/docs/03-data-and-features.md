# API Usage Forecasting & Quota Planning: data and feature specification

> Generated from the blueprint `saas/api-usage-forecasting-and-quota-planning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** API Usage Forecasting & Quota Planning · **Domain:** saas · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "API Usage Forecasting & Quota Planning": Forecast per-customer API usage to plan capacity, set fair quotas and forecast usage-based revenue. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on throttled usage as true demand.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Usage trend and seasonality | decomposed trend and weekly cycle | Baseline | Window |   |   |   |
| Customer lifecycle stage | onboarding, steady, expansion | Growth | CRM |   |   |   |
| Planned launch events | dated releases from CSM notes | Spikes | Data capture |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Heterogeneity | Hierarchical/global models across customers | Per-customer ARIMA | Per-customer models fail on short histories |
| Events | Customer launch and campaign covariates | History only | Launches drive step changes |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer name | none |
| Plan name | encoded |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Usage trend and seasonality inputs | Product analytics | Tenant and entitlement service | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: window. |
| Customer lifecycle stage inputs | Platform engineering | Product event warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: CRM. |
| Planned launch events inputs | Customer success operations | CRM and billing (subscriptions) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: data capture. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: api_usage_forecasting_and_quota_planning_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: usage_trend_and_seasonality, type: double, nullable: false }
    - { name: customer_lifecycle_stage, type: double, nullable: false }
    - { name: planned_launch_events, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Usage trend and seasonality and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Customer lifecycle stage against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Usage trend and seasonality, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Azure Public Dataset | https://github.com/Azure/AzurePublicDataset | CC BY 4.0 (see the repository) | Anonymised VM, workload and resource utilisation traces from Azure | One cloud and period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ETT electricity transformer dataset | https://github.com/zhouhaoyi/ETDataset | CC BY-ND 4.0 (see the repository) | Multivariate transformer temperature and load data used for long-horizon forecasting benchmarks | One asset type. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE api_usage_forecasting_and_forecasts (
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
CREATE TABLE api_usage_forecasting_and_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE api_usage_forecasting_and_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "API Usage Forecasting & Quota Planning": Forecast per-customer API usage to plan capacity, set fair quotas and forecast usage-based revenue. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| The anatomy of API documentation | Docs usually combine an API reference (often generated from an OpenAPI specification), guides and tutorials, a changelog or release notes, and migration guides. Each answers a different kind of question, and they can disagree: a changelog legitimately mentions old values. | Retrieval should know which kind of page it is reading. Factual answers come from the reference for the right version, not from the changelog. |
| Versions and deprecation | APIs have versions (v1, v2), SDKs have their own semantic versions (major.minor.patch) per language, and features are deprecated with a sunset date before being removed. A breaking change is one that makes existing code stop working. | The right answer depends on which version the developer is using, so version must come from context and be shown in the answer. |
| OpenAPI as ground truth | An OpenAPI specification describes endpoints, parameters, request and response schemas and authentication in machine-readable form. Because it is precise, it can validate that every endpoint or field in a generated answer exists. | It turns hallucination checking from opinion into a lookup, and it is the cheapest strong guard you can add. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Usage trend and seasonality | Decomposed trend and weekly cycle. Baseline. | Leakage risk to design against: Window. |
| A signal-versus-noise trap in this use case: Heterogeneity | The true signal is hierarchical/global models across customers; the common noise is per-customer ARIMA. | Per-customer models fail on short histories. |

**Ask the experts**

- [ ] What exactly does "Thousands of customers with different scales" mean in practice for api usage forecasting & quota planning: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Usage trend and seasonality" and "Customer lifecycle stage", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Capacity-related incidents" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on throttled usage as true demand, and who can confirm the cut-off times and splits?
- [ ] How often does "Customer launches a new integration" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Pipeline | The set of open sales opportunities and their stages and expected values. |
| Seat-based pricing | Charging per user of the product. |
| Rate limit | The maximum number of requests allowed in a time window, with errors returned when exceeded. |
| Breaking change | A change that makes existing client code fail, which normally requires a new major version. |
| Embedding | A vector representing the meaning of text, used for similarity search that tolerates different wording. |
| Usage-based billing | Charging according to consumption, such as API calls or storage, which makes revenue less predictable. |
| Autoscaling | Automatically adding or removing compute resources as load changes. |
| API | Application programming interface: the way one program calls another, often over HTTP. |
| Endpoint | A specific URL and method of an API, such as POST /v2/payments. |
| SDK | Software development kit: a language-specific library that wraps an API. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
