# Branch Footfall & Staffing Forecast: use-case brief

> Generated from the blueprint `bfsi/branch-footfall-and-staffing-forecast` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Branch Footfall & Staffing Forecast · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast branch visits by hour so rosters match demand and queues stay short. The system has to run as a scheduled batch job, inside these limits: Rosters are fixed three weeks ahead, so forecasts are needed for 3 to 6 weeks out, Labour rules on hours and breaks are respected and A service-level target for waiting time at each branch.

**Why it is hard.** The obvious approach is daily totals, and it fails because peaks drive queues, and a day with the right total can still have a lunchtime queue. The second trap is in "Transaction mix": the real signal is the visit type, such as cash, advice or loans, while teams usually reach for the visit count alone.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way overtime hours measures it.

**What success looks like.** Offline: Pinball loss and Peak error. Online: Wait time and Overtime hours. The launch is judged on "Wait time" while "Overtime hours" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast branch visits by hour so rosters match demand and queues stay short.

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

- Rosters are fixed three weeks ahead, so forecasts are needed for 3 to 6 weeks out
- Labour rules on hours and breaks are respected
- A service-level target for waiting time at each branch
- Every forecast explainable to a branch manager

## The approach in one paragraph

Start with same week last year scaled, because managers use it. Then earn the move to quantile gradient boosting by branch cluster with event features, feeding a roster optimiser, and only if it beats the baseline on Pinball loss and Peak error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Hourly profile | Median visits by hour for each day type, such as normal, pay day or holiday. The core pattern. Guard against: closures and refits distort it, so exclude them. |
| Add Pay day effect | Days since the last typical pay day. A reliable peak driver. Guard against: pay cycles vary by employer in the area. |
| Add Digital trend | Monthly change in digital transactions in the catchment. Branch visits decline as customers move online. Guard against: the trend is slow but real. |
| Run it as one pipeline | Visit counts (queue system), Calendar (configuration), Forecaster (quantile boosting), Roster optimiser (solver), Manager view (web), Actuals (warehouse) and Monitor (dashboard). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle branch refit | Mark closures as exclusions and impute from comparable open days. |

**Deliberately not doing**

- Branch name: A label that is not a driver of demand.
- Manager: The branch manager does not change footfall.
- Weather: A small effect once the calendar is known.

**How the approach is proven**

Prove it offline on Pinball loss and Peak error using time-ordered splits, then online on "Wait time" with "Overtime hours" as the guardrail. Watch for: Closed days in the history look like zero demand and bias the forecast and A calm test period hides the peaks that matter for staffing.

## Baseline and production design

- **Baseline (build this first):** Same week last year scaled, because managers use it.
- **Production design:** Quantile gradient boosting by branch cluster with event features, feeding a roster optimiser.

## Why AI, and why this kind

**Why AI.** Forecast branch visits by hour so rosters match demand and queues stay short. The evidence that separates good from bad outcomes (Hourly profile, Pay day effect, Digital trend) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "daily totals" are what teams reach for first, and they fail because peaks drive queues, and a day with the right total can still have a lunchtime queue. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Quantile gradient boosting by branch cluster with event features, feeding a roster optimiser.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Hourly profile, Pay day effect, Digital trend and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Same week last year scaled, because managers use it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Quantile gradient boosting by branch cluster with event features, feeding a roster optimiser | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Wait time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Closed days in the history look like zero demand and bias the forecast.
- Evaluation trap: A calm test period hides the peaks that matter for staffing.
- Branch refit: closed or refit days in the history look like zero demand and bias the forecast.
- Sensor outage: a sensor outage produces missing counts that look like an empty branch.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
