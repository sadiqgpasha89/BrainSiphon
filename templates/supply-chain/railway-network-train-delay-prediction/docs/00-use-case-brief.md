# Railway Network Train Delay Prediction: use-case brief

> Generated from the blueprint `supply-chain/railway-network-train-delay-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Railway Network Train Delay Prediction · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict train delays and propagation across the network to support dispatchers and passenger information. The system has to run in under 100 milliseconds, inside these limits: Real-time updates every 30 s, Safety-critical separation and Delay propagation through shared infrastructure.

**Why it is hard.** The obvious approach is per-train independent models, and it fails because delays cascade through shared resources. The second trap is in "Timetable": the real signal is timetable buffers and dwell supplements, while teams usually reach for planned time only.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $3.6K a month. A mistake is expensive in the way passenger information accuracy measures it.

**What success looks like.** Offline: MAE and quantile coverage at 10-60 minutes and Cascade detection recall. Online: Dispatcher intervention success and Passenger information accuracy. The launch is judged on "Dispatcher intervention success" while "Passenger information accuracy" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict train delays and propagation across the network to support dispatchers and passenger information.

**Training objective.** `\mathcal{L}=\sum_i\rho_{0.5}(y_i-\hat q^{50}_i)+\rho_{0.9}(y_i-\hat q^{90}_i)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_{0.5} | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \hat{q}^{50}_i | The model's predicted value at the chosen quantile. (one value per example i) |

**Hard constraints**

- Real-time updates every 30 s
- Safety-critical separation
- Delay propagation through shared infrastructure
- Explainable to dispatchers

## The approach in one paragraph

Start with delay persistence (current delay carried forward). Then earn the move to spatio-temporal GNN with timetable features and quantile outputs, feeding a dispatcher decision view and passenger information, and only if it beats the baseline on MAE and quantile coverage at 10-60 minutes and Cascade detection recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Current delay and buffer ahead | Delay minus remaining buffer. Propagation. Guard against: timetable data. |
| Add Conflicting train graph | Trains sharing blocks soon. Cascade. Guard against: block occupancy. |
| Add Weather and works | Speed restrictions. Exogenous. Guard against: notices. |
| Run it as one pipeline | Train position feed (signalling), Timetable and graph builder (network model), Delay propagation model (ST-GNN), Quantile calibrator (conformal), Dispatcher view (control centre), Passenger info (apps) and Actual times (labels). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle signalling failure | Staleness handling and fallback to timetable. |

**Deliberately not doing**

- Train ID digits: none.
- Driver: personal.

**How the approach is proven**

Prove it offline on MAE and quantile coverage at 10-60 minutes and Cascade detection recall using time-ordered splits, then online on "Dispatcher intervention success" with "Passenger information accuracy" as the guardrail. Watch for: Training on normal days only and Using actual times that were revised after the fact.

## Baseline and production design

- **Baseline (build this first):** Delay persistence (current delay carried forward).
- **Production design:** Spatio-temporal GNN with timetable features and quantile outputs, feeding a dispatcher decision view and passenger information.

## Why AI, and why this kind

**Why AI.** Predict train delays and propagation across the network to support dispatchers and passenger information. The evidence that separates good from bad outcomes (Current delay and buffer ahead, Conflicting train graph, Weather and works) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "per-train independent models" are what teams reach for first, and they fail because delays cascade through shared resources. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Spatio-temporal GNN with timetable features and quantile outputs, feeding a dispatcher decision view and passenger information.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Current delay and buffer ahead, Conflicting train graph, Weather and works and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Delay persistence (current delay carried forward) | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Spatio-temporal GNN with timetable features and quantile outputs, feeding a dispatcher decision view and passenger information | chosen | Meets the 80 ms envelope at $0.081 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Dispatcher intervention success) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on normal days only.
- Evaluation trap: Using actual times that were revised after the fact.
- Signalling failure: positions stale.
- Major disruption: learned patterns invalid.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
