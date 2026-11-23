# Cell-Level Traffic Forecasting: use-case brief

> Generated from the blueprint `telecom/cell-level-traffic-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cell-Level Traffic Forecasting · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast traffic and user counts per cell for hours to weeks ahead so capacity, energy and maintenance plans use realistic demand with uncertainty. The system has to run as a scheduled batch job, inside these limits: Quantile forecasts for 200K cells, Forecast refreshed every hour for the next 7 days and Special events handled from a calendar.

**Why it is hard.** The obvious approach is a single global seasonality, and it fails because events shift demand by multiples. The second trap is in "Hierarchy": the real signal is cell forecasts that reconcile to site and region totals, while teams usually reach for independent per-cell forecasts.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 3.3K at peak, at an estimated $5.3K a month. A mistake is expensive in the way congested cell-hours measures it.

**What success looks like.** Offline: Weighted quantile loss by cell class, Coverage of eighty percent prediction intervals and Bias at busy hour. Online: Capacity upgrades triggered by false growth, Congested cell-hours and Energy savings from accurate low-load windows. The launch is judged on "Capacity upgrades triggered by false growth" while "Congested cell-hours" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast traffic and user counts per cell for hours to weeks ahead so capacity, energy and maintenance plans use realistic demand with uncertainty.

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

- Quantile forecasts for 200K cells
- Forecast refreshed every hour for the next 7 days
- Special events handled from a calendar
- Error reported per cell class

## The approach in one paragraph

Start with seasonal naive using the same hour in the previous week scaled by recent growth, because it is the easiest to explain. Then earn the move to a global gradient boosting or neural time-series model with cell embeddings and calendar covariates, quantile outputs and hierarchical reconciliation across cell, site and region, and only if it beats the baseline on Weighted quantile loss by cell class and Coverage of eighty percent prediction intervals after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Same hour last week | Traffic at the same hour in the previous weeks. Strong seasonal anchor. Guard against: align on local time. |
| Add Event calendar flags | Stadium, festival and holiday indicators near the cell. Explains spikes. Guard against: calendar must be curated. |
| Add Neighbour cell load | Load on adjacent cells over the previous hour. Captures spillover. Guard against: beware of cells that go offline. |
| Run it as one pipeline | Counter ingestion (time-series store), Cleaning and censoring fix (batch jobs), Feature build (calendar and neighbour joins), Quantile forecast (global model), Hierarchical reconciliation (batch step), Forecast publish (planning feed) and Accuracy tracking (weekly report). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new cell | Borrow a profile from similar cells and widen the interval. |

**Deliberately not doing**

- Cell name: an identifier.
- Vendor model number: weak effect.
- Hour of installation: no demand effect.

**How the approach is proven**

Prove it offline on Weighted quantile loss by cell class, Coverage of eighty percent prediction intervals and Bias at busy hour using time-ordered splits, then online on "Capacity upgrades triggered by false growth" with "Congested cell-hours" as the guardrail. Watch for: Training on saturated throughput as demand, Ignoring hierarchy and Splitting randomly across time.

## Baseline and production design

- **Baseline (build this first):** Seasonal naive using the same hour in the previous week scaled by recent growth, because it is the easiest to explain.
- **Production design:** A global gradient boosting or neural time-series model with cell embeddings and calendar covariates, quantile outputs and hierarchical reconciliation across cell, site and region.

## Why AI, and why this kind

**Why AI.** Forecast traffic and user counts per cell for hours to weeks ahead so capacity, energy and maintenance plans use realistic demand with uncertainty. The evidence that separates good from bad outcomes (Same hour last week, Event calendar flags, Neighbour cell load) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A single global seasonality" are what teams reach for first, and they fail because events shift demand by multiples. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A global gradient boosting or neural time-series model with cell embeddings and calendar covariates, quantile outputs and hierarchical reconciliation across cell, site and region.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Same hour last week, Event calendar flags, Neighbour cell load and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Seasonal naive using the same hour in the previous week scaled by recent growth, because it is the easiest to explain | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A global gradient boosting or neural time-series model with cell embeddings and calendar covariates, quantile outputs and hierarchical reconciliation across cell, site and region | chosen | Meets the run-window envelope at $0.00062 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Capacity upgrades triggered by false growth) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on saturated throughput as demand.
- Evaluation trap: Ignoring hierarchy.
- New cell: the cell has no traffic history.
- Cell outage: traffic drops to zero.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
