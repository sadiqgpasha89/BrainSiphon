# Team Delivery Forecasting: use-case brief

> Generated from the blueprint `devtools/team-delivery-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Team Delivery Forecasting · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast when a set of work items will be delivered from historical flow data, with ranges, so teams and stakeholders plan with uncertainty and not point estimates, without comparing individuals. The system has to run as a scheduled batch job, inside these limits: Forecast as a range with probabilities, Team-level data only and No individual velocity.

**Why it is hard.** The obvious approach is story point sums, and it fails because points are not comparable. The second trap is in "Level": the real signal is team flow data, while teams usually reach for individual output.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way planning surprises measures it.

**What success looks like.** Offline: Calibration of date ranges, Hit rate at the 85th percentile and Forecast error. Online: Missed delivery dates, Planning surprises and Time spent estimating. The launch is judged on "Missed delivery dates" while "Planning surprises" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast when a set of work items will be delivered from historical flow data, with ranges, so teams and stakeholders plan with uncertainty and not point estimates, without comparing individuals.

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

- Forecast as a range with probabilities
- Team-level data only
- No individual velocity
- Refresh daily for 2K teams

## The approach in one paragraph

Start with estimated points divided by average velocity, because it is the common planning method. Then earn the move to a flow-based Monte Carlo forecaster with scope change and wip inputs, producing delivery date ranges and a what-if view for planners, and only if it beats the baseline on Calibration of date ranges and Hit rate at the 85th percentile after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Throughput history | Items finished per period. Core. Guard against: from the tracker. |
| Add Cycle time distribution | Time from start to done. Core. Guard against: from the tracker. |
| Add Work in progress | Items in flight. Flow. Guard against: from the tracker. |
| Run it as one pipeline | Work item history (tracker), Distribution fitting (statistics), Monte Carlo simulation (forecaster), Scope change model (time-series), Range output (planning dashboard) and Accuracy tracking (quarterly), with Team review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new team | Pooled priors and wide ranges. |

**Deliberately not doing**

- Developer name: personal data.
- Item title wording: weak link.
- Story points: not comparable across teams.

**How the approach is proven**

Prove it offline on Calibration of date ranges, Hit rate at the 85th percentile and Forecast error using time-ordered splits, then online on "Missed delivery dates" with "Planning surprises" as the guardrail. Watch for: Point estimates, Individual velocity and Story point sums.

## Baseline and production design

- **Baseline (build this first):** Estimated points divided by average velocity, because it is the common planning method.
- **Production design:** A flow-based Monte Carlo forecaster with scope change and wip inputs, producing delivery date ranges and a what-if view for planners.

## Why AI, and why this kind

**Why AI.** Forecast when a set of work items will be delivered from historical flow data, with ranges, so teams and stakeholders plan with uncertainty and not point estimates, without comparing individuals. The evidence that separates good from bad outcomes (Throughput history, Cycle time distribution, Work in progress) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "story point sums" are what teams reach for first, and they fail because points are not comparable. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A flow-based Monte Carlo forecaster with scope change and wip inputs, producing delivery date ranges and a what-if view for planners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Throughput history, Cycle time distribution, Work in progress and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Estimated points divided by average velocity, because it is the common planning method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A flow-based Monte Carlo forecaster with scope change and wip inputs, producing delivery date ranges and a what-if view for planners | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Missed delivery dates) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Point estimates.
- Evaluation trap: Individual velocity.
- New team: the team has too little delivery history for a stable forecast.
- Process change: a process change alters how work flows through the team.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
