# Wind Power Forecasting: use-case brief

> Generated from the blueprint `energy/wind-power-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Wind Power Forecasting · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast wind farm output from weather forecasts, turbine status and local measurements so schedules, reserves and bids reflect real power. The system has to run as a scheduled batch job, inside these limits: 15-minute resolution for 72 hours ahead, Quantile output for ramps and Accounts for turbine availability and curtailment.

**Why it is hard.** The obvious approach is the manufacturer curve, and it fails because real turbines deviate with wake and wear. The second trap is in "Error": the real signal is ramp timing and size, while teams usually reach for mean error.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 3.3K at peak, at an estimated $9.0K a month. A mistake is expensive in the way reserve held measures it.

**What success looks like.** Offline: Error against persistence, Ramp detection and Quantile coverage. Online: Imbalance cost, Reserve held and Forecast error at ramps. The launch is judged on "Imbalance cost" while "Reserve held" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast wind farm output from weather forecasts, turbine status and local measurements so schedules, reserves and bids reflect real power.

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

- 15-minute resolution for 72 hours ahead
- Quantile output for ramps
- Accounts for turbine availability and curtailment
- Refresh when new weather runs arrive
- 1K wind farms

## The approach in one paragraph

Start with the manufacturer power curve applied to the forecast wind speed, because it is the quick benchmark. Then earn the move to a gradient boosting or neural model on multi-model weather ensembles with learned power curves, availability inputs and quantile outputs focused on ramps, and only if it beats the baseline on Error against persistence and Ramp detection after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Wind forecast at hub height | Forecast speed and direction. Main driver. Guard against: from weather models. |
| Add Turbine availability | Number of turbines operating. Capacity. Guard against: from SCADA. |
| Add Wake and direction effects | Direction-dependent losses. Output shape. Guard against: learned. |
| Run it as one pipeline | Weather ensemble ingestion (forecast feeds), Site feature build (hub height interpolation), Power model (gradient boosting), Availability and curtailment filter (rules), Quantile output (model) and Publish to scheduling (market systems), with Ramp review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle storm cut-out | Cut-out features and a storm flag. |

**Deliberately not doing**

- Turbine name: an identifier.
- Report author: irrelevant.
- Log timestamp format: an artefact.

**How the approach is proven**

Prove it offline on Error against persistence, Ramp detection and Quantile coverage using time-ordered splits, then online on "Imbalance cost" with "Reserve held" as the guardrail. Watch for: Manufacturer curve only, Ignoring availability and Mean error as the headline.

## Baseline and production design

- **Baseline (build this first):** The manufacturer power curve applied to the forecast wind speed, because it is the quick benchmark.
- **Production design:** A gradient boosting or neural model on multi-model weather ensembles with learned power curves, availability inputs and quantile outputs focused on ramps.

## Why AI, and why this kind

**Why AI.** Forecast wind farm output from weather forecasts, turbine status and local measurements so schedules, reserves and bids reflect real power. The evidence that separates good from bad outcomes (Wind forecast at hub height, Turbine availability, Wake and direction effects) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the manufacturer curve" are what teams reach for first, and they fail because real turbines deviate with wake and wear. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A gradient boosting or neural model on multi-model weather ensembles with learned power curves, availability inputs and quantile outputs focused on ramps.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Wind forecast at hub height, Turbine availability, Wake and direction effects and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: The manufacturer power curve applied to the forecast wind speed, because it is the quick benchmark | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A gradient boosting or neural model on multi-model weather ensembles with learned power curves, availability inputs and quantile outputs focused on ramps | chosen | Meets the run-window envelope at $0.0010 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Imbalance cost) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Manufacturer curve only.
- Evaluation trap: Ignoring availability.
- Storm cut-out: turbines shut down at high wind.
- Icing: blades lose output in cold humid weather.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
