# ED Demand & Bed Capacity Forecasting: use-case brief

> Generated from the blueprint `healthcare/bed-capacity-and-ed-demand-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** ED Demand & Bed Capacity Forecasting · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast ED arrivals, admissions and discharges hourly to staff, open beds and divert flow before crowding hits. The system has to run as a scheduled batch job, inside these limits: Hourly updates, Surge scenarios and Interpretable for bed managers.

**Why it is hard.** The obvious approach is direct census forecast, and it fails because census = arrivals minus discharges and each has different drivers. The second trap is in "Surge": the real signal is event and epidemic covariates, while teams usually reach for historical seasonality only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way diversion hours measures it.

**What success looks like.** Offline: Hourly census WAPE and Interval coverage. Online: ED boarding hours and Diversion hours. The launch is judged on "ED boarding hours" while "Diversion hours" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast ED arrivals, admissions and discharges hourly to staff, open beds and divert flow before crowding hits.

**Training objective.** `\mathcal{L}=\sum_{t}\sum_q\rho_q\!\left(y_t-\hat y_t^{(q)}\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{t} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_q | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. (one value per quantile level q) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t^{(q)} | The model's prediction of y. (one value per time step or token t and quantile level q) |

**Hard constraints**

- Hourly updates
- Surge scenarios
- Interpretable for bed managers
- Multiple sites

## The approach in one paragraph

Start with same-hour-last-week averages. Then earn the move to hierarchical probabilistic forecasts (arrivals, LOS, discharges) combined by simulation, with scenario-based surge planning, and only if it beats the baseline on Hourly census WAPE and Interval coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Syndromic surveillance signals | ILI, RSV regional counts. Early surge. Guard against: reporting lag. |
| Add Discharge-before-noon rate | Share of discharges by noon. Capacity release. Guard against: unit-level. |
| Add Weather and event calendar | Temperature extremes, mass gatherings. Arrival shocks. Guard against: forecast values. |
| Run it as one pipeline | ADT feed (HL7), Feature builder (stream and batch), Arrival forecaster (probabilistic GBDT), LOS and discharge model (survival), Census simulator (Monte Carlo), Bed management dashboard (operations) and Actual census (ADT). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle epidemic surge | Surveillance covariates and regime-change detector. |

**Deliberately not doing**

- Day-of-month: none.
- Hospital CEO name: none.

**How the approach is proven**

Prove it offline on Hourly census WAPE and Interval coverage using time-ordered splits, then online on "ED boarding hours" with "Diversion hours" as the guardrail. Watch for: Backtesting only in non-surge periods and Using realised discharge info in forecasts.

## Baseline and production design

- **Baseline (build this first):** Same-hour-last-week averages.
- **Production design:** Hierarchical probabilistic forecasts (arrivals, LOS, discharges) combined by simulation, with scenario-based surge planning.

## Why AI, and why this kind

**Why AI.** Forecast ED arrivals, admissions and discharges hourly to staff, open beds and divert flow before crowding hits. The evidence that separates good from bad outcomes (Syndromic surveillance signals, Discharge-before-noon rate, Weather and event calendar) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "direct census forecast" are what teams reach for first, and they fail because census = arrivals minus discharges and each has different drivers. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Hierarchical probabilistic forecasts (arrivals, LOS, discharges) combined by simulation, with scenario-based surge planning.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Syndromic surveillance signals, Discharge-before-noon rate, Weather and event calendar and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Same-hour-last-week averages | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hierarchical probabilistic forecasts (arrivals, LOS, discharges) combined by simulation, with scenario-based surge planning | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (ED boarding hours) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Backtesting only in non-surge periods.
- Evaluation trap: Using realised discharge info in forecasts.
- Epidemic surge: forecasts underpredict persistently.
- ADT feed outage: the census feed goes stale so forecasts run on outdated bed occupancy.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
