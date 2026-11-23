# Short-Term Load Forecasting: use-case brief

> Generated from the blueprint `energy/short-term-load-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Short-Term Load Forecasting · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast electricity demand by substation and system for the next days at 15-minute resolution so dispatch, reserves and purchases are planned against realistic loads. The system has to run as a scheduled batch job, inside these limits: 15-minute resolution for 7 days ahead, Quantile output for peak risk and Consistent totals across the hierarchy.

**Why it is hard.** The obvious approach is history only, and it fails because temperature and holidays move demand. The second trap is in "Peak": the real signal is quantiles around peaks, while teams usually reach for mean forecast.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 3.3K at peak, at an estimated $5.3K a month. A mistake is expensive in the way reserve cost measures it.

**What success looks like.** Offline: Weighted quantile loss, Peak error and Coverage of intervals. Online: Forecast bias at peak, Reserve cost and Dispatch deviations. The launch is judged on "Forecast bias at peak" while "Reserve cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast electricity demand by substation and system for the next days at 15-minute resolution so dispatch, reserves and purchases are planned against realistic loads.

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

- 15-minute resolution for 7 days ahead
- Quantile output for peak risk
- Consistent totals across the hierarchy
- Daily refresh with intraday updates
- 3K substations

## The approach in one paragraph

Start with seasonal naive on the last week's load with a temperature adjustment, because operators use a similar rule. Then earn the move to a gradient boosting or neural forecaster with weather and calendar covariates, quantile outputs, hierarchical reconciliation and a peak alert for control rooms, and only if it beats the baseline on Weighted quantile loss and Peak error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Temperature forecast | Forecast temperature and humidity. Heating and cooling load. Guard against: forecast not actual. |
| Add Calendar and holiday effects | Day type, school terms and holidays. Load shape. Guard against: from the calendar. |
| Add Same time last week | Load at the same time in prior weeks. Anchor. Guard against: aligned on local time. |
| Run it as one pipeline | SCADA load ingestion (historian), Grid cleaning and gap fill (batch), Feature build (weather and calendar joins), Grid quantile forecast (model), Grid reconciliation (hierarchical step), Peak alert (rules) and Grid accuracy tracking (weekly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle heatwave | Wider intervals and an extreme weather model. |

**Deliberately not doing**

- Substation name: an identifier.
- Meter reading format: an artefact.
- Report author: irrelevant.

**How the approach is proven**

Prove it offline on Weighted quantile loss, Peak error and Coverage of intervals using time-ordered splits, then online on "Forecast bias at peak" with "Reserve cost" as the guardrail. Watch for: Mean-only forecasts, Ignoring behind-the-meter solar and Inconsistent hierarchy.

## Baseline and production design

- **Baseline (build this first):** Seasonal naive on the last week's load with a temperature adjustment, because operators use a similar rule.
- **Production design:** A gradient boosting or neural forecaster with weather and calendar covariates, quantile outputs, hierarchical reconciliation and a peak alert for control rooms.

## Why AI, and why this kind

**Why AI.** Forecast electricity demand by substation and system for the next days at 15-minute resolution so dispatch, reserves and purchases are planned against realistic loads. The evidence that separates good from bad outcomes (Temperature forecast, Calendar and holiday effects, Same time last week) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "history only" are what teams reach for first, and they fail because temperature and holidays move demand. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A gradient boosting or neural forecaster with weather and calendar covariates, quantile outputs, hierarchical reconciliation and a peak alert for control rooms.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Temperature forecast, Calendar and holiday effects, Same time last week and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Seasonal naive on the last week's load with a temperature adjustment, because operators use a similar rule | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A gradient boosting or neural forecaster with weather and calendar covariates, quantile outputs, hierarchical reconciliation and a peak alert for control rooms | chosen | Meets the run-window envelope at $0.00062 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Forecast bias at peak) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Mean-only forecasts.
- Evaluation trap: Ignoring behind-the-meter solar.
- Heatwave: demand moves beyond history.
- Load transfer: a switching change moves load.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
