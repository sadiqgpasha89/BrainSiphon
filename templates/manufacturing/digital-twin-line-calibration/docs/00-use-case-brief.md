# Digital Twin Calibration for Line Simulation: use-case brief

> Generated from the blueprint `manufacturing/digital-twin-line-calibration` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Digital Twin Calibration for Line Simulation · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Calibrate a discrete-event simulation of a production line from real event data so what-if tests on layout, buffers and staffing give trustworthy answers. The system has to run as a scheduled batch job, inside these limits: The twin reproduces throughput within 3% on held-out weeks, Calibration reruns monthly and Every parameter has a source.

**Why it is hard.** The obvious approach is a fit to the training period, and it fails because a twin that only matches the past gives false confidence. The second trap is in "Parameters": the real signal is distributions of times and failures from event data, while teams usually reach for average values.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $2.2K a month. A mistake is expensive in the way trial costs avoided measures it.

**What success looks like.** Offline: Throughput error on held-out weeks, Distribution fit quality and Prediction of known past interventions. Online: Decisions with simulated evidence, Trial costs avoided and Layout change surprises. The launch is judged on "Decisions with simulated evidence" while "Trial costs avoided" must not get worse.

## Objective, loss and constraints

**Business objective.** Calibrate a discrete-event simulation of a production line from real event data so what-if tests on layout, buffers and staffing give trustworthy answers.

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

- The twin reproduces throughput within 3% on held-out weeks
- Calibration reruns monthly
- Every parameter has a source
- Used for decisions only with documented validity ranges

## The approach in one paragraph

Start with a spreadsheet model of line capacity from nominal cycle times, because it is the planning approach and the benchmark. Then earn the move to a discrete-event simulation with fitted distributions and automatic calibration against event logs, validation on held-out periods and a library of tested scenarios, and only if it beats the baseline on Throughput error on held-out weeks and Distribution fit quality after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Process time distribution | Fitted distribution of cycle times per station. Core input. Guard against: per product. |
| Add Failure and repair distributions | Time between failures and repair times. Availability. Guard against: from downtime data. |
| Add Buffer and routing rules | Buffer sizes and priorities. Flow behaviour. Guard against: from engineering. |
| Run it as one pipeline | Event log extraction (MES), Distribution fitting (statistical fits), Simulation build (discrete-event engine), Calibration (parameter search), Validation on held-out weeks (backtests) and Scenario library (analytics), with Report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle recipe change | Recalibration trigger on approved changes. |

**Deliberately not doing**

- Station name: an identifier.
- Operator name: not a driver.
- Report time: an artefact.

**How the approach is proven**

Prove it offline on Throughput error on held-out weeks, Distribution fit quality and Prediction of known past interventions using time-ordered splits, then online on "Decisions with simulated evidence" with "Trial costs avoided" as the guardrail. Watch for: Fitting to the training period only, Using averages and Undocumented validity.

## Baseline and production design

- **Baseline (build this first):** A spreadsheet model of line capacity from nominal cycle times, because it is the planning approach and the benchmark.
- **Production design:** A discrete-event simulation with fitted distributions and automatic calibration against event logs, validation on held-out periods and a library of tested scenarios.

## Why AI, and why this kind

**Why AI.** Calibrate a discrete-event simulation of a production line from real event data so what-if tests on layout, buffers and staffing give trustworthy answers. The evidence that separates good from bad outcomes (Process time distribution, Failure and repair distributions, Buffer and routing rules) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A fit to the training period" are what teams reach for first, and they fail because A twin that only matches the past gives false confidence. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A discrete-event simulation with fitted distributions and automatic calibration against event logs, validation on held-out periods and a library of tested scenarios.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Process time distribution, Failure and repair distributions, Buffer and routing rules and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A spreadsheet model of line capacity from nominal cycle times, because it is the planning approach and the benchmark | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A discrete-event simulation with fitted distributions and automatic calibration against event logs, validation on held-out periods and a library of tested scenarios | chosen | Meets the run-window envelope at $0.049 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Decisions with simulated evidence) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Fitting to the training period only.
- Evaluation trap: Using averages.
- Recipe change: process times shift.
- Rare breakdowns: little data for repair times.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
