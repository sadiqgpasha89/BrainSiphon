# Construction Equipment Telematics Analytics: use-case brief

> Generated from the blueprint `engineering/construction-equipment-telematics-analytics` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Construction Equipment Telematics Analytics · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Use equipment telemetry to estimate utilisation, idle time, fuel use and maintenance needs by machine type and site so fleets are planned and serviced better, without scoring operators. The system has to run as a scheduled batch job, inside these limits: Analysis at machine and fleet level, No operator ranking and Maintenance alerts at least 7 days ahead.

**Why it is hard.** The obvious approach is operator, and it fails because operator ranking harms trust and reporting. The second trap is in "Metric": the real signal is productive hours and fuel per task, while teams usually reach for engine hours alone.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way fuel cost measures it.

**What success looks like.** Offline: Failure prediction accuracy, Utilisation accuracy and Lead time. Online: Unplanned machine downtime, Fuel cost and Idle time. The launch is judged on "Unplanned machine downtime" while "Fuel cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Use equipment telemetry to estimate utilisation, idle time, fuel use and maintenance needs by machine type and site so fleets are planned and serviced better, without scoring operators.

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

- Analysis at machine and fleet level
- No operator ranking
- Maintenance alerts at least 7 days ahead
- Daily data from 10K machines
- Owners approve service plans

## The approach in one paragraph

Start with fixed service intervals by engine hours, because they are the standard schedule. Then earn the move to a fleet analytics service with condition-based maintenance predictions and utilisation reports by machine type and site that planners use to reallocate and service machines, and only if it beats the baseline on Failure prediction accuracy and Utilisation accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Engine and hydraulic telemetry | Temperatures, pressures and hours. Core. Guard against: from telematics. |
| Add Idle and productive time | State of operation. Core. Guard against: from telematics. |
| Add Duty cycle by task | Machine use pattern. Context. Guard against: from site data. |
| Run it as one pipeline | Telemetry ingestion (telematics gateway), State classification (rules and model), Utilisation analytics (batch), Failure risk (gradient boosting), Service plan (maintenance system) and Outcome tracking (monthly), with Fleet planner review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing signals | Store and forward. |

**Deliberately not doing**

- Operator name: personal data.
- Machine nickname: irrelevant.
- Site manager name: personal data.

**How the approach is proven**

Prove it offline on Failure prediction accuracy, Utilisation accuracy and Lead time using time-ordered splits, then online on "Unplanned machine downtime" with "Fuel cost" as the guardrail. Watch for: Operator ranking, Engine hours as productivity and Penalties.

## Baseline and production design

- **Baseline (build this first):** Fixed service intervals by engine hours, because they are the standard schedule.
- **Production design:** A fleet analytics service with condition-based maintenance predictions and utilisation reports by machine type and site that planners use to reallocate and service machines.

## Why AI, and why this kind

**Why AI.** Use equipment telemetry to estimate utilisation, idle time, fuel use and maintenance needs by machine type and site so fleets are planned and serviced better, without scoring operators. The evidence that separates good from bad outcomes (Engine and hydraulic telemetry, Idle and productive time, Duty cycle by task) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "operator" are what teams reach for first, and they fail because operator ranking harms trust and reporting. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A fleet analytics service with condition-based maintenance predictions and utilisation reports by machine type and site that planners use to reallocate and service machines.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Engine and hydraulic telemetry, Idle and productive time, Duty cycle by task and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed service intervals by engine hours, because they are the standard schedule | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A fleet analytics service with condition-based maintenance predictions and utilisation reports by machine type and site that planners use to reallocate and service machines | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unplanned machine downtime) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Operator ranking.
- Evaluation trap: Engine hours as productivity.
- Missing signals: machines lose connectivity.
- Mixed fleets: machines report in different formats.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
