# Healthcare Workforce Demand Forecasting by Unit: use-case brief

> Generated from the blueprint `healthcare/healthcare-workforce-demand-forecasting-by-unit` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Workforce Demand Forecasting by Unit · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast role- and skill-specific staffing demand for every facility, unit and shift so leaders can plan rosters and contingency cover days or weeks ahead instead of discovering shortfalls at shift start. The system has to run as a scheduled batch job, inside these limits: Forecasts 40K unit-shift-role series nightly at hourly, shift, day and week horizons, Facility totals must reconcile to the sum of unit forecasts and Workload demand is kept separate from the legally or policy-required minimum coverage.

**Why it is hard.** The obvious approach is scheduled hours or paid hours as the label, and it fails because scheduled hours encode past understaffing and past overstaffing as if they were demand. The second trap is in "Hierarchy": the real signal is unit forecasts reconciled to facility and system totals, while teams usually reach for independent forecasts per unit that disagree with the facility total.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way share of shifts covered by premium labour measures it.

**What success looks like.** Offline: WAPE and pinball loss by horizon and role, Interval coverage at 80 and 95 percent and Reconciliation error between unit and facility totals. Online: Fill rate of planned shifts at publication, Share of shifts covered by premium labour and Forecast-to-actual worked-hours gap. The launch is judged on "Fill rate of planned shifts at publication" while "Share of shifts covered by premium labour" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast role- and skill-specific staffing demand for every facility, unit and shift so leaders can plan rosters and contingency cover days or weeks ahead instead of discovering shortfalls at shift start.

**Training objective.** `\mathcal{L}=\sum_{t}\sum_{q}\rho_q\!\left(y_t-\hat y_t^{(q)}\right),\;\rho_q(u)=\max(qu,(q-1)u)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{t} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_q | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. (one value per quantile level q) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t^{(q)} | The model's prediction of y. (one value per time step or token t and quantile level q) |
| u | The forecast error for one unit-shift series: actual demand minus the quantile forecast, weighted asymmetrically by the quantile level q. |
| \max | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| q | Quantile level between 0 and 1, for example 0.9 for the 90th percentile. |

**Hard constraints**

- Forecasts 40K unit-shift-role series nightly at hourly, shift, day and week horizons
- Facility totals must reconcile to the sum of unit forecasts
- Workload demand is kept separate from the legally or policy-required minimum coverage
- Staffing leaders approve every roster change and nothing auto-assigns staff outside credentials, contracts or policy
- Pseudonymous employee IDs only and aggregate demand by role
- Prediction intervals are published beside every point forecast

## The approach in one paragraph

Start with seasonal-naive forecast of worked hours by unit and shift from the same weekday in recent weeks. Then earn the move to hierarchical gradient-boosted and statistical ensemble with exogenous workload drivers, quantile outputs, bottom-up and top-down reconciliation across unit, facility and system, and a deterministic policy-minimum floor applied after the model, and only if it beats the baseline on WAPE and pinball loss by horizon and role and Interval coverage at 80 and 95 percent after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Acuity-weighted workload | Sum of acuity scores times expected hours of care per patient-day. Workload, not headcount, drives the staff a unit needs. Guard against: use the acuity score as charted at forecast time. |
| Add Planned procedure load | Scheduled cases by service line and day with historical conversion to inpatient stays. Elective volume is the most predictable driver of inpatient demand weeks ahead. Guard against: use the schedule snapshot as it stood at forecast time, not the cases that finally happened. |
| Add Admission and discharge rhythm | Day-of-week and hour-of-day arrival and discharge profile per unit. Staffing demand follows patient flow within the day. Guard against: compute from event time not from the processing time of the feed. |
| Run it as one pipeline | Census and schedule intake (ADT feed and scheduling extract), Workload feature builder (point-in-time feature store), Hierarchical demand forecaster (gradient boosting with quantiles), Reconciliation (MinT hierarchical reconciliation) and Policy floor and ratio rules (approved ratio register), with Staffing leader review and Forecast archive and feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new unit opens or closes | Cold-start from a peer-unit profile and automatic retirement of series with no patients for 28 days. |

**Deliberately not doing**

- Paid hours including overtime: reflects past shortage decisions and not the demand that caused them.
- Individual employee attributes: demand is a property of the unit and shift and personal data adds privacy risk without signal.
- Same-day census revisions: arrive after the planning cut-off and leak the answer.

**How the approach is proven**

Prove it offline on WAPE and pinball loss by horizon and role, Interval coverage at 80 and 95 percent and Reconciliation error between unit and facility totals using time-ordered splits, then online on "Fill rate of planned shifts at publication" with "Share of shifts covered by premium labour" as the guardrail. Watch for: Training on paid hours that reflect past shortages, Scoring accuracy on the last 24 hours only and Letting actual census leak into the forecast features.

## Baseline and production design

- **Baseline (build this first):** Seasonal-naive forecast of worked hours by unit and shift from the same weekday in recent weeks.
- **Production design:** Hierarchical gradient-boosted and statistical ensemble with exogenous workload drivers, quantile outputs, bottom-up and top-down reconciliation across unit, facility and system, and a deterministic policy-minimum floor applied after the model.

## Why AI, and why this kind

**Why AI.** Forecast role- and skill-specific staffing demand for every facility, unit and shift so leaders can plan rosters and contingency cover days or weeks ahead instead of discovering shortfalls at shift start. The evidence that separates good from bad outcomes (Acuity-weighted workload, Planned procedure load, Admission and discharge rhythm) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "scheduled hours or paid hours as the label" are what teams reach for first, and they fail because scheduled hours encode past understaffing and past overstaffing as if they were demand. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Hierarchical gradient-boosted and statistical ensemble with exogenous workload drivers, quantile outputs, bottom-up and top-down reconciliation across unit, facility and system, and a deterministic policy-minimum floor applied after the model.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Acuity-weighted workload, Planned procedure load, Admission and discharge rhythm and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Seasonal-naive forecast of worked hours by unit and shift from the same weekday in recent weeks | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hierarchical gradient-boosted and statistical ensemble with exogenous workload drivers, quantile outputs, bottom-up and top-down reconciliation across unit, facility and system, and a deterministic policy-minimum floor applied after the model | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Fill rate of planned shifts at publication) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on paid hours that reflect past shortages.
- Evaluation trap: Scoring accuracy on the last 24 hours only.
- New unit opens or closes: no history for the new series and a stale series for the closed one.
- Late or revised ADT feed: census backfills after the forecast ran.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
