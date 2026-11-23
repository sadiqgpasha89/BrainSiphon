# Emergency Medical Demand Forecasting: use-case brief

> Generated from the blueprint `public-safety/ems-demand-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Emergency Medical Demand Forecasting · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast ambulance demand by area and hour from aggregated call volumes, weather and events so staffing and posting plans match likely demand. The system has to run as a scheduled batch job, inside these limits: Hourly forecast per zone for 14 days, Aggregated counts only and Interval output.

**Why it is hard.** The obvious approach is individual patient data, and it fails because not needed for staffing. The second trap is in "Use": the real signal is staffing and posting, while teams usually reach for a prediction of who will call.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 3.3K at peak, at an estimated $9.0K a month. A mistake is expensive in the way unit-hours idle measures it.

**What success looks like.** Offline: Weighted quantile loss by zone, Peak error and Coverage of intervals. Online: Response times, Unit-hours idle and Coverage gaps by zone. The launch is judged on "Response times" while "Unit-hours idle" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast ambulance demand by area and hour from aggregated call volumes, weather and events so staffing and posting plans match likely demand.

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

- Hourly forecast per zone for 14 days
- Aggregated counts only
- Interval output
- Events and weather as inputs
- 200 zones

## The approach in one paragraph

Start with same hour last week demand by zone, because planners use it today. Then earn the move to a hierarchical forecaster with weather and event covariates, intervals and a staffing translator that converts demand to unit-hours with coverage targets, and only if it beats the baseline on Weighted quantile loss by zone and Peak error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Same time last week calls | Calls in the same hour in past weeks. Anchor. Guard against: aligned. |
| Add Weather and heat alerts | Temperature and storm alerts. Demand driver. Guard against: from weather. |
| Add Events and holidays | Event calendar. Demand driver. Guard against: from calendars. |
| Run it as one pipeline | Call count extraction (CAD), Incident aggregation (batch), Incident feature build (weather and calendar joins), Incident forecast model (gradient boosting), Incident interval estimate (quantile heads), Staffing view (planning tool) and Incident accuracy tracking (weekly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle heatwave | Heat features and wider intervals. |

**Deliberately not doing**

- Dispatcher name: irrelevant.
- Unit name: an identifier.
- Call text: not needed for volume.

**How the approach is proven**

Prove it offline on Weighted quantile loss by zone, Peak error and Coverage of intervals using time-ordered splits, then online on "Response times" with "Unit-hours idle" as the guardrail. Watch for: Individual-level prediction, Past demand as the coverage target and Single-value forecasts.

## Baseline and production design

- **Baseline (build this first):** Same hour last week demand by zone, because planners use it today.
- **Production design:** A hierarchical forecaster with weather and event covariates, intervals and a staffing translator that converts demand to unit-hours with coverage targets.

## Why AI, and why this kind

**Why AI.** Forecast ambulance demand by area and hour from aggregated call volumes, weather and events so staffing and posting plans match likely demand. The evidence that separates good from bad outcomes (Same time last week calls, Weather and heat alerts, Events and holidays) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "individual patient data" are what teams reach for first, and they fail because not needed for staffing. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A hierarchical forecaster with weather and event covariates, intervals and a staffing translator that converts demand to unit-hours with coverage targets.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Same time last week calls, Weather and heat alerts, Events and holidays and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Same hour last week demand by zone, because planners use it today | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A hierarchical forecaster with weather and event covariates, intervals and a staffing translator that converts demand to unit-hours with coverage targets | chosen | Meets the run-window envelope at $0.0010 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Response times) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Individual-level prediction.
- Evaluation trap: Past demand as the coverage target.
- Heatwave: demand moves outside history.
- Mass event: a concert causes spikes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
