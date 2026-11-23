# Benefits Office Caseload Forecasting: use-case brief

> Generated from the blueprint `public-sector/benefits-caseload-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Benefits Office Caseload Forecasting · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast applications, calls and appointments by office and week so staffing, outreach and processing times match demand. The system has to run as a scheduled batch job, inside these limits: Weekly forecast for 26 weeks, Interval output and Policy changes and deadlines as inputs.

**Why it is hard.** The obvious approach is history only, and it fails because demand reacts to events. The second trap is in "Granularity": the real signal is office and service line, while teams usually reach for national totals.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way overtime measures it.

**What success looks like.** Offline: Forecast error by office, Coverage of intervals and Surge detection lead time. Online: Processing time, Overtime and Backlog size. The launch is judged on "Processing time" while "Overtime" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast applications, calls and appointments by office and week so staffing, outreach and processing times match demand.

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

- Weekly forecast for 26 weeks
- Interval output
- Policy changes and deadlines as inputs
- Aggregated data only
- 400 offices

## The approach in one paragraph

Start with same week last year scaled by recent trend, because it is a common planning rule. Then earn the move to a hierarchical forecaster with policy and economic covariates, scenario ranges and a staffing translator that converts demand to hours, and only if it beats the baseline on Forecast error by office and Coverage of intervals after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Past applications and calls | Weekly counts by service. Anchor. Guard against: from case systems. |
| Add Policy and deadline calendar | Rule changes and filing deadlines. Shifts. Guard against: from the calendar. |
| Add Local employment indicators | Unemployment and claims data. Demand driver. Guard against: from statistics. |
| Run it as one pipeline | Counts extraction (case systems), Feature build (calendar and statistics joins), Citizen forecast model (gradient boosting), Citizen hierarchical reconciliation (rules), Citizen scenario ranges (simulation) and Staffing plan (planning tool), with Citizen accuracy review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle policy surge | Scenario inputs from policy teams. |

**Deliberately not doing**

- Staff name: irrelevant.
- Office code: an identifier.
- Report format: an artefact.

**How the approach is proven**

Prove it offline on Forecast error by office, Coverage of intervals and Surge detection lead time using time-ordered splits, then online on "Processing time" with "Overtime" as the guardrail. Watch for: History-only forecasts, National-only planning and Ignoring deadlines.

## Baseline and production design

- **Baseline (build this first):** Same week last year scaled by recent trend, because it is a common planning rule.
- **Production design:** A hierarchical forecaster with policy and economic covariates, scenario ranges and a staffing translator that converts demand to hours.

## Why AI, and why this kind

**Why AI.** Forecast applications, calls and appointments by office and week so staffing, outreach and processing times match demand. The evidence that separates good from bad outcomes (Past applications and calls, Policy and deadline calendar, Local employment indicators) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "history only" are what teams reach for first, and they fail because demand reacts to events. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A hierarchical forecaster with policy and economic covariates, scenario ranges and a staffing translator that converts demand to hours.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Past applications and calls, Policy and deadline calendar, Local employment indicators and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Same week last year scaled by recent trend, because it is a common planning rule | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A hierarchical forecaster with policy and economic covariates, scenario ranges and a staffing translator that converts demand to hours | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Processing time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: History-only forecasts.
- Evaluation trap: National-only planning.
- Policy surge: new rules create sudden demand.
- Economic shock: new claims jump for several weeks.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
