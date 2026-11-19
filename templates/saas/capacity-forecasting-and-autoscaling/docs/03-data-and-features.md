# Capacity Forecasting & Predictive Autoscaling: data and feature specification

> Generated from the blueprint `saas/capacity-forecasting-and-autoscaling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Capacity Forecasting & Predictive Autoscaling · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Capacity Forecasting & Predictive Autoscaling": Forecast load and scale infrastructure ahead of demand to meet SLOs at lowest cost. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Backtests without warm-up delays.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Request rate forecast | seasonal and event-aware forecast | Demand | Forecast quality |   |   |   |
| Per-instance capacity curve | requests per instance at SLO | Sizing | Load tests |   |   |   |
| Event calendar | launches, campaigns, holidays | Spikes | Calendar |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Lead time | Forecast beyond the node warm-up time | Reactive CPU thresholds | Reactive scaling lags the spike |
| Quantile | Provision to a high quantile of demand | Mean forecast | Mean provisioning misses spikes |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Instance ID | none |
| CPU of single host | local noise |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Request rate forecast inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: forecast quality. |
| Per-instance capacity curve inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: load tests. |
| Event calendar inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: calendar. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: capacity_forecasting_and_autoscaling_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: request_rate_forecast, type: double, nullable: false }
    - { name: per_instance_capacity_curve, type: double, nullable: false }
    - { name: event_calendar, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Request rate forecast and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Per-instance capacity curve against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Request rate forecast, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Azure Public Dataset | https://github.com/Azure/AzurePublicDataset | CC BY 4.0 (see the repository) | Anonymised VM, workload and resource utilisation traces from Azure | One cloud and period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ETT electricity transformer dataset | https://github.com/zhouhaoyi/ETDataset | CC BY-ND 4.0 (see the repository) | Multivariate transformer temperature and load data used for long-horizon forecasting benchmarks | One asset type. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE capacity_forecasting_and_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  request_rate_forecast              DOUBLE PRECISION,
  per_instance_capacity_curve        DOUBLE PRECISION,
  event_calendar                     DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE capacity_forecasting_and_decisions (
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
CREATE TABLE capacity_forecasting_and_labels (
  decision_id    UUID        NOT NULL REFERENCES capacity_forecasting_and_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Capacity Forecasting & Predictive Autoscaling": Forecast load and scale infrastructure ahead of demand to meet SLOs at lowest cost. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Reliability engineering and AIOps | Operations teams run services against reliability targets (SLOs). Monitoring produces metrics, logs and traces; models detect anomalies, forecast capacity, correlate alerts, find root causes and sample traces. Incidents are rare, labels are scarce and systems change constantly. | Alert noise and unexplained pages burn out on-call engineers, so precision, grouping and actionable context come first. |
| Data platforms, quality and ML operations | Data pipelines move events into warehouses; data quality checks catch schema and volume problems; ML platforms track models, drift, evaluation of language-model applications and costs. Gateways route requests between models by cost and quality. | Many model failures are data failures; monitoring inputs and outputs is as important as the model. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Request rate forecast | Seasonal and event-aware forecast. Demand. | Leakage risk to design against: Forecast quality. |
| A signal-versus-noise trap in this use case: Lead time | The true signal is forecast beyond the node warm-up time; the common noise is reactive CPU thresholds. | Reactive scaling lags the spike. |

**Ask the experts**

- [ ] What exactly does "Warm-up time of new nodes" mean in practice for capacity forecasting & predictive autoscaling: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Request rate forecast" and "Per-instance capacity curve", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "SLO attainment" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: backtests without warm-up delays, and who can confirm the cut-off times and splits?
- [ ] How often does "Unannounced viral traffic" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Autoscaling | Automatically adding or removing compute resources as load changes. |
| SLO / SLA | A service level objective (internal target) and agreement (promised to customers) for reliability. |
| Pipeline | The set of open sales opportunities and their stages and expected values. |
| Breaking change | A change that makes existing client code fail, which normally requires a new major version. |
| PQL / MQL | Product-qualified and marketing-qualified leads: prospects identified from product usage or marketing activity. |
| Feature flag | A switch that turns a feature on for chosen users, used for gradual rollouts and experiments. |
| Pull request (PR) | A proposed code change submitted for review before merging. |
| Runbook | A documented procedure for handling a known operational situation. |
| FinOps | Managing cloud spend by tracking, allocating and optimising costs. |
| Data lineage | A record of where data came from and how it was transformed. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Heuristic / local search | Fast methods that find good but not provably optimal solutions. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| p99 latency | The time within which 99% of requests complete. |
| Distribution shift | A change in the data a model sees compared with training. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
