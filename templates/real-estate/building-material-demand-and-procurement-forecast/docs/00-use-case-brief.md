# Building Material Demand & Procurement Forecast: use-case brief

> Generated from the blueprint `real-estate/building-material-demand-and-procurement-forecast` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Building Material Demand & Procurement Forecast · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast material needs by project phase and plan purchases to avoid delays and excess stock. The system has to run as a scheduled batch job, inside these limits: Lead times of each supplier are respected in the order plan, Price volatility reflected in order timing and quantity and On-site storage limits cap early ordering.

**Why it is hard.** The obvious approach is an average monthly consumption, and it fails because demand is lumpy, with concrete in the early phases and finishes at the end. The second trap is in "Lead": the real signal is supplier lead-time risk in the order date, while teams usually reach for ordering when the schedule says so.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way excess stock measures it.

**What success looks like.** Offline: Quantity error and Stock-out rate. Online: Delays from materials and Excess stock. The launch is judged on "Delays from materials" while "Excess stock" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast material needs by project phase and plan purchases to avoid delays and excess stock.

**Training objective.** `\mathcal{L}=\sum_t\mathrm{Pinball}(\hat{q}_{0.9},y_t)+\lambda\,\mathrm{Huber}(\hat{c}-c)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Pinball} | Pinball (quantile) loss: penalises under- and over-prediction asymmetrically so the output is a chosen quantile, such as the 90th percentile, rather than the average. |
| \hat{q}_{0.9} | The model's predicted value at the chosen quantile. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \hat{c} | The predicted cost (or procurement spend) in the same units as the actual cost. |
| c | The actual cost. |

**Hard constraints**

- Lead times of each supplier are respected in the order plan
- Price volatility reflected in order timing and quantity
- On-site storage limits cap early ordering
- A weekly procurement plan for every active project

## The approach in one paragraph

Start with bill of quantities with a buffer, because it is typical. Then earn the move to phase-aware quantile demand forecast with lead-time risk and a procurement optimiser, and only if it beats the baseline on Quantity error and Stock-out rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Schedule phase | Tasks planned in each of the next 8 weeks mapped to material take-offs. The main driver of demand. Guard against: schedules slip, so refresh weekly. |
| Add Supplier lead time | Median and 90th percentile days from order to delivery for each supplier. Determines the order date. Guard against: quoted lead times differ from realised ones. |
| Add Price index | Recent change in the relevant material price index. Informs timing of purchases. Guard against: indices lag spot prices. |
| Run it as one pipeline | Schedule and BoQ (project system), Demand model (boosting), Lead-time model (regression), Price feed (indices), Procurement optimiser (solver), Buyer view (app) and Outcome log (warehouse). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle design change | Re-run the take-off when the design changes and update the order. |

**Deliberately not doing**

- Project name: A label with no demand information.
- Supplier name: The supplier's identity is captured by lead time and price already.
- Order number: An administrative identifier with no signal.

**How the approach is proven**

Prove it offline on Quantity error and Stock-out rate using time-ordered splits, then online on "Delays from materials" with "Excess stock" as the guardrail. Watch for: Plans differ from as-built quantities, so a forecast fitted to plans is biased and Price shocks in the past are few and a model trained on calm periods fails in a shock.

## Baseline and production design

- **Baseline (build this first):** Bill of quantities with a buffer, because it is typical.
- **Production design:** Phase-aware quantile demand forecast with lead-time risk and a procurement optimiser.

## Why AI, and why this kind

**Why AI.** Forecast material needs by project phase and plan purchases to avoid delays and excess stock. The evidence that separates good from bad outcomes (Schedule phase, Supplier lead time, Price index) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "an average monthly consumption" are what teams reach for first, and they fail because demand is lumpy, with concrete in the early phases and finishes at the end. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Phase-aware quantile demand forecast with lead-time risk and a procurement optimiser.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Schedule phase, Supplier lead time, Price index and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Bill of quantities with a buffer, because it is typical | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Phase-aware quantile demand forecast with lead-time risk and a procurement optimiser | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Delays from materials) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Plans differ from as-built quantities, so a forecast fitted to plans is biased.
- Evaluation trap: Price shocks in the past are few and a model trained on calm periods fails in a shock.
- Design change: a design change alters the quantities after the plan is made.
- Shortage: a material shortage in the supply chain delays the order.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
