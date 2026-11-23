# Process Setpoint Optimisation for Yield: data and feature specification

> Generated from the blueprint `manufacturing/process-setpoint-optimisation-yield` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Process Setpoint Optimisation for Yield · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Process Setpoint Optimisation for Yield": Recommend setpoint adjustments on a continuous or batch process to raise yield and cut energy while staying within safe operating limits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Letting the model learn safety limits.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Current setpoint distance from the optimum region | position relative to the learned yield surface | Direction of change | Constrained by limits |   |   |   |
| Feed quality indicators | measured properties of the incoming material | Context | Lab and inline analysers |   |   |   |
| Ambient and utility conditions | temperature, pressure and cooling water state | Context | Include timestamps |   |   |   |
| Equipment fouling indicator | trend in heat transfer or pressure drop | Slow drift | Per asset |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Safety | Hard limits enforced in code outside the model | A model that learns the limits | A learned limit can be wrong in a rare state |
| Causality | Effects estimated from controlled variation and physics | Correlations in historical data | Operators move setpoints for reasons the data does not show |
| Evaluation | Matched runs and staged rollout | Before and after averages | Raw material changes confound the result |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Operator name | not a process variable |
| Batch number | an identifier |
| Day of week alone | confounded |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Current setpoint distance from the optimum region inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: constrained by limits. |
| Feed quality indicators inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: lab and inline analysers. |
| Ambient and utility conditions inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: include timestamps. |
| Equipment fouling indicator inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: per asset. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: process_setpoint_optimisation_yield_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: current_setpoint_distance_from_the, type: double, nullable: false }
    - { name: feed_quality_indicators, type: double, nullable: false }
    - { name: ambient_and_utility_conditions, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Current setpoint distance from the optimum region and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Feed quality indicators against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Current setpoint distance from the optimum region, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| KDD Cup 2012 Track 2: ad click prediction | https://www.kaggle.com/c/kddcup2012-track2 | Competition rules; free Kaggle login | Search-ad impressions with query, ad, user and position fields | Old and anonymised, but it records the display position. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PaySim synthetic mobile-money transactions | https://www.kaggle.com/datasets/ealaxi/paysim1 | See the dataset page; free Kaggle login | 6.3M simulated transfers with sender and recipient accounts | Simulated from one company's logs, so patterns are simpler than production. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE process_setpoint_optimisation_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  current_setpoint_distance_from_the DOUBLE PRECISION,
  feed_quality_indicators            DOUBLE PRECISION,
  ambient_and_utility_conditions     DOUBLE PRECISION,
  equipment_fouling_indicator        DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE process_setpoint_optimisation_decisions (
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
CREATE TABLE process_setpoint_optimisation_labels (
  decision_id    UUID        NOT NULL REFERENCES process_setpoint_optimisation_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Process Setpoint Optimisation for Yield": Recommend setpoint adjustments on a continuous or batch process to raise yield and cut energy while staying within safe operating limits. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Process parameters interact | Temperature, pressure, speed and material properties interact to determine quality, and the best set-point changes with batch and equipment condition. Experiments on a live line are expensive. | Models should recommend set-points inside validated operating windows and let engineers approve changes. |
| Visual inspection trades escapes against false rejects | Cameras classify defects such as scratches, voids and misalignment. Missing a defect lets a bad part ship, while rejecting a good part wastes cost, and the right balance depends on the defect class and the customer. | Overall accuracy hides this, so recall by defect class and the cost of each error must drive the threshold. |
| Traceability links parts to materials and settings | Lot and serial numbers connect each finished item to its materials, machine, settings and test results, which makes recalls and root cause analysis possible. | Poor traceability turns a small quality problem into a large recall. |
| Learning from logs: off-policy evaluation | Most business data were generated by an earlier policy. To judge a new policy offline you need the probability with which each logged action was chosen; estimators such as inverse propensity weighting, self-normalised weighting and doubly robust methods correct for the difference, with a bias-variance trade-off. | Never evaluate a new policy only on the rows where it agrees with the old one; log propensities from day one. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Current setpoint distance from the optimum region | Position relative to the learned yield surface. Direction of change. | Leakage risk to design against: Constrained by limits. |
| A signal-versus-noise trap in this use case: Safety | The true signal is hard limits enforced in code outside the model; the common noise is a model that learns the limits. | A learned limit can be wrong in a rare state. |

**Ask the experts**

- [ ] What exactly does "Recommendations bounded by validated safe limits" mean in practice for process setpoint optimisation for yield: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Current setpoint distance from the optimum region" and "Feed quality indicators", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Yield improvement against matched controls" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: letting the model learn safety limits, and who can confirm the cut-off times and splits?
- [ ] How often does "Unfamiliar feed" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Control chart | A chart of a process measure with limits that show when it is out of control. |
| Setpoint | The target value of a process variable. |
| SPC | Statistical process control: using control charts to detect process drift. |
| Recipe | The set of parameters used to make a product. |
| SCADA | Supervisory control and data acquisition: systems that monitor and control industrial processes. |
| Historian | A database for time-stamped sensor data from plants. |
| First pass yield | The share of units that pass without rework. |
| Cp and Cpk | Measures of how well a process fits within specification limits. |
| Digital twin | A model of a machine or plant kept in step with real data. |
| Lean | A way of working that removes waste from processes. |
| Off-policy evaluation (OPE) | Estimating how a new policy would perform from data logged under another policy. |
| Propensity | The probability with which the logging policy chose the logged action. |
| Doubly robust estimator | An off-policy estimator that combines a reward model with propensity weighting. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
