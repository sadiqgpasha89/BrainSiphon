# Engineering Resource Capacity Planning: use-case brief

> Generated from the blueprint `engineering/engineering-resource-capacity-planning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Engineering Resource Capacity Planning · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast demand for engineering skills against available capacity across projects and recommend hiring, subcontracting or re-sequencing, at team and skill level and not individual level. The system has to run as a scheduled batch job, inside these limits: Planning at skill and team level, No individual utilisation ranking and Managers decide on hiring and assignments.

**Why it is hard.** The obvious approach is named individuals, and it fails because individual utilisation scoring distorts timesheets. The second trap is in "Demand": the real signal is probabilistic pipeline of projects, while teams usually reach for only won projects.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way unmet demand measures it.

**What success looks like.** Offline: Demand forecast error, Calibration of ranges and Gap detection accuracy. Online: Idle capacity, Unmet demand and Overtime hours. The launch is judged on "Idle capacity" while "Unmet demand" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast demand for engineering skills against available capacity across projects and recommend hiring, subcontracting or re-sequencing, at team and skill level and not individual level.

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

- Planning at skill and team level
- No individual utilisation ranking
- Managers decide on hiring and assignments
- Forecast horizon of 12 months
- 5K staff

## The approach in one paragraph

Start with resource planning in spreadsheets by discipline leads, because it is the common practice. Then earn the move to a planning model that converts pipeline and past effort profiles into skill demand ranges and shows gaps and options by team for management, and only if it beats the baseline on Demand forecast error and Calibration of ranges after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Project pipeline and stage | Likely work and timing. Core. Guard against: from the pipeline. |
| Add Effort by phase and discipline | Hours per phase. Core. Guard against: from past projects. |
| Add Staff capacity by skill | Available hours. Constraint. Guard against: from HR planning. |
| Run it as one pipeline | Pipeline and effort data (project systems), Demand forecast (time-series model), Capacity data (HR planning), Gap analysis (analytics), Option scenarios (planner), Manager decision (resource board) and Accuracy tracking (quarterly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle win rate shift | Updating conversion rates. |

**Deliberately not doing**

- Employee name: personal data.
- Timesheet comment: personal data.
- Project nickname: irrelevant.

**How the approach is proven**

Prove it offline on Demand forecast error, Calibration of ranges and Gap detection accuracy using time-ordered splits, then online on "Idle capacity" with "Unmet demand" as the guardrail. Watch for: Individual utilisation ranking, Only won projects and Overtime as the solution.

## Baseline and production design

- **Baseline (build this first):** Resource planning in spreadsheets by discipline leads, because it is the common practice.
- **Production design:** A planning model that converts pipeline and past effort profiles into skill demand ranges and shows gaps and options by team for management.

## Why AI, and why this kind

**Why AI.** Forecast demand for engineering skills against available capacity across projects and recommend hiring, subcontracting or re-sequencing, at team and skill level and not individual level. The evidence that separates good from bad outcomes (Project pipeline and stage, Effort by phase and discipline, Staff capacity by skill) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "named individuals" are what teams reach for first, and they fail because individual utilisation scoring distorts timesheets. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A planning model that converts pipeline and past effort profiles into skill demand ranges and shows gaps and options by team for management.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Project pipeline and stage, Effort by phase and discipline, Staff capacity by skill and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Resource planning in spreadsheets by discipline leads, because it is the common practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A planning model that converts pipeline and past effort profiles into skill demand ranges and shows gaps and options by team for management | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Idle capacity) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Individual utilisation ranking.
- Evaluation trap: Only won projects.
- Win rate shift: the pipeline converts differently.
- Skill shortage: no supply exists.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
