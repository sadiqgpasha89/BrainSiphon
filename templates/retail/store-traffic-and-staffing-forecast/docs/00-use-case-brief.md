# Store Traffic & Staffing Forecast: use-case brief

> Generated from the blueprint `retail/store-traffic-and-staffing-forecast` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Store Traffic & Staffing Forecast · **Domain:** retail · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast footfall and transactions per store-hour to build schedules that match labour to demand. The system has to run as a scheduled batch job, inside these limits: Labour laws on scheduling notice, Break rules and Service-level targets.

**Why it is hard.** The obvious approach is daily forecasts spread evenly, and it fails because peaks within the day drive service failures. The second trap is in "Constraints": the real signal is forecast feeds an optimiser with labour rules, while teams usually reach for forecast-only deliverable.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way wait time breaches measures it.

**What success looks like.** Offline: Hourly WAPE and Service-level breach simulation. Online: Labour cost percent of sales and Wait time breaches. The launch is judged on "Labour cost percent of sales" while "Wait time breaches" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast footfall and transactions per store-hour to build schedules that match labour to demand.

**Training objective.** `\mathcal{L}=\sum_t\rho_{0.5}(y_t-\hat y_t)+\lambda\,\mathrm{ScheduleChurn}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_{0.5} | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ScheduleChurn} | Penalty for changing staff schedules that were already published. |

**Hard constraints**

- Labour laws on scheduling notice
- Break rules
- Service-level targets
- Weekly schedule publication

## The approach in one paragraph

Start with same-hour-last-week with seasonal factor. Then earn the move to hierarchical gradient-boosted hourly model with event covariates feeding a shift-scheduling MILP respecting labour rules, and only if it beats the baseline on Hourly WAPE and Service-level breach simulation after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Hourly seasonality profile | Day-of-week by hour baseline. Rhythm. Guard against: decay old seasons. |
| Add Local event calendar | Sports, concerts, holidays nearby. Demand shocks. Guard against: known in advance. |
| Add Weather forecast | Forecast rain or heat at store. Footfall shifts. Guard against: use forecast not actual. |
| Run it as one pipeline | Traffic counters and POS (stream), Feature builder (calendar and weather), Hourly forecaster (LightGBM), Demand-to-labour converter (service curves), Shift optimiser (MILP) and Actuals comparison (KPI), with Manager review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle counter sensor outage | Imputation and sensor health flags. |

**Deliberately not doing**

- Store manager: not demand.
- Previous week's staffing: feeds back on service.

**How the approach is proven**

Prove it offline on Hourly WAPE and Service-level breach simulation using time-ordered splits, then online on "Labour cost percent of sales" with "Wait time breaches" as the guardrail. Watch for: Using actual weather instead of forecast and Evaluating at daily instead of hourly level.

## Baseline and production design

- **Baseline (build this first):** Same-hour-last-week with seasonal factor.
- **Production design:** Hierarchical gradient-boosted hourly model with event covariates feeding a shift-scheduling MILP respecting labour rules.

## Why AI, and why this kind

**Why AI.** Forecast footfall and transactions per store-hour to build schedules that match labour to demand. The evidence that separates good from bad outcomes (Hourly seasonality profile, Local event calendar, Weather forecast) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "daily forecasts spread evenly" are what teams reach for first, and they fail because peaks within the day drive service failures. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Hierarchical gradient-boosted hourly model with event covariates feeding a shift-scheduling MILP respecting labour rules.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Hourly seasonality profile, Local event calendar, Weather forecast and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Same-hour-last-week with seasonal factor | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hierarchical gradient-boosted hourly model with event covariates feeding a shift-scheduling MILP respecting labour rules | chosen | Meets the run-window envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Labour cost percent of sales) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using actual weather instead of forecast.
- Evaluation trap: Evaluating at daily instead of hourly level.
- Counter sensor outage: hours of footfall are missing so the forecaster trains on gaps.
- Last-minute call-outs: schedule infeasible.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
