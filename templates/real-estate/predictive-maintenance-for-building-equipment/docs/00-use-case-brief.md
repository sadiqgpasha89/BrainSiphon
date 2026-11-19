# Predictive Maintenance for Building Equipment: use-case brief

> Generated from the blueprint `real-estate/predictive-maintenance-for-building-equipment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Predictive Maintenance for Building Equipment · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict failures of building equipment such as chillers, boilers and lifts from sensor data so repairs happen before breakdowns. The system has to run as a scheduled batch job, inside these limits: Alerts raised with at least 7 days of lead time, Safety-critical equipment such as lifts and fire pumps takes priority and Each alert shows the sensors and trend behind it.

**Why it is hard.** The obvious approach is detection at or after failure, and it fails because a late alert cannot prevent the breakdown and only confirms it. The second trap is in "Context": the real signal is operating mode, load and outside temperature, while teams usually reach for fixed raw thresholds.

**Scale and stakes.** At 10 million users this is about 72.0M model-touching events a day, 833 requests per second on average and 833 at peak, at an estimated $2.5K a month. A mistake is expensive in the way maintenance cost measures it.

**What success looks like.** Offline: Lead-time recall and False alarm rate. Online: Unplanned downtime and Maintenance cost. The launch is judged on "Unplanned downtime" while "Maintenance cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict failures of building equipment such as chillers, boilers and lifts from sensor data so repairs happen before breakdowns.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{t}-t)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \hat{t} | The predicted time until the equipment fails. |
| t | The actual time until failure. |

**Hard constraints**

- Alerts raised with at least 7 days of lead time
- Safety-critical equipment such as lifts and fire pumps takes priority
- Each alert shows the sensors and trend behind it
- Work scheduled inside agreed maintenance windows

## The approach in one paragraph

Start with calendar-based maintenance and alarm thresholds, because it is typical. Then earn the move to remaining-useful-life and anomaly models per equipment class with context features and a work-order integration, and only if it beats the baseline on Lead-time recall and False alarm rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Vibration trend | Slope of RMS vibration over the last 14 days. Bearings and rotors show wear as rising vibration. Guard against: sensors loosen and drift, so calibrate per sensor. |
| Add Efficiency drift | Rise in kilowatts per ton of cooling or per unit of heat at similar load. Degradation shows up as a loss of efficiency. Guard against: weather changes the baseline, so normalise by load and temperature. |
| Add Runtime hours | Hours since the last service. A simple, reliable age measure. Guard against: logging gaps and meter replacements reset the counter. |
| Run it as one pipeline | Sensor stream (BMS gateway), Feature builder (Flink), Health model (time-series model), Alert ranker (rules), Work orders (CMMS), Technician app (mobile) and Outcome log (lakehouse). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle sensor drift | Calibrate against reference readings and monitor per-sensor baselines. |

**Deliberately not doing**

- Equipment name: A label that differs by site and does not predict failure.
- Installer: Weakly related to wear once the model and age are known.
- Building colour: No physical link to equipment condition.

**How the approach is proven**

Prove it offline on Lead-time recall and False alarm rate using time-ordered splits, then online on "Unplanned downtime" with "Maintenance cost" as the guardrail. Watch for: Maintenance resets the history, so a repaired machine looks as though it had no problem and Few failures in the data make any evaluation unstable.

## Baseline and production design

- **Baseline (build this first):** Calendar-based maintenance and alarm thresholds, because it is typical.
- **Production design:** Remaining-useful-life and anomaly models per equipment class with context features and a work-order integration.

## Why AI, and why this kind

**Why AI.** Predict failures of building equipment such as chillers, boilers and lifts from sensor data so repairs happen before breakdowns. The evidence that separates good from bad outcomes (Vibration trend, Efficiency drift, Runtime hours) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "detection at or after failure" are what teams reach for first, and they fail because A late alert cannot prevent the breakdown and only confirms it. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Remaining-useful-life and anomaly models per equipment class with context features and a work-order integration.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Vibration trend, Efficiency drift, Runtime hours and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Calendar-based maintenance and alarm thresholds, because it is typical | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Remaining-useful-life and anomaly models per equipment class with context features and a work-order integration | chosen | Meets the run-window envelope at $0.0012 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unplanned downtime) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Maintenance resets the history, so a repaired machine looks as though it had no problem.
- Evaluation trap: Few failures in the data make any evaluation unstable.
- Sensor drift: sensor readings drift over time and normal behaviour looks like a fault.
- Mode change: equipment changes from summer to winter mode and readings shift.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
