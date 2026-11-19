# Revenue & Pipeline Forecasting: data and feature specification

> Generated from the blueprint `saas/revenue-and-pipeline-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Revenue & Pipeline Forecasting · **Domain:** saas · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Revenue & Pipeline Forecasting": Forecast bookings and ARR by quarter at deal and segment level with calibrated ranges for planning. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using stage at close in features.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Deal stage age vs norm | days in stage over median | Stall | CRM history |   |   |   |
| Multi-threading | number of engaged contacts | Deal strength | CRM |   |   |   |
| Quote and legal activity | quotes sent and redlines | Late-stage intent | Event timing |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Bottom-up | Deal-level win probability aggregated with uncertainty | Rep-reported commit only | Reps over- and under-call systematically |
| Dynamics | Stage ageing and slippage | Stage probabilities fixed | Deals older than typical close time rarely close |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Rep name | personal |
| Deal name | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Deal stage age vs norm inputs | Product analytics | Tenant and entitlement service | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: CRM history. |
| Multi-threading inputs | Platform engineering | Product event warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: CRM. |
| Quote and legal activity inputs | Customer success operations | CRM and billing (subscriptions) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: event timing. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: revenue_and_pipeline_forecasting_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: deal_stage_age_vs_norm, type: double, nullable: false }
    - { name: multi_threading, type: double, nullable: false }
    - { name: quote_and_legal_activity, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Deal stage age vs norm and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Multi-threading against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Deal stage age vs norm, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Azure Public Dataset | https://github.com/Azure/AzurePublicDataset | CC BY 4.0 (see the repository) | Anonymised VM, workload and resource utilisation traces from Azure | One cloud and period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ETT electricity transformer dataset | https://github.com/zhouhaoyi/ETDataset | CC BY-ND 4.0 (see the repository) | Multivariate transformer temperature and load data used for long-horizon forecasting benchmarks | One asset type. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE revenue_and_pipeline_forecasts (
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
CREATE TABLE revenue_and_pipeline_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE revenue_and_pipeline_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Revenue & Pipeline Forecasting": Forecast bookings and ARR by quarter at deal and segment level with calibrated ranges for planning. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| B2B SaaS metrics and the customer lifecycle | Software-as-a-service companies sell subscriptions to businesses. Key quantities are annual recurring revenue (ARR), net revenue retention, churn, expansion and the sales pipeline. Customers move from lead to account, trial, activation, expansion and renewal, with product usage as the leading signal. | Targets like churn and expansion are slow and censored (many accounts have not renewed yet), so models need survival-style handling and care about leakage from billing events. |
| Identity resolution and the customer data platform | Customer data platforms merge records from many sources into one profile. Matching leads to accounts, cleaning duplicates and resolving identities are entity-resolution problems with strict privacy rules. | A wrong merge combines two real customers, with privacy consequences, so precision comes before recall. |
| Seasonality, trend and calendar effects | Most business series repeat daily, weekly and annually, with holidays, promotions and outages on top. Models must separate these from real change, and know which calendar effects are known in advance. | Ignoring seasonality makes a normal Monday look like an incident and hides slow-moving real changes. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Deal stage age vs norm | Days in stage over median. Stall. | Leakage risk to design against: CRM history. |
| A signal-versus-noise trap in this use case: Bottom-up | The true signal is deal-level win probability aggregated with uncertainty; the common noise is rep-reported commit only. | Reps over- and under-call systematically. |

**Ask the experts**

- [ ] What exactly does "Sparse deals relative to rows" mean in practice for revenue & pipeline forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Deal stage age vs norm" and "Multi-threading", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Forecast accuracy at week 6" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using stage at close in features, and who can confirm the cut-off times and splits?
- [ ] How often does "CRM hygiene lapses" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Pipeline | The set of open sales opportunities and their stages and expected values. |
| ARR / MRR | Annual or monthly recurring revenue: the value of active subscriptions normalised to a year or month. |
| PQL / MQL | Product-qualified and marketing-qualified leads: prospects identified from product usage or marketing activity. |
| Autoscaling | Automatically adding or removing compute resources as load changes. |
| Time to first successful call | How long a new developer takes to make a working API request, a common docs-quality metric. |
| Seat-based pricing | Charging per user of the product. |
| Sequential testing | Statistical methods that allow results to be checked repeatedly without inflating false positives. |
| Feature flag | A switch that turns a feature on for chosen users, used for gradual rollouts and experiments. |
| QBR | Quarterly business review: a meeting where a customer success manager reviews value delivered with a customer. |
| SLO / SLA | A service level objective (internal target) and agreement (promised to customers) for reliability. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Platt scaling | Calibrating scores with a logistic curve. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
