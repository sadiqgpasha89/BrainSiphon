# Construction Project Delay & Overrun Prediction: use-case brief

> Generated from the blueprint `real-estate/project-delay-and-overrun-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Construction Project Delay & Overrun Prediction · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict schedule and cost overruns on live projects from progress, supply and weather data so managers act early. The system has to run as a scheduled batch job, inside these limits: Forecasts refreshed weekly for every active project, Each forecast shows the drivers behind it and No scoring of individual people or blame.

**Why it is hard.** The obvious approach is percent complete reported by site staff, and it fails because self-reported progress is optimistic and lags reality. The second trap is in "Critical": the real signal is delay on tasks on the critical path, while teams usually reach for delay on all tasks equally.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $2.0K a month. A mistake is expensive in the way cost overrun measures it.

**What success looks like.** Offline: MAE of delay and Early-warning recall. Online: Overrun days and Cost overrun. The launch is judged on "Overrun days" while "Cost overrun" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict schedule and cost overruns on live projects from progress, supply and weather data so managers act early.

**Training objective.** `\mathcal{L}=\mathrm{Huber}(\hat{d}-d)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \hat{d} | The predicted delay in days. |
| d | The actual delay of the project in days. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |

**Hard constraints**

- Forecasts refreshed weekly for every active project
- Each forecast shows the drivers behind it
- No scoring of individual people or blame
- Only data from official project systems is used

## The approach in one paragraph

Start with earned-value indices with thresholds, because project controls use them. Then earn the move to gradient boosting for delay with critical-path features and a simulation of schedule risk, and only if it beats the baseline on MAE of delay and Early-warning recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Schedule performance index | Earned value divided by planned value to date. The standard measure of schedule health. Guard against: depends on honest progress reporting, so cross-check with quantities. |
| Add Critical path float | Days of float on the tasks that drive the finish date. Low float means any slip delays the project. Guard against: schedules are updated irregularly. |
| Add Delivery lateness | Average days late of the last ten key deliveries. Supply delays precede site delays. Guard against: logs may record receipt and not site-ready dates. |
| Run it as one pipeline | Schedule and cost data (project system), Progress capture (app), Feature builder (Spark), Delay model (boosting), Monte Carlo (schedule risk), PM dashboard (BI) and Outcome log (warehouse). |
| Optimise the right thing | The objective weighs huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training, so the model is trained on the cost of the decision and not on a generic score. |
| Handle change orders | Flag projects with frequent change orders and add them to the forecast. |

**Deliberately not doing**

- Project name: A label with no predictive content.
- Manager: Naming a manager risks blame scoring and does not generalise.
- Photo count: A reporting habit and not a measure of progress.

**How the approach is proven**

Prove it offline on MAE of delay and Early-warning recall using time-ordered splits, then online on "Overrun days" with "Cost overrun" as the guardrail. Watch for: Only completed projects are in the data, so cancelled or abandoned ones are missing and Optimistic reports make early signals look healthier than they were.

## Baseline and production design

- **Baseline (build this first):** Earned-value indices with thresholds, because project controls use them.
- **Production design:** Gradient boosting for delay with critical-path features and a simulation of schedule risk.

## Why AI, and why this kind

**Why AI.** Predict schedule and cost overruns on live projects from progress, supply and weather data so managers act early. The evidence that separates good from bad outcomes (Schedule performance index, Critical path float, Delivery lateness) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "percent complete reported by site staff" are what teams reach for first, and they fail because self-reported progress is optimistic and lags reality. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting for delay with critical-path features and a simulation of schedule risk.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Schedule performance index, Critical path float, Delivery lateness and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Earned-value indices with thresholds, because project controls use them | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting for delay with critical-path features and a simulation of schedule risk | chosen | Meets the run-window envelope at $0.022 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Overrun days) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Only completed projects are in the data, so cancelled or abandoned ones are missing.
- Evaluation trap: Optimistic reports make early signals look healthier than they were.
- Change orders: change orders add scope and cost beyond the original plan.
- Strike: a strike or stoppage halts work for an extended period.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
