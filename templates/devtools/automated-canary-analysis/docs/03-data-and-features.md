# Automated Canary Analysis: data and feature specification

> Generated from the blueprint `devtools/automated-canary-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Automated Canary Analysis · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Automated Canary Analysis": Compare the canary version with the baseline on error rates, latency and business metrics and recommend promotion, hold or rollback with confidence, for the release owner to confirm. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Before-and-after comparisons.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Error rate difference | canary versus baseline errors | Core | From metrics |   |   |   |
| Latency percentile difference | p95 and p99 changes | Core | From metrics |   |   |   |
| Business metric change | conversions or throughput | Impact | From analytics |   |   |   |
| Traffic and sample size | requests in each group | Confidence | From load balancers |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Test | Matched comparison of canary and baseline | Before and after comparison | Traffic changes confuse before and after |
| Metrics | Service and business signals | Errors only | Some failures show as lower conversions |
| Control | A human confirms promotion | Automatic promotion only | Edge cases need judgement |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Release author | personal data |
| Version label | an identifier |
| Dashboard colour | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Error rate difference inputs | Developer experience | Source control and code review platform | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from metrics. |
| Latency percentile difference inputs | Platform engineering | CI/CD and artifact registry | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from metrics. |
| Business metric change inputs | Application security | Issue tracker and developer portal | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from analytics. |
| Traffic and sample size inputs | Developer experience | Source control and code review platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from load balancers. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: automated_canary_analysis_inputs.v1
owner: developer-experience@example.com
system_of_record: Source control and code review platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: error_rate_difference, type: double, nullable: false }
    - { name: latency_percentile_difference, type: double, nullable: false }
    - { name: business_metric_change, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Error rate difference and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Latency percentile difference against Source control and code review platform
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Error rate difference, traces back to Source control and code review platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Rossmann Store Sales | https://www.kaggle.com/c/rossmann-store-sales | Competition rules; free Kaggle login | Daily sales for 1,115 drugstores with promotion, holiday and competitor features | Store-level totals, not SKU level. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE automated_canary_analysis_forecasts (
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
CREATE TABLE automated_canary_analysis_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE automated_canary_analysis_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Software engineering produces its own data: commits, reviews, builds, tests, incidents and tickets. Quality shows up late and noisily, developers are sensitive to being measured and code, secrets and customer data are among a company's most confidential assets, so tools assist engineers inside sandboxes and leave merges and releases to people. For this use case, "Automated Canary Analysis": Compare the canary version with the baseline on error rates, latency and business metrics and recommend promotion, hold or rollback with confidence, for the release owner to confirm. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Deployments carry risk that can be staged | Canaries, progressive rollouts and feature flags limit the damage of a bad release. The risk depends on change size, service criticality and timing. | Gating decisions should be policy with model input and not a model alone. |
| Code review is a quality gate and a learning channel | Reviewers catch defects, share knowledge and keep designs consistent. Their time is limited, so tools that point to risky changes or likely issues help most when they cite evidence and leave the decision to the reviewer. | Tools that comment on everything teach reviewers to ignore them. |
| Pipelines fail for many reasons | A broken build can come from code, dependencies, infrastructure or configuration. Finding the first real error in a long log, and linking it to recent changes, cuts the time to fix. | A diagnosis that does not show its evidence is hard to trust. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Error rate difference | Canary versus baseline errors. Core. | Leakage risk to design against: From metrics. |
| A signal-versus-noise trap in this use case: Test | The true signal is matched comparison of canary and baseline; the common noise is before and after comparison. | Traffic changes confuse before and after. |

**Ask the experts**

- [ ] What exactly does "Decision recommended within 10 minutes of rollout step" mean in practice for automated canary analysis: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Error rate difference" and "Latency percentile difference", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Bad releases caught in canary" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: before-and-after comparisons, and who can confirm the cut-off times and splits?
- [ ] How often does "Low traffic" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Canary release | Releasing a change to a small share of users first. |
| Pull request | A proposed code change submitted for review. |
| Test selection | Choosing which tests to run for a change. |
| Change failure rate | The share of deployments that cause a failure. |
| CD | Continuous delivery or deployment: releasing changes automatically. |
| Code review | Examination of a change by another engineer. |
| Commit | A saved change to the code base. |
| Flaky test | A test that sometimes fails without a code change. |
| Regression | A defect introduced by a change to previously working behaviour. |
| Mutation testing | Testing the tests by injecting small faults. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Remaining useful life | The estimated time before a machine or component fails. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| Champion / challenger | The model in production and a candidate that must beat it before promotion. |
