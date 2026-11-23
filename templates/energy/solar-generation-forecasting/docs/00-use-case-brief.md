# Solar Generation Forecasting: use-case brief

> Generated from the blueprint `energy/solar-generation-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Solar Generation Forecasting · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast solar generation per plant and for distributed rooftop fleets from irradiance forecasts, satellite cloud motion and plant telemetry so balancing and curtailment decisions improve. The system has to run as a scheduled batch job, inside these limits: Forecasts at 15-minute resolution up to 48 hours, Nowcasts for the next 4 hours from satellite and Quantile output.

**Why it is hard.** The obvious approach is one model for all horizons, and it fails because cloud motion matters near term and weather models matter later. The second trap is in "Capacity": the real signal is available capacity after curtailment and outages, while teams usually reach for nameplate.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 3.3K at peak, at an estimated $23.5K a month. A mistake is expensive in the way curtailment measures it.

**What success looks like.** Offline: Skill against persistence, Ramp detection and Quantile coverage. Online: Imbalance cost, Curtailment and Forecast error at ramps. The launch is judged on "Imbalance cost" while "Curtailment" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast solar generation per plant and for distributed rooftop fleets from irradiance forecasts, satellite cloud motion and plant telemetry so balancing and curtailment decisions improve.

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

- Forecasts at 15-minute resolution up to 48 hours
- Nowcasts for the next 4 hours from satellite
- Quantile output
- Clipped to plant capacity
- 20K plants

## The approach in one paragraph

Start with clear-sky output scaled by the day-ahead cloud forecast, because it is the standard approach. Then earn the move to a blended forecaster with a satellite-based nowcast model and a gradient boosting day-ahead model on weather forecasts and plant availability, with quantiles and capacity clipping, and only if it beats the baseline on Skill against persistence and Ramp detection after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Forecast irradiance | Numerical weather model irradiance. Day-ahead driver. Guard against: from the weather feed. |
| Add Satellite cloud motion | Cloud displacement from images. Nowcast driver. Guard against: computed from imagery. |
| Add Plant availability | Inverter and string outages. Capacity limit. Guard against: from plant telemetry. |
| Run it as one pipeline | Weather and satellite ingestion (forecast feeds), Cloud motion nowcast (vision model), Day-ahead model (gradient boosting), Blend by horizon (stacking), Capacity clipping (plant status), Forecast publish (market and control systems) and Accuracy tracking (daily). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle fast cloud edge | Nowcast updates and ramp alerts. |

**Deliberately not doing**

- Plant owner name: irrelevant.
- Inverter serial: an identifier.
- Report format: an artefact.

**How the approach is proven**

Prove it offline on Skill against persistence, Ramp detection and Quantile coverage using time-ordered splits, then online on "Imbalance cost" with "Curtailment" as the guardrail. Watch for: Nameplate capacity as truth, One model for all horizons and Ignoring cloud motion.

## Baseline and production design

- **Baseline (build this first):** Clear-sky output scaled by the day-ahead cloud forecast, because it is the standard approach.
- **Production design:** A blended forecaster with a satellite-based nowcast model and a gradient boosting day-ahead model on weather forecasts and plant availability, with quantiles and capacity clipping.

## Why AI, and why this kind

**Why AI.** Forecast solar generation per plant and for distributed rooftop fleets from irradiance forecasts, satellite cloud motion and plant telemetry so balancing and curtailment decisions improve. The evidence that separates good from bad outcomes (Forecast irradiance, Satellite cloud motion, Plant availability) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one model for all horizons" are what teams reach for first, and they fail because cloud motion matters near term and weather models matter later. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A blended forecaster with a satellite-based nowcast model and a gradient boosting day-ahead model on weather forecasts and plant availability, with quantiles and capacity clipping.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Forecast irradiance, Satellite cloud motion, Plant availability and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Clear-sky output scaled by the day-ahead cloud forecast, because it is the standard approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A blended forecaster with a satellite-based nowcast model and a gradient boosting day-ahead model on weather forecasts and plant availability, with quantiles and capacity clipping | chosen | Meets the run-window envelope at $0.0027 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Imbalance cost) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Nameplate capacity as truth.
- Evaluation trap: One model for all horizons.
- Fast cloud edge: ramps change within minutes.
- Plant outage: capacity drops without notice.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
