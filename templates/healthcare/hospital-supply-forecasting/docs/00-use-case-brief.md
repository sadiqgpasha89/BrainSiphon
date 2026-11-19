# Hospital Supply & Consumables Forecasting: use-case brief

> Generated from the blueprint `healthcare/hospital-supply-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Hospital Supply & Consumables Forecasting · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast consumable demand per ward to prevent stock-outs of critical supplies and reduce expiry waste. The system has to run as a scheduled batch job, inside these limits: Critical item service levels, Expiry dates and Delivery lead times.

**Why it is hard.** The obvious approach is time-series only, and it fails because usage follows patient activity not calendar. The second trap is in "Criticality": the real signal is service-level targets per item class, while teams usually reach for uniform safety stock.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way expired inventory value measures it.

**What success looks like.** Offline: Weighted pinball loss and Stock-out probability calibration. Online: Critical stock-outs and Expired inventory value. The launch is judged on "Critical stock-outs" while "Expired inventory value" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast consumable demand per ward to prevent stock-outs of critical supplies and reduce expiry waste.

**Training objective.** `\mathcal{L}=\sum_t\left[c_s(y_t-\hat q_t)^+ +c_e(\hat q_t-y_t)^+\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| c_s | Cost per unit of shortfall (c_s, a stockout) and per unit of excess (c_e, wasted stock). |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{q}_t | The forecast quantity to stock. |

**Hard constraints**

- Critical item service levels
- Expiry dates
- Delivery lead times
- Pandemic surge handling

## The approach in one paragraph

Start with min-max par levels. Then earn the move to hierarchical forecasts driven by procedure and census forecasts with newsvendor-style service-level policy, and only if it beats the baseline on Weighted pinball loss and Stock-out probability calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Procedure schedule | Upcoming surgeries by type. Known usage. Guard against: schedule as-of. |
| Add Census and acuity | Patient days by unit and acuity. Consumption. Guard against: forecast census. |
| Add Lead-time variance | Supplier delivery variance. Safety stock. Guard against: delivered dates. |
| Run it as one pipeline | Usage and PO data (ERP), Driver forecasts (census and OR schedule), Demand model (GBDT), Replenishment policy (service-level optimiser), Supply chain planner (human), Order system (ERP) and Stock-out log (monitoring). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle supplier recall | Recall feed and alternate-product mapping. |

**Deliberately not doing**

- Supplier invoice number: none.
- Ward name text: encoded by unit.

**How the approach is proven**

Prove it offline on Weighted pinball loss and Stock-out probability calibration using time-ordered splits, then online on "Critical stock-outs" with "Expired inventory value" as the guardrail. Watch for: Censored demand during stock-outs and Ignoring substitutions.

## Baseline and production design

- **Baseline (build this first):** Min-max par levels.
- **Production design:** Hierarchical forecasts driven by procedure and census forecasts with newsvendor-style service-level policy.

## Why AI, and why this kind

**Why AI.** Forecast consumable demand per ward to prevent stock-outs of critical supplies and reduce expiry waste. The evidence that separates good from bad outcomes (Procedure schedule, Census and acuity, Lead-time variance) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "time-series only" are what teams reach for first, and they fail because usage follows patient activity not calendar. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Hierarchical forecasts driven by procedure and census forecasts with newsvendor-style service-level policy.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Procedure schedule, Census and acuity, Lead-time variance and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Min-max par levels | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hierarchical forecasts driven by procedure and census forecasts with newsvendor-style service-level policy | chosen | Meets the run-window envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Critical stock-outs) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Censored demand during stock-outs.
- Evaluation trap: Ignoring substitutions.
- Supplier recall: sudden shortage.
- Surge in infectious disease: pPE demand spikes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
