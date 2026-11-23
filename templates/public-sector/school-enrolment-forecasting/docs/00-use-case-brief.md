# School Enrolment Forecasting: use-case brief

> Generated from the blueprint `public-sector/school-enrolment-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** School Enrolment Forecasting · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast student numbers by school and year from births, housing and migration so capacity, catchments and staffing are planned in time. The system has to run as a scheduled batch job, inside these limits: Forecast for 10 years with intervals, Aggregated data by catchment and Housing development pipeline as input.

**Why it is hard.** The obvious approach is a trend line, and it fails because trends miss new housing and policy changes. The second trap is in "Use": the real signal is capacity and catchment planning, while teams usually reach for a school ranking.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way temporary classroom cost measures it.

**What success looks like.** Offline: Error by school and horizon, Coverage of intervals and Capacity gap prediction accuracy. Online: Over- and under-capacity schools, Temporary classroom cost and Planning accuracy. The launch is judged on "Over- and under-capacity schools" while "Temporary classroom cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast student numbers by school and year from births, housing and migration so capacity, catchments and staffing are planned in time.

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

- Forecast for 10 years with intervals
- Aggregated data by catchment
- Housing development pipeline as input
- Annual refresh for 2K schools

## The approach in one paragraph

Start with a linear trend of past enrolment by school, because planners use it as a rule of thumb. Then earn the move to a cohort-component model with housing pipeline inputs and scenarios for capacity planning, reviewed by the education planning team, and only if it beats the baseline on Error by school and horizon and Coverage of intervals after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Births by area | Births five years earlier. Entry cohort. Guard against: from registers. |
| Add Housing completions | New homes by type and area. Growth. Guard against: from planning data. |
| Add Cohort progression | Transition rates between grades. Flow. Guard against: from past enrolment. |
| Run it as one pipeline | Enrolment and births data (education and registers), Cohort model (cohort-component), Housing pipeline join (planning data), Scenario ranges (simulation), Capacity gap analysis (planning tool) and Accuracy tracking (annual), with Planner review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new housing delayed | Scenario updates. |

**Deliberately not doing**

- School name: an identifier.
- Head teacher name: irrelevant.
- Report format: an artefact.

**How the approach is proven**

Prove it offline on Error by school and horizon, Coverage of intervals and Capacity gap prediction accuracy using time-ordered splits, then online on "Over- and under-capacity schools" with "Temporary classroom cost" as the guardrail. Watch for: Trend-only forecasts, Individual pupil tracking and Single-scenario plans.

## Baseline and production design

- **Baseline (build this first):** A linear trend of past enrolment by school, because planners use it as a rule of thumb.
- **Production design:** A cohort-component model with housing pipeline inputs and scenarios for capacity planning, reviewed by the education planning team.

## Why AI, and why this kind

**Why AI.** Forecast student numbers by school and year from births, housing and migration so capacity, catchments and staffing are planned in time. The evidence that separates good from bad outcomes (Births by area, Housing completions, Cohort progression) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A trend line" are what teams reach for first, and they fail because trends miss new housing and policy changes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A cohort-component model with housing pipeline inputs and scenarios for capacity planning, reviewed by the education planning team.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Births by area, Housing completions, Cohort progression and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A linear trend of past enrolment by school, because planners use it as a rule of thumb | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A cohort-component model with housing pipeline inputs and scenarios for capacity planning, reviewed by the education planning team | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Over- and under-capacity schools) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Trend-only forecasts.
- Evaluation trap: Individual pupil tracking.
- New housing delayed: the pipeline slips.
- Policy change: catchments change.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
