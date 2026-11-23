# Remaining Useful Life Prediction for Rotating Equipment: use-case brief

> Generated from the blueprint `manufacturing/remaining-useful-life-rotating-equipment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Remaining Useful Life Prediction for Rotating Equipment · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate the remaining useful life of pumps, motors, gearboxes and fans from vibration, temperature and operating history so replacements are planned before failure. The system has to run as a scheduled batch job, inside these limits: Lead time of at least 14 days for planned work, Predictions with intervals and Failure modes labelled in the CMMS.

**Why it is hard.** The obvious approach is replacement dates, and it fails because parts are often replaced early. The second trap is in "Censoring": the real signal is assets still running are censored observations, while teams usually reach for dropping unfailed assets.

**Scale and stakes.** At 10 million users this is about 72.0M model-touching events a day, 833 requests per second on average and 833 at peak, at an estimated $5.3K a month. A mistake is expensive in the way planned versus emergency repairs measures it.

**What success looks like.** Offline: Error in remaining life at 14 and 30 days, Calibration of intervals and Early warning rate on held-out failures. Online: Unplanned downtime hours, Planned versus emergency repairs and Spare parts held. The launch is judged on "Unplanned downtime hours" while "Planned versus emergency repairs" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate the remaining useful life of pumps, motors, gearboxes and fans from vibration, temperature and operating history so replacements are planned before failure.

**Training objective.** `\mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Lead time of at least 14 days for planned work
- Predictions with intervals
- Failure modes labelled in the CMMS
- Retrain per asset class
- Scoring of 100K assets daily

## The approach in one paragraph

Start with a time-based replacement schedule from manufacturer guidance, because it is the policy the model must improve. Then earn the move to a survival or degradation model per asset class using condition indicators and load history, with prediction intervals, calibrated risk by horizon and a planner view ranking work by risk and criticality, and only if it beats the baseline on Error in remaining life at 14 and 30 days and Calibration of intervals after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Vibration band energy trend | Trend in bearing and gear frequency band energy. Degradation sign. Guard against: per asset class and speed. |
| Add Temperature rise over load | Temperature minus the load-expected value. Friction and lubrication. Guard against: condition on load. |
| Add Operating hours at high load | Hours above the rated load fraction. Wear accumulation. Guard against: from the historian. |
| Run it as one pipeline | Condition data capture (historian), Indicator extraction (signal processing), Life model (survival and degradation model), Interval and calibration (conformal calibration), Risk ranking (criticality join) and Work order proposal (CMMS), with Failure feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle few failures | Pool by asset class and use physics priors. |

**Deliberately not doing**

- Asset tag: an identifier.
- Vendor name alone: confounded with age.
- Technician name: not a failure cause.

**How the approach is proven**

Prove it offline on Error in remaining life at 14 and 30 days, Calibration of intervals and Early warning rate on held-out failures using time-ordered splits, then online on "Unplanned downtime hours" with "Planned versus emergency repairs" as the guardrail. Watch for: Dropping censored assets, Using replacement date as failure and Random splits across assets over time.

## Baseline and production design

- **Baseline (build this first):** A time-based replacement schedule from manufacturer guidance, because it is the policy the model must improve.
- **Production design:** A survival or degradation model per asset class using condition indicators and load history, with prediction intervals, calibrated risk by horizon and a planner view ranking work by risk and criticality.

## Why AI, and why this kind

**Why AI.** Estimate the remaining useful life of pumps, motors, gearboxes and fans from vibration, temperature and operating history so replacements are planned before failure. The evidence that separates good from bad outcomes (Vibration band energy trend, Temperature rise over load, Operating hours at high load) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "replacement dates" are what teams reach for first, and they fail because parts are often replaced early. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A survival or degradation model per asset class using condition indicators and load history, with prediction intervals, calibrated risk by horizon and a planner view ranking work by risk and criticality.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Vibration band energy trend, Temperature rise over load, Operating hours at high load and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A time-based replacement schedule from manufacturer guidance, because it is the policy the model must improve | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A survival or degradation model per asset class using condition indicators and load history, with prediction intervals, calibrated risk by horizon and a planner view ranking work by risk and criticality | chosen | Meets the run-window envelope at $0.0025 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unplanned downtime hours) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Dropping censored assets.
- Evaluation trap: Using replacement date as failure.
- Few failures: little data for rare assets.
- Sensor fault: indicators jump.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
