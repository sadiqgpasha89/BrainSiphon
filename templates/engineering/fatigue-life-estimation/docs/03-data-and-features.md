# Fatigue Life Estimation: data and feature specification

> Generated from the blueprint `engineering/fatigue-life-estimation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fatigue Life Estimation · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Fatigue Life Estimation": Estimate fatigue damage accumulation in structures and components from measured load histories, to plan inspections and repairs with safety margins. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Average load.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Load cycle histogram | counted cycles and ranges | Core | From sensor data |   |   |   |
| Material fatigue curve | S-N curve | Core | From standards |   |   |   |
| Hot spot stress | stress at critical details | Core | From models |   |   |   |
| Environment | corrosion and temperature | Modifier | From site data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Method | Cycle counting and material curves | Average load | Fatigue depends on cycles and range |
| Safety | Code safety factors | Model-only life | Codes protect against model error |
| Data | Calibrated sensors | Unchecked sensors | Bad data gives wrong damage |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Sensor id | an identifier |
| Operator name | personal data |
| Report layout | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Load cycle histogram inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from sensor data. |
| Material fatigue curve inputs | Project delivery | Project scheduling and cost control platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from standards. |
| Hot spot stress inputs | Health, safety and quality | Quality, safety and inspection records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from models. |
| Environment inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from site data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: fatigue_life_estimation_inputs.v1
owner: engineering-management@example.com
system_of_record: CAD, BIM and document management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: load_cycle_histogram, type: double, nullable: false }
    - { name: material_fatigue_curve, type: double, nullable: false }
    - { name: hot_spot_stress, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Load cycle histogram and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Material fatigue curve against CAD, BIM and document management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Load cycle histogram, traces back to CAD, BIM and document management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCR Time Series Archive | https://www.cs.ucr.edu/~eamonn/time_series_data_2018/ | Research use with citation (see the page) | 128 labelled time-series classification datasets | Short curated series. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE fatigue_life_estimation_forecasts (
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
CREATE TABLE fatigue_life_estimation_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE fatigue_life_estimation_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Engineering and construction deliver one-off projects with long lead times, many parties and high consequences of error. Data lives in drawings, models, schedules and site records of uneven quality, and licensed engineers carry professional liability, so tools assist and verify and people sign. For this use case, "Fatigue Life Estimation": Estimate fatigue damage accumulation in structures and components from measured load histories, to plan inspections and repairs with safety margins. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Professional engineers are accountable for the design | Codes and law require a licensed engineer to design, check and seal critical work. Software supports calculations and checks, and responsibility cannot be handed to a tool. | Any AI output used in design needs independent verification and a named signer. |
| Inspection finds defects before they are built in | Welds, concrete and structures are checked by qualified inspectors with measurements and images. Models can prioritise and highlight, but acceptance remains a human, certified decision. | A missed severe defect costs far more than a recheck, so recall matters. |
| Site safety is about conditions | Hazards such as open edges, exclusion zones and plant movement can be detected at scene level. Monitoring individual workers raises legal and trust issues. | Safety tools support inspections and do not replace them. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Load cycle histogram | Counted cycles and ranges. Core. | Leakage risk to design against: From sensor data. |
| A signal-versus-noise trap in this use case: Method | The true signal is cycle counting and material curves; the common noise is average load. | Fatigue depends on cycles and range. |

**Ask the experts**

- [ ] What exactly does "Damage estimates include uncertainty" mean in practice for fatigue life estimation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Load cycle histogram" and "Material fatigue curve", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Fatigue cracks found late" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: average load, and who can confirm the cut-off times and splits?
- [ ] How often does "Overload event" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Fatigue | Damage from repeated loading. |
| Finite element analysis | A numerical method for stress and heat analysis. |
| Change order | A formal change to scope, cost or time. |
| Estimate | A prediction of project cost. |
| Corrosion | Material loss from chemical reaction. |
| Digital twin | A model kept current with real data from an asset. |
| Health and safety plan | A plan for managing risk on a project. |
| Engineer of record | The licensed engineer responsible for a design. |
| State-space / Kalman filter | A model that tracks a hidden state through noisy observations and updates it over time. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Platt scaling | Calibrating scores with a logistic curve. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Brier score | The mean squared difference between predicted probability and the 0/1 outcome. |
