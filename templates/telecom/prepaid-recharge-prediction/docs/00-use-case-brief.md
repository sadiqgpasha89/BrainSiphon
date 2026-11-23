# Prepaid Recharge & Top-up Prediction: use-case brief

> Generated from the blueprint `telecom/prepaid-recharge-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Prepaid Recharge & Top-up Prediction · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict when each prepaid customer will recharge and how much so offers, reminders and liquidity forecasts reflect real behaviour. The system has to run as a scheduled batch job, inside these limits: Daily prediction for 100M prepaid lines, Reminders honour consent and frequency caps and Forecasts for finance with intervals.

**Why it is hard.** The obvious approach is average monthly recharge, and it fails because customers recharge on rhythms. The second trap is in "Churn": the real signal is lapse is a distinct state, while teams usually reach for zero recharge as churn.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way liquidity forecast error measures it.

**What success looks like.** Offline: Interval and amount error, Calibration of the due-soon list and Forecast coverage. Online: Reminder conversion, Liquidity forecast error and Customers contacted per recharge. The launch is judged on "Reminder conversion" while "Liquidity forecast error" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict when each prepaid customer will recharge and how much so offers, reminders and liquidity forecasts reflect real behaviour.

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

- Daily prediction for 100M prepaid lines
- Reminders honour consent and frequency caps
- Forecasts for finance with intervals
- No targeting based on financial hardship

## The approach in one paragraph

Start with predict the next recharge as the median interval of the last three recharges, because it is simple and effective. Then earn the move to a survival model for time to next recharge combined with an amount model, producing intervals and a due-soon list for consented reminders and an aggregate liquidity forecast, and only if it beats the baseline on Interval and amount error and Calibration of the due-soon list after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Days since last recharge | Gap to the usual interval. Due-date signal. Guard against: per customer. |
| Add Balance and burn rate | Current balance and recent daily spend. Time to depletion. Guard against: real-time balance. |
| Add Payday and calendar effects | Pay days and holidays. Timing effects. Guard against: local calendar. |
| Run it as one pipeline | Recharge event ingestion (streaming), Customer features (feature store), Time-to-recharge model (survival model), Amount model (gradient boosting), Reminder list (campaign system), Liquidity forecast (finance report) and Accuracy tracking (weekly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle dual-SIM users | Treat quiet lines carefully and avoid churn labels. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- SIM serial number: an identifier.
- Store location alone: weak link.

**How the approach is proven**

Prove it offline on Interval and amount error, Calibration of the due-soon list and Forecast coverage using time-ordered splits, then online on "Reminder conversion" with "Liquidity forecast error" as the guardrail. Watch for: Counting zero recharge as churn, Ignoring dual-SIM behaviour and Targeting low balance customers with pressure.

## Baseline and production design

- **Baseline (build this first):** Predict the next recharge as the median interval of the last three recharges, because it is simple and effective.
- **Production design:** A survival model for time to next recharge combined with an amount model, producing intervals and a due-soon list for consented reminders and an aggregate liquidity forecast.

## Why AI, and why this kind

**Why AI.** Predict when each prepaid customer will recharge and how much so offers, reminders and liquidity forecasts reflect real behaviour. The evidence that separates good from bad outcomes (Days since last recharge, Balance and burn rate, Payday and calendar effects) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "average monthly recharge" are what teams reach for first, and they fail because customers recharge on rhythms. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A survival model for time to next recharge combined with an amount model, producing intervals and a due-soon list for consented reminders and an aggregate liquidity forecast.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Days since last recharge, Balance and burn rate, Payday and calendar effects and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Predict the next recharge as the median interval of the last three recharges, because it is simple and effective | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A survival model for time to next recharge combined with an amount model, producing intervals and a due-soon list for consented reminders and an aggregate liquidity forecast | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Reminder conversion) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Counting zero recharge as churn.
- Evaluation trap: Ignoring dual-SIM behaviour.
- Dual-SIM users: activity moves to the other SIM.
- Promotion week: recharges pull forward.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
