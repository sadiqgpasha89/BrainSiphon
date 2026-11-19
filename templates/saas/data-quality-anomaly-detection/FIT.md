# Data Quality Anomaly Detection: how well the starter fits

> Generated from the blueprint `saas/data-quality-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `anomaly` (Anomaly detection on seasonal metrics) · **Fit:** adaptable · **Problem type:** `time-series-anomaly-detection`

The `anomaly` engine implements a neighbouring problem. This use case is `time-series-anomaly-detection`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter.

## Traps the synthetic data plants

- Ignoring seasonality
- Alerting on events you scheduled
- Tuning the threshold on the data you report
- A rolling window that includes the present

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make before you rely on it

- The kit scores single metric series: define the entity stream this use case scores (sessions, hosts, containers or logs) and its features

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Anomaly detection on time series: Detect freshness, volume, schema and distribution problems in data pipelines before dashboards and models break | Anomaly detection on time series | match |  |
| label | Whether a point or interval in a series is anomalous, judged against known events | A point is anomalous when it lies inside a known anomaly interval; an event is detected when an alert fires inside it (or shortly after) | match |  |
| validation | Chronological evaluation at a fixed alert budget with no future information | Chronological evaluation with a fixed alert budget and no-future features | match |  |
| metrics | Detection precision on incident-linked alerts; Detection delay | Recall, detection delay and false alerts per series per week at a fixed alert budget | match |  |
| data | Operational or sensor series with seasonality and level shifts | Operational metric series with daily and weekly seasonality, level shifts, drift and calendar effects | adapt | The kit scores single metric series: define the entity stream this use case scores (sessions, hosts, containers or logs) and its features |
| model | Baseline: Hand-written SQL checks per table. Production: Auto-profiled metrics with seasonal baselines, lineage-based impact ranking and LLM-assisted root-cause hints | Rolling z-score, robust seasonal baseline and a calendar-aware version | match |  |
| serving | Scheduled batch run | Offline scripts only: no streaming scorer, alert routing or suppression service | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Warehouse metadata (catalog); Metric profiler (batch); Resolution feedback (labels) | None. Runs locally on synthetic operational metrics | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
