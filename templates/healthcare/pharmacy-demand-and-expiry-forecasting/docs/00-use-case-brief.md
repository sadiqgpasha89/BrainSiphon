# Pharmacy Demand & Expiry Forecasting: use-case brief

> Generated from the blueprint `healthcare/pharmacy-demand-and-expiry-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Pharmacy Demand & Expiry Forecasting · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast drug demand and manage expiry across pharmacy locations to balance availability and waste, including cold-chain items. The system has to run as a scheduled batch job, inside these limits: Controlled substances rules, Cold-chain handling and Expiry date tracking.

**Why it is hard.** The obvious approach is per-NDC independent forecasts, and it fails because shortages shift demand between equivalents. The second trap is in "Age": the real signal is stock by expiry date in the state, while teams usually reach for total inventory.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way expired stock value measures it.

**What success looks like.** Offline: Weighted MAPE and pinball loss and Expiry waste simulation. Online: Out-of-stock rate and Expired stock value. The launch is judged on "Out-of-stock rate" while "Expired stock value" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast drug demand and manage expiry across pharmacy locations to balance availability and waste, including cold-chain items.

**Training objective.** `\mathcal{L}=\sum_{t}\rho_q(y_t-\hat y_t)+\lambda\,\mathrm{ExpiryRisk}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{t} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_q | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. (one value per quantile level q) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ExpiryRisk} | Penalty for stock that will expire before it is sold. |

**Hard constraints**

- Controlled substances rules
- Cold-chain handling
- Expiry date tracking
- Shortage substitutions

## The approach in one paragraph

Start with min-max reorder with FEFO picking. Then earn the move to hierarchical demand model with substitution graph and expiry-aware ordering, plus inter-store transfer recommendations, and only if it beats the baseline on Weighted MAPE and pinball loss and Expiry waste simulation after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Prescription trend signals | New prescriptions and refills. Demand. Guard against: rx data lag. |
| Add Shortage and recall alerts | Supplier shortage feed. Substitution. Guard against: feed latency. |
| Add Days-to-expiry distribution | Stock by expiry bucket. Waste risk. Guard against: batch tracking. |
| Run it as one pipeline | Dispense and inventory feed (pharmacy system), Substitution graph (drug classes), Demand model (LightGBM), Expiry-aware optimiser (MILP), Transfer recommender (network model), Pharmacist approval (human) and Waste and availability tracking (KPI). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle drug shortage announced | Substitution matrix updates by shortage events. |

**Deliberately not doing**

- NDC code digits: identifier.
- Pharmacy name: encoded.

**How the approach is proven**

Prove it offline on Weighted MAPE and pinball loss and Expiry waste simulation using time-ordered splits, then online on "Out-of-stock rate" with "Expired stock value" as the guardrail. Watch for: Backtests ignoring shortage events and Independent item models in shortages.

## Baseline and production design

- **Baseline (build this first):** Min-max reorder with FEFO picking.
- **Production design:** Hierarchical demand model with substitution graph and expiry-aware ordering, plus inter-store transfer recommendations.

## Why AI, and why this kind

**Why AI.** Forecast drug demand and manage expiry across pharmacy locations to balance availability and waste, including cold-chain items. The evidence that separates good from bad outcomes (Prescription trend signals, Shortage and recall alerts, Days-to-expiry distribution) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "per-NDC independent forecasts" are what teams reach for first, and they fail because shortages shift demand between equivalents. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Hierarchical demand model with substitution graph and expiry-aware ordering, plus inter-store transfer recommendations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Prescription trend signals, Shortage and recall alerts, Days-to-expiry distribution and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Min-max reorder with FEFO picking | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hierarchical demand model with substitution graph and expiry-aware ordering, plus inter-store transfer recommendations | chosen | Meets the run-window envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Out-of-stock rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Backtests ignoring shortage events.
- Evaluation trap: Independent item models in shortages.
- Drug shortage announced: demand shifts to substitute.
- Cold-chain excursion: stock must be discarded.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
