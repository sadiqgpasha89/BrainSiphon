# Urban Air Quality Forecasting: use-case brief

> Generated from the blueprint `public-sector/urban-air-quality-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Urban Air Quality Forecasting · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast air pollutants by neighbourhood for the next days from sensors, traffic and weather so health alerts and traffic measures are timely. The system has to run as a scheduled batch job, inside these limits: Hourly forecast for 72 hours, Reference-grade and low-cost sensors reconciled and Health alerts reviewed by public health staff.

**Why it is hard.** The obvious approach is raw low-cost readings, and it fails because low-cost sensors drift with humidity. The second trap is in "Use": the real signal is health alerts and policy measures, while teams usually reach for a number on a map.

**Scale and stakes.** At 10 million users this is about 72.0M model-touching events a day, 833 requests per second on average and 833 at peak, at an estimated $3.5K a month. A mistake is expensive in the way exceedance days measures it.

**What success looks like.** Offline: Error by pollutant and horizon, Threshold exceedance detection and Coverage of intervals. Online: Alert lead time, Exceedance days and Coverage of neighbourhoods. The launch is judged on "Alert lead time" while "Exceedance days" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast air pollutants by neighbourhood for the next days from sensors, traffic and weather so health alerts and traffic measures are timely.

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

- Hourly forecast for 72 hours
- Reference-grade and low-cost sensors reconciled
- Health alerts reviewed by public health staff
- Uncertainty shown
- 500 sensors

## The approach in one paragraph

Start with persistence of today's readings with a seasonal profile, because it is the simple benchmark. Then earn the move to a calibrated sensor fusion with a forecasting model on weather and activity data, neighbourhood maps with uncertainty and an alert workflow reviewed by public health staff, and only if it beats the baseline on Error by pollutant and horizon and Threshold exceedance detection after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Weather forecast | Wind, temperature and stability. Dispersion. Guard against: from weather models. |
| Add Traffic and emission activity | Traffic flow and industrial activity. Source. Guard against: from traffic and permits. |
| Add Recent concentrations | Readings at nearby sensors. Anchor. Guard against: calibrated. |
| Run it as one pipeline | Sensor and reference data (monitoring network), Calibration (regression), Feature build (weather and traffic joins), Forecast model (gradient boosting), Uncertainty estimate (quantile heads) and Accuracy tracking (monthly), with Alert review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle sensor drift | Calibration checks against references. |

**Deliberately not doing**

- Sensor name: an identifier.
- Report author: irrelevant.
- Colour scale: an artefact.

**How the approach is proven**

Prove it offline on Error by pollutant and horizon, Threshold exceedance detection and Coverage of intervals using time-ordered splits, then online on "Alert lead time" with "Exceedance days" as the guardrail. Watch for: Using raw low-cost readings, Map-only outputs and Sensors in selected areas only.

## Baseline and production design

- **Baseline (build this first):** Persistence of today's readings with a seasonal profile, because it is the simple benchmark.
- **Production design:** A calibrated sensor fusion with a forecasting model on weather and activity data, neighbourhood maps with uncertainty and an alert workflow reviewed by public health staff.

## Why AI, and why this kind

**Why AI.** Forecast air pollutants by neighbourhood for the next days from sensors, traffic and weather so health alerts and traffic measures are timely. The evidence that separates good from bad outcomes (Weather forecast, Traffic and emission activity, Recent concentrations) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw low-cost readings" are what teams reach for first, and they fail because low-cost sensors drift with humidity. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A calibrated sensor fusion with a forecasting model on weather and activity data, neighbourhood maps with uncertainty and an alert workflow reviewed by public health staff.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Weather forecast, Traffic and emission activity, Recent concentrations and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Persistence of today's readings with a seasonal profile, because it is the simple benchmark | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A calibrated sensor fusion with a forecasting model on weather and activity data, neighbourhood maps with uncertainty and an alert workflow reviewed by public health staff | chosen | Meets the run-window envelope at $0.0016 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Alert lead time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using raw low-cost readings.
- Evaluation trap: Map-only outputs.
- Sensor drift: low-cost readings degrade.
- Wildfire smoke: pollution arrives from outside.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
