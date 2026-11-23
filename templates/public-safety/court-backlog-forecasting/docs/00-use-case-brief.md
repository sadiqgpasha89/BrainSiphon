# Court Backlog Forecasting: use-case brief

> Generated from the blueprint `public-safety/court-backlog-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Court Backlog Forecasting · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast filings, disposals and backlog by court and case type so judicial resources and funding plans reflect expected demand. The system has to run as a scheduled batch job, inside these limits: Monthly forecast for 24 months, Scenarios for new rules and resources and Aggregated case counts only.

**Why it is hard.** The obvious approach is backlog counts only, and it fails because the age matters for fairness. The second trap is in "Scenario": the real signal is capacity and rule change scenarios, while teams usually reach for a single trend.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way time to disposal measures it.

**What success looks like.** Offline: Filing forecast error, Backlog age error and Scenario usefulness. Online: Backlog age, Time to disposal and Resource planning accuracy. The launch is judged on "Backlog age" while "Time to disposal" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast filings, disposals and backlog by court and case type so judicial resources and funding plans reflect expected demand.

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

- Monthly forecast for 24 months
- Scenarios for new rules and resources
- Aggregated case counts only
- Reviewed by court administrators
- 300 courts

## The approach in one paragraph

Start with last year's filings and disposals scaled by trend, because it is the common planning approach. Then earn the move to a stock and flow forecast by case type with capacity and policy scenarios and an age profile of the backlog for administrators, and only if it beats the baseline on Filing forecast error and Backlog age error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Filing counts by type | Monthly new cases. Inflow. Guard against: from the case system. |
| Add Disposal rate by type | Monthly closures. Outflow. Guard against: from the case system. |
| Add Judicial capacity | Judge and registrar days. Constraint. Guard against: from planning. |
| Run it as one pipeline | Aggregated counts (case system), Cleaning (batch), Flow model (time-series model), Scenario engine (simulation), Age profile (analytics) and Accuracy tracking (quarterly), with Administrator review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle law change | Policy scenario inputs. |

**Deliberately not doing**

- Judge name: irrelevant.
- Party name: personal data.
- Case number: an identifier.

**How the approach is proven**

Prove it offline on Filing forecast error, Backlog age error and Scenario usefulness using time-ordered splits, then online on "Backlog age" with "Time to disposal" as the guardrail. Watch for: Backlog counts only, Single-scenario plans and Case-level data in planning.

## Baseline and production design

- **Baseline (build this first):** Last year's filings and disposals scaled by trend, because it is the common planning approach.
- **Production design:** A stock and flow forecast by case type with capacity and policy scenarios and an age profile of the backlog for administrators.

## Why AI, and why this kind

**Why AI.** Forecast filings, disposals and backlog by court and case type so judicial resources and funding plans reflect expected demand. The evidence that separates good from bad outcomes (Filing counts by type, Disposal rate by type, Judicial capacity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "backlog counts only" are what teams reach for first, and they fail because the age matters for fairness. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A stock and flow forecast by case type with capacity and policy scenarios and an age profile of the backlog for administrators.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Filing counts by type, Disposal rate by type, Judicial capacity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Last year's filings and disposals scaled by trend, because it is the common planning approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A stock and flow forecast by case type with capacity and policy scenarios and an age profile of the backlog for administrators | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Backlog age) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Backlog counts only.
- Evaluation trap: Single-scenario plans.
- Law change: new offences create filings.
- Data change: case coding is revised.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
