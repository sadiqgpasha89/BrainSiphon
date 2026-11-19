# Connected-TV Ad Avails & Reach Forecasting: use-case brief

> Generated from the blueprint `adtech/ctv-ad-avails-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Connected-TV Ad Avails & Reach Forecasting · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast ad avails and campaign reach on connected TV across apps and household devices. The system has to run as a scheduled batch job, inside these limits: Household-level counting, Live-event spikes and Panel calibration.

**Why it is hard.** The obvious approach is sum of impressions, and it fails because impression sums overstate reach. The second trap is in "Events": the real signal is live-event schedule covariates, while teams usually reach for historical averages.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way reach forecast accuracy measures it.

**What success looks like.** Offline: Reach error vs panel and Quantile loss. Online: Delivery vs guarantee and Reach forecast accuracy. The launch is judged on "Delivery vs guarantee" while "Reach forecast accuracy" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast ad avails and campaign reach on connected TV across apps and household devices.

**Training objective.** `\mathcal{L}=\sum_t\rho_q\!\left(y_t-\hat y_t^{(q)}\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_q | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. (one value per quantile level q) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t^{(q)} | The model's prediction of y. (one value per time step or token t and quantile level q) |

**Hard constraints**

- Household-level counting
- Live-event spikes
- Panel calibration
- Contracts with guarantees

## The approach in one paragraph

Start with average daily impressions by app. Then earn the move to probabilistic forecasts with household reach/frequency curves calibrated to panels and schedule-aware covariates, and only if it beats the baseline on Reach error vs panel and Quantile loss after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Household viewing frequency distribution | Impressions per household. Reach. Guard against: measurement. |
| Add Programming schedule | Live event times. Demand. Guard against: schedule. |
| Add Device mix | TV vs streaming stick. Supply. Guard against: telemetry. |
| Run it as one pipeline | Playback logs (SSP), Household aggregation (identity graph), Avails forecaster (GBDT quantile), Reach-frequency model (Bayesian), Panel calibrator (measurement), Sales planning tool (avails) and Delivery outcomes (reports). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle streaming service launches new tier | Tier-aware features and manual overrides. |

**Deliberately not doing**

- App version: none.
- Device ID: none.

**How the approach is proven**

Prove it offline on Reach error vs panel and Quantile loss using time-ordered splits, then online on "Delivery vs guarantee" with "Reach forecast accuracy" as the guardrail. Watch for: Evaluating impressions not reach and Panel bias ignored.

## Baseline and production design

- **Baseline (build this first):** Average daily impressions by app.
- **Production design:** Probabilistic forecasts with household reach/frequency curves calibrated to panels and schedule-aware covariates.

## Why AI, and why this kind

**Why AI.** Forecast ad avails and campaign reach on connected TV across apps and household devices. The evidence that separates good from bad outcomes (Household viewing frequency distribution, Programming schedule, Device mix) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "sum of impressions" are what teams reach for first, and they fail because impression sums overstate reach. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Probabilistic forecasts with household reach/frequency curves calibrated to panels and schedule-aware covariates.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Household viewing frequency distribution, Programming schedule, Device mix and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Average daily impressions by app | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Probabilistic forecasts with household reach/frequency curves calibrated to panels and schedule-aware covariates | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Delivery vs guarantee) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating impressions not reach.
- Evaluation trap: Panel bias ignored.
- Streaming service launches new tier: a new subscription tier shifts supply and viewing patterns that the forecast has never seen.
- Household identity changes: reach double counted.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
