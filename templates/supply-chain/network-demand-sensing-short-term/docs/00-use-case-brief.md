# Short-Term Demand Sensing: use-case brief

> Generated from the blueprint `supply-chain/network-demand-sensing-short-term` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Short-Term Demand Sensing · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** A distribution network plans from a monthly statistical forecast, and that forecast is blind to what happened this week: a heatwave moved beverages, a competitor's promotion pulled sales, a large order landed from a key customer. The demand planner who owns each product family wants a corrected forecast for the next 1 to 14 days, for every product at every location, waiting for them each morning, along with a range, not just a single number. That correction decides where inventory is moved, what is expedited and what is cancelled. The planners still make the final call, so every override they apply has to be recorded and its value measured.

**Why it is hard.** Most of the apparent signal is aftermath. Point-of-sale feeds arrive late and partners differ, so a missing day looks like zero demand. Sales during a supply restriction understate demand, and a model trained on raw sales learns that demand collapsed when stock was rationed. Signals such as promotions and weather must be taken as they were known at forecast time, not as they finally happened, or the backtest is optimistic. Error at an aggregate level can be a fifth of error at the product-location level because mistakes cancel, so it is easy to report accuracy that planners do not experience. And forecasts that do not add up to the plan hierarchy are ignored by the people they are meant to help.

**Scale and stakes.** The nightly refresh covers 5 million series and has to finish inside a two-hour window so planners have it when they start work. Compute is modest, two Spark executors, with about $1.7K a month and $0.018 per thousand forecasts, and 1.7 TB retained for 400 days. The value sits in the decisions it changes: expedited shipments avoided, and stock placed where demand is actually going to be rather than where last month said it would be. A forecast that is wrong in a visible way costs planner trust, which is far harder to rebuild than model accuracy.

**What success looks like.** Offline, weighted MAPE at the 1 to 14 day horizons and, more importantly, forecast value added over the statistical baseline measured at product-location level, not in aggregate. Online, the launch is judged on forecast accuracy at lag 2, with expedite shipments avoided as the business guardrail. The nightly run completes in its window, forecasts reconcile to the plan hierarchy, quantile bands are calibrated, and planner overrides are audited with their effect on error.

## Objective, loss and constraints

**Business objective.** Blend point-of-sale, order and external signals into 1-14 day demand forecasts that react to what is actually happening this week.

**Training objective.** `\mathcal{L}=\sum_{h=1}^{14}\sum_q\rho_q\!\left(y_{t+h}-\hat y_{t+h}^{(q)}\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{h=1}^{14} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_q | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. (one value per quantile level q) |
| y_{t+h} | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t and forecast step h) |
| \hat{y}_{t+h}^{(q)} | The model's prediction of y. (one value per time step or token t and forecast step h) |

**Hard constraints**

- Nightly refresh for 5M series
- Latency of POS feeds
- Hierarchical consistency
- Planner overrides audited

## The approach in one paragraph

Keep the statistical baseline forecast with its seasonal factor as the floor, because it is what planners already use and it defines the value added. Layer a gradient-boosted sensing model on recent signals, open orders, sell-through momentum, known events and same-weekday history, that outputs quantiles for each of the next 14 days, then reconcile its output to the plan hierarchy with MinT so totals agree. Everything is judged at product-location level and as forecast value added, and any signal that was not known at the forecast origin is excluded from both training and backtest.

**Moves**

| Move | Detail |
|---|---|
| Define the forecast origin and freeze what was known | Every feature is built from a snapshot at the forecast origin: the open order book as it stood, the promotion plan as of that day, and the external forecast as published then, never the observed value. |
| Build signals planners can recognise | Open orders by product, the ratio of 7-day to 28-day velocity with calendar days aligned, same-weekday history from days on or before the origin and a planned-promotion flag treated as probabilistic until a week out. |
| Separate demand from sales | Add constrained-demand flags so periods of allocation or rationing are not read as demand, and adjust the target accordingly. |
| Forecast quantiles, not points | Train with the pinball loss for several quantiles across the 14 horizons and publish a P90 band beside the point forecast, so planners see the risk in a promotion that may be cancelled. |
| Reconcile before anyone sees it | Use MinT to make product, location and family totals agree with the plan, so the sensing output can be compared with the plan line by line. |
| Treat overrides as data | Record each planner override with a reason, compare its error against the model's, and use the pattern to decide where the model needs a better signal. |

**Deliberately not doing**

- Use year-over-year growth rate or category growth: they are too slow to matter inside 14 days and are already in the level of the series.
- Use the planner identifier as a feature: it carries no demand information and only records who last edited a plan.
- Reuse the monthly statistical forecast for the short horizon: it ignores this week's signals, which are the whole point.
- Report accuracy at aggregate level only: errors cancel and the figure bears no relation to what a planner sees at the product-location level.

**How the approach is proven**

Offline, a rolling-origin backtest that rebuilds every feature from its origin snapshot, scored by weighted MAPE and forecast value added at product-location level against the baseline and by quantile coverage. Online, run the sensing forecast beside the plan for several cycles in shadow, then publish it to a group of planners and compare error at lag 2 and expedite shipments avoided with a group still on the baseline.

## Baseline and production design

- **Baseline (build this first):** Statistical baseline forecast with a seasonal factor.
- **Production design:** Gradient-boosted sensing model on recent signals with quantile outputs, reconciled to the demand plan via MinT.

## Why AI, and why this kind

**Why AI.** Blend point-of-sale, order and external signals into 1-14 day demand forecasts that react to what is actually happening this week. The evidence that separates good from bad outcomes (Open order book, Sell-through momentum, External event signal) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "reusing the monthly statistical forecast" are what teams reach for first, and they fail because monthly models ignore this week's signals. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Gradient-boosted sensing model on recent signals with quantile outputs, reconciled to the demand plan via MinT.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Open order book, Sell-through momentum, External event signal and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Statistical baseline forecast with a seasonal factor | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient-boosted sensing model on recent signals with quantile outputs, reconciled to the demand plan via MinT | chosen | Meets the run-window envelope at $0.011 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Forecast accuracy at lag 2) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- A point-of-sale feed arrives late for a region and the model reads the missing day as zero demand, creating a false collapse in the forecast.
- A supplier imposes allocation limits, observed sales understate demand, and the model learns the shortfall as a trend.
- A promotion is planned, the model forecasts an uplift, the promotion is cancelled late, and stock is overbuilt.
- A new product with fewer than four weeks of history has no same-weekday features and an unknown level.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
