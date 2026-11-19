# Procurement Price & Commodity Cost Forecasting: use-case brief

> Generated from the blueprint `supply-chain/procurement-price-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Procurement Price & Commodity Cost Forecasting · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast input costs (commodities, freight, components) to time purchases, hedges and contract negotiations. The system has to run as a scheduled batch job, inside these limits: Regime changes, Few observations for custom parts and Scenario support.

**Why it is hard.** The obvious approach is univariate extrapolation, and it fails because component prices follow input costs. The second trap is in "Uncertainty": the real signal is quantile forecasts and scenarios, while teams usually reach for point forecasts.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way hedge effectiveness measures it.

**What success looks like.** Offline: Weighted quantile loss and Directional accuracy. Online: Savings vs budget and Hedge effectiveness. The launch is judged on "Savings vs budget" while "Hedge effectiveness" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast input costs (commodities, freight, components) to time purchases, hedges and contract negotiations.

**Training objective.** `\mathcal{L}=\sum_{h}\sum_q\rho_q\!\left(p_{t+h}-\hat p_{t+h}^{(q)}\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{h} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_q | Pinball (quantile) loss at level q. |
| p_{t+h} | The price at time t+h: the hat is the forecast at quantile q. |
| \hat{p}_{t+h}^{(q)} | The model's estimated probability, after calibration where one is applied. (one value per time step or token t and forecast step h) |

**Hard constraints**

- Regime changes
- Few observations for custom parts
- Scenario support
- Audit trail

## The approach in one paragraph

Start with last price plus inflation assumption. Then earn the move to pass-through models per component family with quantile forecasting, scenario generator and contract-formula engine, and only if it beats the baseline on Weighted quantile loss and Directional accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Index price lag features | Commodity index lags. Cost pass-through. Guard against: publication timing. |
| Add FX rate forecast | Currency scenarios. Import cost. Guard against: forecast. |
| Add Contract price formula | Indexation clauses. Mechanical link. Guard against: contract data. |
| Run it as one pipeline | Prices and indices (lake), Contract formulas (contract store), Pass-through model (regression with lags), Quantile forecaster (GBDT), Scenario engine (simulation), Buyer dashboard (human) and Realised prices (tracking). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle supply shock (war, embargo) | Regime detection and scenario overlays. |

**Deliberately not doing**

- Supplier name: none.
- Quote reference: none.

**How the approach is proven**

Prove it offline on Weighted quantile loss and Directional accuracy using time-ordered splits, then online on "Savings vs budget" with "Hedge effectiveness" as the guardrail. Watch for: Using revised index values in training and Evaluating on stable periods only.

## Baseline and production design

- **Baseline (build this first):** Last price plus inflation assumption.
- **Production design:** Pass-through models per component family with quantile forecasting, scenario generator and contract-formula engine.

## Why AI, and why this kind

**Why AI.** Forecast input costs (commodities, freight, components) to time purchases, hedges and contract negotiations. The evidence that separates good from bad outcomes (Index price lag features, FX rate forecast, Contract price formula) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "univariate extrapolation" are what teams reach for first, and they fail because component prices follow input costs. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Pass-through models per component family with quantile forecasting, scenario generator and contract-formula engine.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Index price lag features, FX rate forecast, Contract price formula and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Last price plus inflation assumption | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Pass-through models per component family with quantile forecasting, scenario generator and contract-formula engine | chosen | Meets the run-window envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Savings vs budget) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using revised index values in training.
- Evaluation trap: Evaluating on stable periods only.
- Supply shock (war, embargo): historical relationships break.
- Index definition changes: lag features invalid.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
