# Grid Carbon Intensity Forecasting: use-case brief

> Generated from the blueprint `energy/grid-carbon-intensity-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Grid Carbon Intensity Forecasting · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast the carbon intensity of grid electricity by region and hour so flexible loads, charging and reporting use cleaner times and numbers. The system has to run as a scheduled batch job, inside these limits: Hourly forecast for 48 hours, Both average and marginal intensity reported with definitions and Methodology documented.

**Why it is hard.** The obvious approach is one number called carbon intensity, and it fails because they answer different questions. The second trap is in "Inputs": the real signal is generation mix forecasts and imports, while teams usually reach for history only.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 3.3K at peak, at an estimated $9.0K a month. A mistake is expensive in the way reporting corrections measures it.

**What success looks like.** Offline: Intensity error, Coverage of intervals and Ranking of cleanest hours. Online: Emissions avoided by shifting, Reporting corrections and Forecast error at peaks. The launch is judged on "Emissions avoided by shifting" while "Reporting corrections" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast the carbon intensity of grid electricity by region and hour so flexible loads, charging and reporting use cleaner times and numbers.

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

- Hourly forecast for 48 hours
- Both average and marginal intensity reported with definitions
- Methodology documented
- Daily run for 40 regions

## The approach in one paragraph

Start with persistence of the last published intensity with a time-of-day profile, because it is the simple benchmark. Then earn the move to a dispatch-aware model that forecasts the generation mix and derives average and marginal intensity with intervals and a documented method, and only if it beats the baseline on Intensity error and Coverage of intervals after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Renewable forecast | Wind and solar generation forecasts. Mix driver. Guard against: from forecasts. |
| Add Demand forecast | Forecast load. Dispatch driver. Guard against: from load models. |
| Add Interconnector flows | Imports and exports. Mix shift. Guard against: from operators. |
| Run it as one pipeline | Generation and demand feeds (operator data), Mix forecast (dispatch model), Intensity calculation (emission factors), Interval estimate (ensembles), Publish (API and reports), Consumer use (flexible load systems) and Accuracy tracking (weekly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing interconnector data | Fallbacks and a flag. |

**Deliberately not doing**

- Region name: an identifier.
- Report author: irrelevant.
- Chart colour: irrelevant.

**How the approach is proven**

Prove it offline on Intensity error, Coverage of intervals and Ranking of cleanest hours using time-ordered splits, then online on "Emissions avoided by shifting" with "Reporting corrections" as the guardrail. Watch for: Mixing average and marginal intensity, Using history alone and Undocumented methods.

## Baseline and production design

- **Baseline (build this first):** Persistence of the last published intensity with a time-of-day profile, because it is the simple benchmark.
- **Production design:** A dispatch-aware model that forecasts the generation mix and derives average and marginal intensity with intervals and a documented method.

## Why AI, and why this kind

**Why AI.** Forecast the carbon intensity of grid electricity by region and hour so flexible loads, charging and reporting use cleaner times and numbers. The evidence that separates good from bad outcomes (Renewable forecast, Demand forecast, Interconnector flows) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one number called carbon intensity" are what teams reach for first, and they fail because they answer different questions. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A dispatch-aware model that forecasts the generation mix and derives average and marginal intensity with intervals and a documented method.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Renewable forecast, Demand forecast, Interconnector flows and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Persistence of the last published intensity with a time-of-day profile, because it is the simple benchmark | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A dispatch-aware model that forecasts the generation mix and derives average and marginal intensity with intervals and a documented method | chosen | Meets the run-window envelope at $0.0010 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Emissions avoided by shifting) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Mixing average and marginal intensity.
- Evaluation trap: Using history alone.
- Missing interconnector data: imports are unknown.
- Factor update: emission factors are revised.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
