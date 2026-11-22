# Hospital Quality Measure Performance Forecasting: use-case brief

> Generated from the blueprint `healthcare/hospital-quality-measure-performance-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Hospital Quality Measure Performance Forecasting · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast quality measure outcomes and identify the facilities and units likely to miss internal or external performance targets early enough for improvement work to change the result. The system has to run as a scheduled batch job, inside these limits: Forecasts 8K measure-by-unit series monthly and weekly where volume allows, Measure logic is versioned and denominators are validated before any forecast and Reporting lag and data completeness are modelled explicitly.

**Why it is hard.** The obvious approach is home-made approximation of the measure, and it fails because a forecast of the wrong measure is worse than none. The second trap is in "Denominator": the real signal is validated denominator and case mix, while teams usually reach for raw event counts.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way lead time between a forecast miss and an intervention measures it.

**What success looks like.** Offline: WAPE and pinball loss by measure and horizon, Interval coverage by denominator size and Target-miss detection precision at the review budget. Online: Share of measures reaching target, Lead time between a forecast miss and an intervention and Improvement-plan completion. The launch is judged on "Share of measures reaching target" while "Lead time between a forecast miss and an intervention" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast quality measure outcomes and identify the facilities and units likely to miss internal or external performance targets early enough for improvement work to change the result.

**Training objective.** `\mathcal{L}=\sum_{t}\sum_{q}\rho_q\!\left(y_t-\hat y_t^{(q)}\right),\;\rho_q(u)=\max(qu,(q-1)u)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{t} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_q | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. (one value per quantile level q) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t^{(q)} | The model's prediction of y. (one value per time step or token t and quantile level q) |
| u | The forecast error for one measure-by-unit series: actual rate minus the quantile forecast, weighted asymmetrically by the quantile level q. |
| \max | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| q | Quantile level between 0 and 1, for example 0.9 for the 90th percentile. |

**Hard constraints**

- Forecasts 8K measure-by-unit series monthly and weekly where volume allows
- Measure logic is versioned and denominators are validated before any forecast
- Reporting lag and data completeness are modelled explicitly
- Small denominators carry wide intervals and are flagged not hidden
- Quality specialists validate measure logic and interventions
- Forecasts are internal planning estimates and never official results

## The approach in one paragraph

Start with last 12-month average of the measure with a linear trend. Then earn the move to measure-specific hierarchical time-series and regression models with exogenous process and case-mix drivers, completeness-aware nowcasting for lagged months, quantile outputs and a scenario layer tied to the measure version, and only if it beats the baseline on WAPE and pinball loss by measure and horizon and Interval coverage by denominator size after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Risk-adjusted rate trend | Rolling observed to expected ratio with case-mix adjustment. The fair comparator across units. Guard against: use the final adjusted data. |
| Add Denominator drift | Change in volume and exclusion share over time. Explains apparent rate changes. Guard against: use closed periods. |
| Add Process-measure lead indicator | Compliance with the care process that drives the outcome. Leads the outcome by weeks. Guard against: same definition as the process measure. |
| Run it as one pipeline | Measure data intake (warehouse extracts), Denominator and version validator (measure rules), Completeness nowcaster (lag-adjusted model), Quality measure forecaster (hierarchical quantile model) and Target-gap and scenario builder (rules), with Quality specialist review and Forecast archive and feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle measure specification changes | Version tag per series and a break in the training window. |

**Deliberately not doing**

- Single-month spikes in small units: statistical noise.
- Unvalidated manual counts: inconsistent and unauditable.
- Provider names: unfair and not a system driver.

**How the approach is proven**

Prove it offline on WAPE and pinball loss by measure and horizon, Interval coverage by denominator size and Target-miss detection precision at the review budget using time-ordered splits, then online on "Share of measures reaching target" with "Lead time between a forecast miss and an intervention" as the guardrail. Watch for: Backtesting on final data without reporting lag, Mixing measure versions in training and Ranking units by point rates.

## Baseline and production design

- **Baseline (build this first):** Last 12-month average of the measure with a linear trend.
- **Production design:** Measure-specific hierarchical time-series and regression models with exogenous process and case-mix drivers, completeness-aware nowcasting for lagged months, quantile outputs and a scenario layer tied to the measure version.

## Why AI, and why this kind

**Why AI.** Forecast quality measure outcomes and identify the facilities and units likely to miss internal or external performance targets early enough for improvement work to change the result. The evidence that separates good from bad outcomes (Risk-adjusted rate trend, Denominator drift, Process-measure lead indicator) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "home-made approximation of the measure" are what teams reach for first, and they fail because A forecast of the wrong measure is worse than none. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Measure-specific hierarchical time-series and regression models with exogenous process and case-mix drivers, completeness-aware nowcasting for lagged months, quantile outputs and a scenario layer tied to the measure version.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Risk-adjusted rate trend, Denominator drift, Process-measure lead indicator and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Last 12-month average of the measure with a linear trend | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Measure-specific hierarchical time-series and regression models with exogenous process and case-mix drivers, completeness-aware nowcasting for lagged months, quantile outputs and a scenario layer tied to the measure version | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Share of measures reaching target) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Backtesting on final data without reporting lag.
- Evaluation trap: Mixing measure versions in training.
- Measure specification changes: history is no longer comparable.
- Late data corrections: past values change.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
