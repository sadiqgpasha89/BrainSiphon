# Healthcare Overtime & Premium Pay Prediction: use-case brief

> Generated from the blueprint `healthcare/healthcare-overtime-premium-pay-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Overtime & Premium Pay Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast overtime, agency, premium and incentive labour hours and cost by facility, unit, role and pay period, and name the feasible lower-cost actions that respect labour agreements. The system has to run as a scheduled batch job, inside these limits: Forecasts 60K cost-centre and role series nightly by pay period, Scheduled hours and realised hours are held as separate quantities and The forecast reconciles to payroll definitions of overtime, premium and agency.

**Why it is hard.** The obvious approach is an analyst-defined overtime flag, and it fails because finance and operations then argue about what the number means. The second trap is in "Scheduled vs realised": the real signal is realised hours from timekeeping after approvals, while teams usually reach for scheduled hours as the target.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way accrual forecast error measures it.

**What success looks like.** Offline: WAPE and pinball loss by pay period, Interval coverage and Cost error against settled payroll. Online: Premium hours as a share of worked hours, Accrual forecast error and Share of recommended levers adopted. The launch is judged on "Premium hours as a share of worked hours" while "Accrual forecast error" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast overtime, agency, premium and incentive labour hours and cost by facility, unit, role and pay period, and name the feasible lower-cost actions that respect labour agreements.

**Training objective.** `\mathcal{L}=\sum_{t}\sum_{q}\rho_q\!\left(y_t-\hat y_t^{(q)}\right),\;\rho_q(u)=\max(qu,(q-1)u)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{t} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_q | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. (one value per quantile level q) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t^{(q)} | The model's prediction of y. (one value per time step or token t and quantile level q) |
| u | The forecast error for one cost-centre and role series: actual premium hours minus the quantile forecast, weighted asymmetrically by the quantile level q. |
| \max | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| q | Quantile level between 0 and 1, for example 0.9 for the 90th percentile. |

**Hard constraints**

- Forecasts 60K cost-centre and role series nightly by pay period
- Scheduled hours and realised hours are held as separate quantities
- The forecast reconciles to payroll definitions of overtime, premium and agency
- Recommendations respect collective agreements, labour law and approved staffing levels
- Scenario analysis shows what each lever changes before a manager acts
- No individual employee is ranked or flagged

## The approach in one paragraph

Start with last period's premium hours scaled by census growth. Then earn the move to hierarchical count and cost forecasting with exogenous vacancy, absence and census drivers, quantile outputs and a scenario engine that applies labour-rule filters before ranking interventions, and only if it beats the baseline on WAPE and pinball loss by pay period and Interval coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Vacancy hours | Open budgeted hours per cost centre and role. The core structural cause of premium labour. Guard against: use the vacancy snapshot at forecast time. |
| Add Absence and call-in rate | Trailing aggregate sick and unplanned absence by unit-shift. Late absences create the most expensive hours. Guard against: aggregate only and no individual health data. |
| Add Census-driven demand gap | Forecast demand minus rostered hours. Premium hours fill the gap that rosters leave. Guard against: use the forecast snapshot at the time of the scheduling decision. |
| Run it as one pipeline | Payroll and roster intake (SFTP extracts), Pay-code and rule normaliser (versioned rule table), Premium labour forecaster (hierarchical quantile model), Scenario engine (what-if simulator with rule filter) and Threshold and budget rules (policy rules), with Finance and nursing leader review and Forecast archive and feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle retroactive pay adjustment | Restatement table with as-of dates and training on settled periods only. |

**Deliberately not doing**

- Employee tenure and age: privacy risk and a route to unfair targeting.
- Single-period spikes from payroll corrections: retroactive pay adjustments distort the series.
- Cost centre rename: breaks series continuity not behaviour.

**How the approach is proven**

Prove it offline on WAPE and pinball loss by pay period, Interval coverage and Cost error against settled payroll using time-ordered splits, then online on "Premium hours as a share of worked hours" with "Accrual forecast error" as the guardrail. Watch for: Using scheduled hours as the target, Training on unsettled pay periods and Recommending levers that breach agreements.

## Baseline and production design

- **Baseline (build this first):** Last period's premium hours scaled by census growth.
- **Production design:** Hierarchical count and cost forecasting with exogenous vacancy, absence and census drivers, quantile outputs and a scenario engine that applies labour-rule filters before ranking interventions.

## Why AI, and why this kind

**Why AI.** Forecast overtime, agency, premium and incentive labour hours and cost by facility, unit, role and pay period, and name the feasible lower-cost actions that respect labour agreements. The evidence that separates good from bad outcomes (Vacancy hours, Absence and call-in rate, Census-driven demand gap) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "an analyst-defined overtime flag" are what teams reach for first, and they fail because finance and operations then argue about what the number means. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Hierarchical count and cost forecasting with exogenous vacancy, absence and census drivers, quantile outputs and a scenario engine that applies labour-rule filters before ranking interventions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Vacancy hours, Absence and call-in rate, Census-driven demand gap and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Last period's premium hours scaled by census growth | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hierarchical count and cost forecasting with exogenous vacancy, absence and census drivers, quantile outputs and a scenario engine that applies labour-rule filters before ranking interventions | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Premium hours as a share of worked hours) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using scheduled hours as the target.
- Evaluation trap: Training on unsettled pay periods.
- Retroactive pay adjustment: past periods change after the fact.
- New collective agreement: pay rules change on a date.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
