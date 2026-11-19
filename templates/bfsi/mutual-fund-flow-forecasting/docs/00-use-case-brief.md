# Mutual Fund Flow Forecasting: use-case brief

> Generated from the blueprint `bfsi/mutual-fund-flow-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Mutual Fund Flow Forecasting · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast daily subscriptions and redemptions per fund so portfolio managers hold the right cash and treasury can plan liquidity. The system has to run as a scheduled batch job, inside these limits: Forecast by 06:00, Intervals required and Explainable drivers.

**Why it is hard.** The obvious approach is net flow only, and it fails because offsetting flows hide risk. The second trap is in "Calendar": the real signal is month-end, tax dates and salary cycles, while teams usually reach for day of week only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way forced sales measures it.

**What success looks like.** Offline: Pinball loss and Coverage of the 90% interval. Online: Cash drag and Forced sales. The launch is judged on "Cash drag" while "Forced sales" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast daily subscriptions and redemptions per fund so portfolio managers hold the right cash and treasury can plan liquidity.

**Training objective.** `\mathcal{L}=\sum_t\mathrm{Pinball}(\hat{q}_{0.9},y_t)+\lambda\,\mathrm{MSE}(\hat{y}_t,y_t)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Pinball} | Pinball (quantile) loss: penalises under- and over-prediction asymmetrically so the output is a chosen quantile, such as the 90th percentile, rather than the average. |
| \hat{q}_{0.9} | The model's predicted value at the chosen quantile. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{MSE} | Mean squared error: the average of squared differences between prediction and truth. |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Forecast by 06:00
- Intervals required
- Explainable drivers
- Large-flow events flagged

## The approach in one paragraph

Start with same-day-last-year flow scaled by AUM, because treasury uses it. Then earn the move to quantile gradient boosting by fund group with calendar, performance and stress features and an event overlay for large investors, and only if it beats the baseline on Pinball loss and Coverage of the 90% interval after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Day-of-month profile | Median flow by day type. Seasonality. Guard against: calendar shifts. |
| Add Trailing relative performance | 3 and 12 month return versus category. Flow driver. Guard against: lagged reporting. |
| Add Market stress indicator | Volatility index level. Redemption pressure. Guard against: regime changes. |
| Run it as one pipeline | Transfer agent data (flow feeds), Feature builder (Spark), Flow model (quantile boosting), Event overlay (rules), Forecast store (lakehouse), PM dashboard (BI) and Monitor (drift dashboard). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle large institutional redemption | Flag concentrated holders and take their intentions as manual inputs. |

**Deliberately not doing**

- Fund brand colour: irrelevant.
- Fund manager name: weak.
- Weather: no link.

**How the approach is proven**

Prove it offline on Pinball loss and Coverage of the 90% interval using time-ordered splits, then online on "Cash drag" with "Forced sales" as the guardrail. Watch for: Using final data instead of as-known data and Calm-year back-test.

## Baseline and production design

- **Baseline (build this first):** Same-day-last-year flow scaled by AUM, because treasury uses it.
- **Production design:** Quantile gradient boosting by fund group with calendar, performance and stress features and an event overlay for large investors.

## Why AI, and why this kind

**Why AI.** Forecast daily subscriptions and redemptions per fund so portfolio managers hold the right cash and treasury can plan liquidity. The evidence that separates good from bad outcomes (Day-of-month profile, Trailing relative performance, Market stress indicator) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "net flow only" are what teams reach for first, and they fail because offsetting flows hide risk. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Quantile gradient boosting by fund group with calendar, performance and stress features and an event overlay for large investors.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Day-of-month profile, Trailing relative performance, Market stress indicator and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Same-day-last-year flow scaled by AUM, because treasury uses it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Quantile gradient boosting by fund group with calendar, performance and stress features and an event overlay for large investors | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cash drag) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using final data instead of as-known data.
- Evaluation trap: Calm-year back-test.
- Large institutional redemption: one investor redeems a large amount and the forecast is dominated by a single event.
- Fund merger: a fund merger breaks the flow history so the model sees a sudden level change.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
