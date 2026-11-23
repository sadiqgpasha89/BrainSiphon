# Schedule Delay Risk Forecasting: use-case brief

> Generated from the blueprint `engineering/schedule-delay-risk-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Schedule Delay Risk Forecasting · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast project completion dates as ranges from progress, float and risk drivers and name the activities most likely to cause delay, for project managers to act on. The system has to run as a scheduled batch job, inside these limits: Forecast shown as a range with probabilities, Critical path drivers named and Baselines changed only through change control.

**Why it is hard.** The obvious approach is planned dates, and it fails because plans are optimistic. The second trap is in "Label": the real signal is actual activity durations and delays, while teams usually reach for reported percent complete.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way time to detect delay measures it.

**What success looks like.** Offline: Calibration of date ranges, Delay driver accuracy and Forecast error. Online: Late completion, Time to detect delay and Recovery plan effectiveness. The launch is judged on "Late completion" while "Time to detect delay" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast project completion dates as ranges from progress, float and risk drivers and name the activities most likely to cause delay, for project managers to act on.

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

- Forecast shown as a range with probabilities
- Critical path drivers named
- Baselines changed only through change control
- Weekly refresh for 500 projects
- Project manager owns the response

## The approach in one paragraph

Start with critical path method with a planner judgement on contingency, because it is the standard method. Then earn the move to a forecast that combines schedule logic, learned duration performance and risk drivers, outputs completion ranges and shows the activities and risks that move the date, and only if it beats the baseline on Calibration of date ranges and Delay driver accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Progress and float | Completion and slack. Core. Guard against: from the schedule. |
| Add Duration performance | Actual versus planned durations. Core. Guard against: from updates. |
| Add Weather and site constraints | Days lost to weather. Risk. Guard against: from weather data. |
| Run it as one pipeline | Schedule and progress data (scheduling tool), Duration model (gradient boosting), Monte Carlo simulation (forecaster), Driver attribution (sensitivity analysis), Dashboard (project controls) and Accuracy tracking (quarterly), with Manager review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle re-baselined schedule | Baseline version tracking. |

**Deliberately not doing**

- Planner name: personal data.
- Activity description wording: weak link.
- Report date: an artefact.

**How the approach is proven**

Prove it offline on Calibration of date ranges, Delay driver accuracy and Forecast error using time-ordered splits, then online on "Late completion" with "Time to detect delay" as the guardrail. Watch for: Planned dates as forecasts, Percent complete as truth and Forecasts as commitments.

## Baseline and production design

- **Baseline (build this first):** Critical path method with a planner judgement on contingency, because it is the standard method.
- **Production design:** A forecast that combines schedule logic, learned duration performance and risk drivers, outputs completion ranges and shows the activities and risks that move the date.

## Why AI, and why this kind

**Why AI.** Forecast project completion dates as ranges from progress, float and risk drivers and name the activities most likely to cause delay, for project managers to act on. The evidence that separates good from bad outcomes (Progress and float, Duration performance, Weather and site constraints) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "planned dates" are what teams reach for first, and they fail because plans are optimistic. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A forecast that combines schedule logic, learned duration performance and risk drivers, outputs completion ranges and shows the activities and risks that move the date.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Progress and float, Duration performance, Weather and site constraints and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Critical path method with a planner judgement on contingency, because it is the standard method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A forecast that combines schedule logic, learned duration performance and risk drivers, outputs completion ranges and shows the activities and risks that move the date | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Late completion) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Planned dates as forecasts.
- Evaluation trap: Percent complete as truth.
- Re-baselined schedule: the plan changes mid-project.
- Optimistic reporting: progress is overstated.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
