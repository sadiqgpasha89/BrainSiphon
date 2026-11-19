# Intraday Liquidity Forecasting: use-case brief

> Generated from the blueprint `bfsi/intraday-liquidity-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Intraday Liquidity Forecasting · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast intraday payment inflows and outflows by settlement system so treasury funds positions on time without holding excess buffers. The system has to run interactively, within a few seconds, inside these limits: Refresh every 15 minutes during operating hours, Never under-forecast peak outflow by more than the agreed tolerance and Fallback to historical profiles if feeds fail.

**Why it is hard.** The obvious approach is daily totals, and it fails because the same daily total can need very different peak funding. The second trap is in "Tail": the real signal is upper quantile of net outflow, while teams usually reach for mean forecast.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 20.0K at peak, at an estimated $9.3K a month. A mistake is expensive in the way excess buffer cost measures it.

**What success looks like.** Offline: Coverage of the 95% quantile and Peak-time error. Online: Overdraft days and intraday credit usage and Excess buffer cost. The launch is judged on "Overdraft days and intraday credit usage" while "Excess buffer cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast intraday payment inflows and outflows by settlement system so treasury funds positions on time without holding excess buffers.

**Training objective.** `\mathcal{L}=\sum_{t}\mathrm{Pinball}(\hat{q}_{0.95},y_t)+\lambda\,\mathrm{MSE}(\hat{y}_t,y_t)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{t} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Pinball} | Pinball (quantile) loss: penalises under- and over-prediction asymmetrically so the output is a chosen quantile, such as the 90th percentile, rather than the average. |
| \hat{q}_{0.95} | The model's predicted value at the chosen quantile. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{MSE} | Mean squared error: the average of squared differences between prediction and truth. |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Refresh every 15 minutes during operating hours
- Never under-forecast peak outflow by more than the agreed tolerance
- Fallback to historical profiles if feeds fail
- Explainable to the treasurer

## The approach in one paragraph

Start with same-day-last-week profile with a safety buffer, because treasurers know and trust it. Then earn the move to quantile gradient boosting over time-of-day, queue state and calendar features, with online correction from realised flows through the day and a rule-based fallback, and only if it beats the baseline on Coverage of the 95% quantile and Peak-time error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Time-of-day profile | Median cumulative flow by 15-minute slot for the same day type. The strongest regularity. Guard against: day types must be classified using the settlement calendar. |
| Add Queued payments | Value of payments waiting in the queue. Known near-term outflow. Guard against: the queue state needs a consistent snapshot. |
| Add Counterparty concentration | Share of flows from the top 10 counterparties. A few large counterparties drive peaks. Guard against: counterparty identities need entity mapping. |
| Run it as one pipeline | Payment message feed (Kafka from settlement systems), State aggregator (Flink windows), Forecast model (quantile gradient boosting), Intraday corrector (Kalman-style update), Funding recommender (rules with limits) and Treasury dashboard (real-time UI), with Forecast archive off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle settlement system outage | Outage detector that switches to scenario profiles and widens bands. |

**Deliberately not doing**

- Payment reference text: inconsistent across channels.
- Branch of origin: not related to the intraday timing.
- Weekday number alone: too coarse.

**How the approach is proven**

Prove it offline on Coverage of the 95% quantile and Peak-time error using time-ordered splits, then online on "Overdraft days and intraday credit usage" with "Excess buffer cost" as the guardrail. Watch for: Training on end-of-day aggregated data hides timing and Back-test on calm days misses stressed peaks.

## Baseline and production design

- **Baseline (build this first):** Same-day-last-week profile with a safety buffer, because treasurers know and trust it.
- **Production design:** Quantile gradient boosting over time-of-day, queue state and calendar features, with online correction from realised flows through the day and a rule-based fallback.

## Why AI, and why this kind

**Why AI.** Forecast intraday payment inflows and outflows by settlement system so treasury funds positions on time without holding excess buffers. The evidence that separates good from bad outcomes (Time-of-day profile, Queued payments, Counterparty concentration) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "daily totals" are what teams reach for first, and they fail because the same daily total can need very different peak funding. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Quantile gradient boosting over time-of-day, queue state and calendar features, with online correction from realised flows through the day and a rule-based fallback.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Time-of-day profile, Queued payments, Counterparty concentration and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Same-day-last-week profile with a safety buffer, because treasurers know and trust it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Quantile gradient boosting over time-of-day, queue state and calendar features, with online correction from realised flows through the day and a rule-based fallback | chosen | Meets the 2500 ms envelope at $0.0011 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Overdraft days and intraday credit usage) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on end-of-day aggregated data hides timing.
- Evaluation trap: Back-test on calm days misses stressed peaks.
- Settlement system outage: flows stop and then arrive in a burst.
- One-off large payment: a single large transfer breaks the profile.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
