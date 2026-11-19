# Cold-Chain Excursion Prediction: how well the starter fits

> Generated from the blueprint `supply-chain/cold-chain-temperature-excursion-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

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
| problem | Anomaly detection on time series: Predict temperature excursions in reefer trailers and pharma shipments minutes ahead so interventions save the load | Anomaly detection on time series | match |  |
| label | Whether a point or interval in a series is anomalous, judged against known events | A point is anomalous when it lies inside a known anomaly interval; an event is detected when an alert fires inside it (or shortly after) | match |  |
| validation | Chronological evaluation at a fixed alert budget with no future information | Chronological evaluation with a fixed alert budget and no-future features | match |  |
| metrics | Lead time at fixed precision; Time-to-breach error | Recall, detection delay and false alerts per series per week at a fixed alert budget | match |  |
| data | Operational or sensor series with seasonality and level shifts | Operational metric series with daily and weekly seasonality, level shifts, drift and calendar effects | adapt | The kit scores single metric series: define the entity stream this use case scores (sessions, hosts, containers or logs) and its features |
| model | Baseline: Threshold alarms at limit temperatures. Production: Gray-box thermal model combined with a sequence network predicting time-to-breach, with calibrated alerts to… | Rolling z-score, robust seasonal baseline and a calendar-aware version | match |  |
| serving | Online decision inside about 100 milliseconds (p99 80 ms) | Offline scripts only: no streaming scorer, alert routing or suppression service | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Telemetry stream (IoT); Thermal feature builder (stream) | None. Runs locally on synthetic operational metrics | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
