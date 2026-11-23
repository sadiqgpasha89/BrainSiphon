# Road Weather Hazard Alerting: use-case brief

> Generated from the blueprint `public-safety/road-weather-hazard-alerting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Road Weather Hazard Alerting · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast ice, flooding and low visibility on road segments from sensors and weather models and alert maintenance teams and drivers in time to treat or warn. The system has to run interactively, within a few seconds, inside these limits: Segment forecasts for the next 6 hours, Alerts to winter service within 10 minutes of threshold and Message signs set by named operators.

**Why it is hard.** The obvious approach is air temperature alone, and it fails because pavement temperature differs. The second trap is in "Action": the real signal is treatment and warning plans, while teams usually reach for a forecast.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 20.0K at peak, at an estimated $16.7K a month. A mistake is expensive in the way salt use measures it.

**What success looks like.** Offline: Ice event recall and lead time, False alert rate and Calibration. Online: Ice-related crashes, Salt use and Time to treat. The launch is judged on "Ice-related crashes" while "Salt use" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast ice, flooding and low visibility on road segments from sensors and weather models and alert maintenance teams and drivers in time to treat or warn.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Segment forecasts for the next 6 hours
- Alerts to winter service within 10 minutes of threshold
- Message signs set by named operators
- Sensor failures detected
- 20K road segments

## The approach in one paragraph

Start with weather service forecasts and fixed treatment triggers, because they are the standard winter service rules. Then earn the move to a segment-level surface model with sensor assimilation and quantile outputs that triggers treatment suggestions and message sign proposals for operator approval, and only if it beats the baseline on Ice event recall and lead time and False alert rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Pavement temperature forecast | Predicted surface temperature. Ice risk. Guard against: from models. |
| Add Precipitation type and timing | Rain, snow and freezing rain. Hazard. Guard against: from radar. |
| Add Surface moisture | Wet or dry surface. Ice risk. Guard against: from sensors. |
| Run it as one pipeline | Sensor and weather ingestion (road weather stations), Surface model (physics and learning), Hazard classification (model), Alert and treatment suggestion (rules), Operator approval (traffic centre), Sign and crew messages (operations) and Verification (post event). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle sensor outage | Neighbour inference and a flag. |

**Deliberately not doing**

- Sensor name: an identifier.
- Operator name: irrelevant.
- Alert wording: an artefact.

**How the approach is proven**

Prove it offline on Ice event recall and lead time, False alert rate and Calibration using time-ordered splits, then online on "Ice-related crashes" with "Salt use" as the guardrail. Watch for: Air temperature as the only input, Forecasts with no actions and Trusting failing sensors.

## Baseline and production design

- **Baseline (build this first):** Weather service forecasts and fixed treatment triggers, because they are the standard winter service rules.
- **Production design:** A segment-level surface model with sensor assimilation and quantile outputs that triggers treatment suggestions and message sign proposals for operator approval.

## Why AI, and why this kind

**Why AI.** Forecast ice, flooding and low visibility on road segments from sensors and weather models and alert maintenance teams and drivers in time to treat or warn. The evidence that separates good from bad outcomes (Pavement temperature forecast, Precipitation type and timing, Surface moisture) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "air temperature alone" are what teams reach for first, and they fail because pavement temperature differs. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A segment-level surface model with sensor assimilation and quantile outputs that triggers treatment suggestions and message sign proposals for operator approval.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Pavement temperature forecast, Precipitation type and timing, Surface moisture and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Weather service forecasts and fixed treatment triggers, because they are the standard winter service rules | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A segment-level surface model with sensor assimilation and quantile outputs that triggers treatment suggestions and message sign proposals for operator approval | chosen | Meets the 2500 ms envelope at $0.0019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Ice-related crashes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Air temperature as the only input.
- Evaluation trap: Forecasts with no actions.
- Sensor outage: a station reports nothing.
- Micro-climate: a bridge freezes before the road.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
