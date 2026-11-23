# Spare Parts & Swap Inventory Forecasting: use-case brief

> Generated from the blueprint `telecom/spare-parts-swap-inventory-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Spare Parts & Swap Inventory Forecasting · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast the demand for spare parts, modems and swap units by depot and part so stock-outs and write-offs both fall. The system has to run as a scheduled batch job, inside these limits: Forecast by part and depot with intervals, Lead times included and Obsolete parts flagged.

**Why it is hard.** The obvious approach is past issues only, and it fails because installed base changes drive failures. The second trap is in "Lead time": the real signal is supplier lead time distributions, while teams usually reach for a fixed lead time.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way inventory value measures it.

**What success looks like.** Offline: Weighted quantile loss, Stock-out rate at service level and Bias. Online: Stock-outs, Inventory value and Write-offs. The launch is judged on "Stock-outs" while "Inventory value" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast the demand for spare parts, modems and swap units by depot and part so stock-outs and write-offs both fall.

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

- Forecast by part and depot with intervals
- Lead times included
- Obsolete parts flagged
- Weekly run for 80K part-depot pairs

## The approach in one paragraph

Start with reorder-point rules from average usage and a safety factor, because the supply team already uses them. Then earn the move to a hierarchical forecast with intermittent demand methods driven by installed base, with lead time scenarios and a stocking optimiser by depot, and only if it beats the baseline on Weighted quantile loss and Stock-out rate at service level after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Installed base by age | Count of units by age band. Failure exposure. Guard against: from asset records. |
| Add Failure rate by part type | Failures per thousand unit-months. Core driver. Guard against: from repair data. |
| Add Supplier lead time | Median and p90 lead time. Reorder timing. Guard against: from purchase orders. |
| Run it as one pipeline | Usage and base data (lakehouse), Demand forecast (intermittent model), Lead time model (distribution fit), Stock optimiser (service-level optimisation), Order proposals (planning tool) and Accuracy tracking (monthly), with Buyer review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new part | Use similar parts and rollout data. |

**Deliberately not doing**

- Depot manager: irrelevant.
- Part colour: irrelevant.
- Order number: an identifier.

**How the approach is proven**

Prove it offline on Weighted quantile loss, Stock-out rate at service level and Bias using time-ordered splits, then online on "Stock-outs" with "Inventory value" as the guardrail. Watch for: Fixed lead times, Using averages for slow parts and Ignoring the repair loop.

## Baseline and production design

- **Baseline (build this first):** Reorder-point rules from average usage and a safety factor, because the supply team already uses them.
- **Production design:** A hierarchical forecast with intermittent demand methods driven by installed base, with lead time scenarios and a stocking optimiser by depot.

## Why AI, and why this kind

**Why AI.** Forecast the demand for spare parts, modems and swap units by depot and part so stock-outs and write-offs both fall. The evidence that separates good from bad outcomes (Installed base by age, Failure rate by part type, Supplier lead time) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "past issues only" are what teams reach for first, and they fail because installed base changes drive failures. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A hierarchical forecast with intermittent demand methods driven by installed base, with lead time scenarios and a stocking optimiser by depot.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Installed base by age, Failure rate by part type, Supplier lead time and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Reorder-point rules from average usage and a safety factor, because the supply team already uses them | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A hierarchical forecast with intermittent demand methods driven by installed base, with lead time scenarios and a stocking optimiser by depot | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Stock-outs) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Fixed lead times.
- Evaluation trap: Using averages for slow parts.
- New part: the new part has no usage history.
- Supplier disruption: lead times explode.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
