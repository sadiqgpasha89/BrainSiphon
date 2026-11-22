# Physician Demand & Coverage Forecasting: use-case brief

> Generated from the blueprint `healthcare/physician-demand-coverage-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Physician Demand & Coverage Forecasting · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast physician coverage requirements by specialty, facility, clinic, shift and service line, with uncertainty and shortage risk, so medical group leaders can plan coverage ahead of demand. The system has to run as a scheduled batch job, inside these limits: Medical group leaders approve coverage plans and the forecast never changes a schedule, Hierarchical reconciliation across specialty, site and shift keeps totals consistent and Forecasts state intervals and the drivers.

**Why it is hard.** The obvious approach is independent series, and it fails because totals disagree across levels. The second trap is in "Drivers": the real signal is appointment, procedure, census and referral drivers, while teams usually reach for history only.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way locum and overtime spend measures it.

**What success looks like.** Offline: Weighted quantile loss and coverage of prediction intervals, Hierarchical consistency error and Shortage-risk precision at the review capacity. Online: Coverage gaps found in advance, Locum and overtime spend and Share of plans approved without rework. The launch is judged on "Coverage gaps found in advance" while "Locum and overtime spend" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast physician coverage requirements by specialty, facility, clinic, shift and service line, with uncertainty and shortage risk, so medical group leaders can plan coverage ahead of demand.

**Training objective.** `\mathcal{L}=\sum_{t}\left[\tau\,(y_t-\hat y_t)_+ +(1-\tau)\,(\hat y_t-y_t)_+\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{t} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \tau | Temperature: scales similarity scores before the softmax; a smaller value makes the model sharper and more confident. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Medical group leaders approve coverage plans and the forecast never changes a schedule
- Hierarchical reconciliation across specialty, site and shift keeps totals consistent
- Forecasts state intervals and the drivers
- Minimum coverage policy applies as a hard rule
- Forecasts 15K specialty-site-shift series nightly
- Individual physicians are not forecast

## The approach in one paragraph

Start with next quarter coverage is copied from the same quarter last year. Then earn the move to a hierarchical probabilistic forecaster over appointment, procedure, census and referral drivers, reconciled across specialty, site and shift, with a rules layer for minimum coverage and a scenario view, and only if it beats the baseline on Weighted quantile loss and coverage of prediction intervals and Hierarchical consistency error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Booked and referred demand | Appointments and referrals already scheduled. Leading indicator of workload. Guard against: snapshot at forecast time. |
| Add Seasonality and calendar | Holidays, school terms and service calendars. Regular demand cycles. Guard against: calendar tables. |
| Add Census and admission trend | Recent inpatient census and admissions. Drives inpatient coverage. Guard against: earlier periods. |
| Run it as one pipeline | Demand and roster intake (warehouse extracts), Feature builder (point-in-time features), Hierarchical forecaster (gradient boosting with quantiles), Reconciliation (hierarchical reconciliation), Coverage rules and shortage risk (policy rules), Medical group leader approval (human) and Forecast and outcome log (lakehouse). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new clinic or service line | Peer prior and a low-confidence flag. |

**Deliberately not doing**

- Individual physician identity: not a demand driver.
- Clinic naming: label.
- Appointment booking channel: not workload.

**How the approach is proven**

Prove it offline on Weighted quantile loss and coverage of prediction intervals, Hierarchical consistency error and Shortage-risk precision at the review capacity using time-ordered splits, then online on "Coverage gaps found in advance" with "Locum and overtime spend" as the guardrail. Watch for: Evaluating on random splits, Ignoring reconciliation and Treating the forecast as the schedule.

## Baseline and production design

- **Baseline (build this first):** Next quarter coverage is copied from the same quarter last year.
- **Production design:** A hierarchical probabilistic forecaster over appointment, procedure, census and referral drivers, reconciled across specialty, site and shift, with a rules layer for minimum coverage and a scenario view.

## Why AI, and why this kind

**Why AI.** Forecast physician coverage requirements by specialty, facility, clinic, shift and service line, with uncertainty and shortage risk, so medical group leaders can plan coverage ahead of demand. The evidence that separates good from bad outcomes (Booked and referred demand, Seasonality and calendar, Census and admission trend) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "independent series" are what teams reach for first, and they fail because totals disagree across levels. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A hierarchical probabilistic forecaster over appointment, procedure, census and referral drivers, reconciled across specialty, site and shift, with a rules layer for minimum coverage and a scenario view.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Booked and referred demand, Seasonality and calendar, Census and admission trend and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Next quarter coverage is copied from the same quarter last year | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A hierarchical probabilistic forecaster over appointment, procedure, census and referral drivers, reconciled across specialty, site and shift, with a rules layer for minimum coverage and a scenario view | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Coverage gaps found in advance) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on random splits.
- Evaluation trap: Ignoring reconciliation.
- New clinic or service line: no history.
- Demand spike from an outbreak: history breaks.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
