# Demand Forecasting for Make-to-Stock Items: use-case brief

> Generated from the blueprint `manufacturing/make-to-stock-demand-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Demand Forecasting for Make-to-Stock Items · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast item-level demand with intervals for make-to-stock products so production plans, safety stock and raw material orders match demand. The system has to run as a scheduled batch job, inside these limits: Forecast per item and channel for 26 weeks, Quantile output for safety stock and Promotion and event inputs.

**Why it is hard.** The obvious approach is production output, and it fails because output reflects capacity not demand. The second trap is in "Hierarchy": the real signal is forecasts reconciled from item to family and plant, while teams usually reach for independent item forecasts.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way stock-outs measures it.

**What success looks like.** Offline: Weighted quantile loss by family, Bias and Coverage of intervals. Online: Forecast accuracy at item level, Stock-outs and Excess inventory. The launch is judged on "Forecast accuracy at item level" while "Stock-outs" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast item-level demand with intervals for make-to-stock products so production plans, safety stock and raw material orders match demand.

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

- Forecast per item and channel for 26 weeks
- Quantile output for safety stock
- Promotion and event inputs
- Weekly run for 80K items

## The approach in one paragraph

Start with seasonal naive with a moving average on shipments, because planners trust it and it sets the floor. Then earn the move to a global gradient boosting or neural forecaster with item embeddings, calendar and promotion covariates, hierarchical reconciliation and quantile outputs feeding safety stock, and only if it beats the baseline on Weighted quantile loss by family and Bias after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Same week last year | Demand in the matching week of prior years. Seasonality. Guard against: aligned by week number. |
| Add Promotion and launch calendar | Planned promotions and launches. Demand shifts. Guard against: from sales. |
| Add Customer order backlog | Confirmed open orders by need date. Near-term demand. Guard against: from ERP. |
| Run it as one pipeline | Order and shipment history (ERP), Cleaning and censoring (batch), Feature build (calendar and promotion joins), Quantile forecast (global model), Reconciliation (hierarchical step) and Accuracy tracking (weekly), with Planner review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new item | Borrow from similar items and widen the interval. |

**Deliberately not doing**

- Item description length: not demand.
- Planner name: irrelevant.
- Warehouse code: an identifier.

**How the approach is proven**

Prove it offline on Weighted quantile loss by family, Bias and Coverage of intervals using time-ordered splits, then online on "Forecast accuracy at item level" with "Stock-outs" as the guardrail. Watch for: Using shipments as demand, Ignoring censoring and Random time splits.

## Baseline and production design

- **Baseline (build this first):** Seasonal naive with a moving average on shipments, because planners trust it and it sets the floor.
- **Production design:** A global gradient boosting or neural forecaster with item embeddings, calendar and promotion covariates, hierarchical reconciliation and quantile outputs feeding safety stock.

## Why AI, and why this kind

**Why AI.** Forecast item-level demand with intervals for make-to-stock products so production plans, safety stock and raw material orders match demand. The evidence that separates good from bad outcomes (Same week last year, Promotion and launch calendar, Customer order backlog) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "production output" are what teams reach for first, and they fail because output reflects capacity not demand. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A global gradient boosting or neural forecaster with item embeddings, calendar and promotion covariates, hierarchical reconciliation and quantile outputs feeding safety stock.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Same week last year, Promotion and launch calendar, Customer order backlog and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Seasonal naive with a moving average on shipments, because planners trust it and it sets the floor | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A global gradient boosting or neural forecaster with item embeddings, calendar and promotion covariates, hierarchical reconciliation and quantile outputs feeding safety stock | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Forecast accuracy at item level) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using shipments as demand.
- Evaluation trap: Ignoring censoring.
- New item: the item has no sales history.
- Stock-out period: sales understate real demand.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
