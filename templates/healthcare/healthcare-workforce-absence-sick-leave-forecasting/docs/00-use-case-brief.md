# Healthcare Workforce Absence & Sick Leave Forecasting: use-case brief

> Generated from the blueprint `healthcare/healthcare-workforce-absence-sick-leave-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Workforce Absence & Sick Leave Forecasting · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast aggregate absence levels by role, unit, location and shift so leaders can size contingency staffing, using aggregate data only and never inferring any individual's health. The system has to run as a scheduled batch job, inside these limits: Forecasts 30K unit-shift-role series nightly of absence counts and rates, Aggregate counts with small-cell suppression and no individual-level output and No health inference about any person and no reason codes in the model.

**Why it is hard.** The obvious approach is individual absence histories, and it fails because individual histories are sensitive and unnecessary. The second trap is in "Seasonality": the real signal is weekly, annual and holiday patterns learned explicitly, while teams usually reach for a flat average.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way premium hours on high-absence days measures it.

**What success looks like.** Offline: WAPE and pinball loss by horizon, Interval coverage and Contingency hours shortfall at the 90th percentile. Online: Contingency cover available when needed, Premium hours on high-absence days and Short-notice gap rate. The launch is judged on "Contingency cover available when needed" while "Premium hours on high-absence days" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast aggregate absence levels by role, unit, location and shift so leaders can size contingency staffing, using aggregate data only and never inferring any individual's health.

**Training objective.** `\mathcal{L}=\sum_{t}\sum_{q}\rho_q\!\left(y_t-\hat y_t^{(q)}\right),\;\rho_q(u)=\max(qu,(q-1)u)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{t} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_q | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. (one value per quantile level q) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t^{(q)} | The model's prediction of y. (one value per time step or token t and quantile level q) |
| u | The forecast error for one unit-shift-role series: actual absence count minus the quantile forecast, weighted asymmetrically by the quantile level q. |
| \max | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| q | Quantile level between 0 and 1, for example 0.9 for the 90th percentile. |

**Hard constraints**

- Forecasts 30K unit-shift-role series nightly of absence counts and rates
- Aggregate counts with small-cell suppression and no individual-level output
- No health inference about any person and no reason codes in the model
- Forecasts support planning only and are never used in individual decisions
- Prediction intervals accompany every forecast
- Contingency staffing requirement derived by a separate rule

## The approach in one paragraph

Start with same weekday trailing average of the unit absence rate. Then earn the move to count-aware hierarchical forecast of absence with quantile outputs and a seasonal baseline, evaluated by horizon, with a separate rule that converts the forecast into contingency hours, and only if it beats the baseline on WAPE and pinball loss by horizon and Interval coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Weekday and season profile | Day-of-week and week-of-year effects per unit. Absence is highly regular. Guard against: fit on past periods only. |
| Add Recent absence trend | Trailing 7 and 28 day aggregate absence rate. Absence clusters in time. Guard against: aggregate and lag. |
| Add Shift-pattern load | Share of night and long shifts in the unit. Patterns relate to absence. Guard against: use the roster snapshot. |
| Run it as one pipeline | Aggregate absence intake (governed extracts), Suppression and aggregation rules (privacy policy), Absence forecaster (hierarchical count model) and Contingency sizing (rule table), with Workforce planner review and Forecast archive off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle small unit with sparse counts | Pool with peer units above the minimum size. |

**Deliberately not doing**

- Individual health or leave reasons: sensitive data.
- Past absence counts per person: privacy risk and stigma.
- Manager identity: not a stable driver.

**How the approach is proven**

Prove it offline on WAPE and pinball loss by horizon, Interval coverage and Contingency hours shortfall at the 90th percentile using time-ordered splits, then online on "Contingency cover available when needed" with "Premium hours on high-absence days" as the guardrail. Watch for: Training with individual reasons, Ignoring suppression in the test set and Judging only on mean error.

## Baseline and production design

- **Baseline (build this first):** Same weekday trailing average of the unit absence rate.
- **Production design:** Count-aware hierarchical forecast of absence with quantile outputs and a seasonal baseline, evaluated by horizon, with a separate rule that converts the forecast into contingency hours.

## Why AI, and why this kind

**Why AI.** Forecast aggregate absence levels by role, unit, location and shift so leaders can size contingency staffing, using aggregate data only and never inferring any individual's health. The evidence that separates good from bad outcomes (Weekday and season profile, Recent absence trend, Shift-pattern load) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "individual absence histories" are what teams reach for first, and they fail because individual histories are sensitive and unnecessary. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Count-aware hierarchical forecast of absence with quantile outputs and a seasonal baseline, evaluated by horizon, with a separate rule that converts the forecast into contingency hours.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Weekday and season profile, Recent absence trend, Shift-pattern load and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Same weekday trailing average of the unit absence rate | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Count-aware hierarchical forecast of absence with quantile outputs and a seasonal baseline, evaluated by horizon, with a separate rule that converts the forecast into contingency hours | chosen | Meets the run-window envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Contingency cover available when needed) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training with individual reasons.
- Evaluation trap: Ignoring suppression in the test set.
- Small unit with sparse counts: unstable estimates.
- Outbreak week: absence jumps beyond history.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
