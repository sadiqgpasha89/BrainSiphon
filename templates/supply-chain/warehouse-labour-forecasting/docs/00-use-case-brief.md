# Warehouse Labour Demand Forecasting: use-case brief

> Generated from the blueprint `supply-chain/warehouse-labour-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Warehouse Labour Demand Forecasting · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast labour hours needed by task and shift from order inflow and process mix to plan staffing and overtime. The system has to run as a scheduled batch job, inside these limits: Shift notice rules, Skill mix and Peak season variability.

**Why it is hard.** The obvious approach is time series of hours alone, and it fails because hours depend on order mix. The second trap is in "Productivity": the real signal is learned productivity rates by task and experience, while teams usually reach for static standards.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way labour cost per unit measures it.

**What success looks like.** Offline: Weighted pinball loss on hours and Overtime hours in simulation. Online: Overtime percentage and Labour cost per unit. The launch is judged on "Overtime percentage" while "Labour cost per unit" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast labour hours needed by task and shift from order inflow and process mix to plan staffing and overtime.

**Training objective.** `\mathcal{L}=\sum_t\rho_{0.7}(y_t-\hat y_t)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_{0.7} | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Shift notice rules
- Skill mix
- Peak season variability
- Weekly planning

## The approach in one paragraph

Start with hours = orders x fixed standard. Then earn the move to order-driven workload model with learned productivity and quantile hours forecasts feeding the staffing optimiser, and only if it beats the baseline on Weighted pinball loss on hours and Overtime hours in simulation after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Forecast order lines by type | Lines by category. Workload. Guard against: forecast. |
| Add Task standard times | Engineered times. Conversion. Guard against: standards version. |
| Add Staffing experience mix | Share of new workers. Productivity. Guard against: roster. |
| Run it as one pipeline | Order forecast (planning), Workload converter (standards), Productivity model (regression), Hours forecaster (quantile GBDT), Staffing optimiser (roster solver), Manager approval (human) and Actual hours (WMS). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new automation reduces labour needs | Change-point detection and process-version flags. |

**Deliberately not doing**

- Day of month: none.
- Employee ID: personal.

**How the approach is proven**

Prove it offline on Weighted pinball loss on hours and Overtime hours in simulation using time-ordered splits, then online on "Overtime percentage" with "Labour cost per unit" as the guardrail. Watch for: Forecasting hours that were constrained by staffing and Ignoring productivity ramp.

## Baseline and production design

- **Baseline (build this first):** Hours = orders x fixed standard.
- **Production design:** Order-driven workload model with learned productivity and quantile hours forecasts feeding the staffing optimiser.

## Why AI, and why this kind

**Why AI.** Forecast labour hours needed by task and shift from order inflow and process mix to plan staffing and overtime. The evidence that separates good from bad outcomes (Forecast order lines by type, Task standard times, Staffing experience mix) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "time series of hours alone" are what teams reach for first, and they fail because hours depend on order mix. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Order-driven workload model with learned productivity and quantile hours forecasts feeding the staffing optimiser.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Forecast order lines by type, Task standard times, Staffing experience mix and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Hours = orders x fixed standard | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Order-driven workload model with learned productivity and quantile hours forecasts feeding the staffing optimiser | chosen | Meets the run-window envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Overtime percentage) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Forecasting hours that were constrained by staffing.
- Evaluation trap: Ignoring productivity ramp.
- New automation reduces labour needs: model overestimates.
- Peak-season temporary workers: low productivity.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
