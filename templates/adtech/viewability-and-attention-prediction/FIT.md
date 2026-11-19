# Viewability & Attention Prediction: how well the starter fits

> Generated from the blueprint `adtech/viewability-and-attention-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `tabular` (Event-level detection with delayed labels) · **Fit:** adaptable · **Problem type:** `binary-event-classification`

The `tabular` engine implements a neighbouring problem. This use case is `binary-event-classification`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter.

## Traps the synthetic data plants

- Training on labels that had not matured
- A window that includes the future
- Reporting accuracy on rare positives
- An unregularised boosted model on a few hundred positives

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make before you rely on it

- Replace the kit's models with the blueprint's: Pre-bid viewability model on placement and page features, plus attention-time estimator calibrated…

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Event classification with delayed labels: Predict whether an ad impression will be viewable and attended to, to bid on quality inventory and verify delivery | Event classification with delayed labels | match |  |
| label | A binary outcome per event, confirmed after a delay and sometimes never observed | A binary outcome confirmed after a delay (a positive 7 to 21 days later; a negative only after the full maturity window) | match |  |
| validation | Chronological split with entity separation and a label-maturity rule | Chronological split with entity separation and a label-maturity rule; leakage test on every feature | match |  |
| metrics | Calibration vs measured viewability; Attention-time error | PR-AUC and recall at a fixed false-positive rate, plus calibration | match |  |
| data | Event-level rows with point-in-time features | Event-level rows with point-in-time windowed features and group fan-out features | match |  |
| model | Baseline: Block placements below a viewability threshold. Production: Pre-bid viewability model on placement and page features, plus attention-time estimator calibrated on panel e… | Calibrated logistic regression baseline against a regularised gradient-boosted challenger | adapt | Replace the kit's models with the blueprint's: Pre-bid viewability model on placement and page features, plus attention-time estimator calibrated… |
| serving | Online decision inside about 100 milliseconds (p99 80 ms) | Offline scripts only: no scoring service, deadline, feature store or load test | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Placement features (cache) | None. Runs locally on synthetic card-authorisation data with pandas and scikit-learn | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
