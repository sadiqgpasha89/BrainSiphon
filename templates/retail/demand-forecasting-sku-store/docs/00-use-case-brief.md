# SKU-Store Demand Forecasting: use-case brief

> Generated from the blueprint `retail/demand-forecasting-sku-store` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SKU-Store Demand Forecasting · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast daily demand for millions of SKU-store pairs to drive replenishment with calibrated uncertainty and promo awareness. The system has to run as a scheduled batch job, inside these limits: 5M series nightly, Intermittent demand and Promotion and price covariates.

**Why it is hard.** The obvious approach is gaussian MSE, and it fails because mSE on lumpy demand gives meaningless negative or tiny forecasts. The second trap is in "Hierarchy": the real signal is hierarchical reconciliation (SKU, category, store), while teams usually reach for independent forecasts.

**Scale and stakes.** At 10 million users this is about 5.0M model-touching events a day, 58 requests per second on average and 58 at peak, at an estimated $1.7K a month. A mistake is expensive in the way waste and markdown rate measures it.

**What success looks like.** Offline: WAPE and weighted pinball loss and Bias at SKU-store level. Online: In-stock rate and Waste and markdown rate. The launch is judged on "In-stock rate" while "Waste and markdown rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast daily demand for millions of SKU-store pairs to drive replenishment with calibrated uncertainty and promo awareness.

**Training objective.** `\mathcal{L}=\sum_{t}\sum_{q}\rho_q\!\left(y_t-\hat y_t^{(q)}\right)\quad\text{(quantile / pinball)}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{t} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_q | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. (one value per quantile level q) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t^{(q)} | The model's prediction of y. (one value per time step or token t and quantile level q) |

**Hard constraints**

- 5M series nightly
- Intermittent demand
- Promotion and price covariates
- Explainable overrides

## The approach in one paragraph

Start with seasonal naive plus promo uplift factors. Then earn the move to global LightGBM / N-HiTS on all series with item embeddings, quantile heads, hierarchical reconciliation (MinT) and censored-demand correction for stock-outs, and only if it beats the baseline on WAPE and weighted pinball loss and Bias at SKU-store level after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Promo calendar flag with depth | Promotion type and discount depth known in advance. Demand spike. Guard against: only plans known at forecast origin. |
| Add Price index | Price relative to base. Elasticity. Guard against: future prices must be planned values. |
| Add Lag-7 and lag-364 demand | Same weekday and year-ago demand. Seasonality. Guard against: alignment by retail calendar. |
| Run it as one pipeline | Sales and inventory ingestion (lakehouse), Stock-out correction (censoring model), Feature builder (Spark), Global forecaster (N-HiTS on GPU), Hierarchical reconciler (MinT), Forecast publisher (planning system) and Planner overrides (demand planners). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle stock-out days recorded as zero demand | Censoring-aware targets. |

**Deliberately not doing**

- SKU description text: adds nothing over category and attributes.
- Day-of-month dummies: spurious for most items.

**How the approach is proven**

Prove it offline on WAPE and weighted pinball loss and Bias at SKU-store level using time-ordered splits, then online on "In-stock rate" with "Waste and markdown rate" as the guardrail. Watch for: Random CV over time and Future promo plans used before they were decided.

## Baseline and production design

- **Baseline (build this first):** Seasonal naive plus promo uplift factors.
- **Production design:** Global LightGBM / N-HiTS on all series with item embeddings, quantile heads, hierarchical reconciliation (MinT) and censored-demand correction for stock-outs.

## Why AI, and why this kind

**Why AI.** Forecast daily demand for millions of SKU-store pairs to drive replenishment with calibrated uncertainty and promo awareness. The evidence that separates good from bad outcomes (Promo calendar flag with depth, Price index, Lag-7 and lag-364 demand) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "gaussian MSE" are what teams reach for first, and they fail because MSE on lumpy demand gives meaningless negative or tiny forecasts. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Global LightGBM / N-HiTS on all series with item embeddings, quantile heads, hierarchical reconciliation (MinT) and censored-demand correction for stock-outs.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Promo calendar flag with depth, Price index, Lag-7 and lag-364 demand and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Seasonal naive plus promo uplift factors | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Global LightGBM / N-HiTS on all series with item embeddings, quantile heads, hierarchical reconciliation (MinT) and censored-demand correction for stock-outs | chosen | Meets the run-window envelope at $0.011 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (In-stock rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Random CV over time.
- Evaluation trap: Future promo plans used before they were decided.
- Stock-out days recorded as zero demand: forecast biases low.
- New store opening: the store has no sales history so the global model produces unstable forecasts.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
