# Shipment ETA Prediction: use-case brief

> Generated from the blueprint `supply-chain/eta-prediction-for-shipments` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Shipment ETA Prediction · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict arrival times for in-transit shipments with calibrated uncertainty so customers and planners can act before delays hit. The system has to run in under 100 milliseconds, inside these limits: ETA refresh on every scan or ping, 50 ms API and Multimodal journeys.

**Why it is hard.** The obvious approach is single point ETA, and it fails because a single ETA hides risk and is late half the time. The second trap is in "Context": the real signal is network congestion, weather and dwell at hubs, while teams usually reach for distance and average speed.

**Scale and stakes.** At 10 million users this is about 18.0M model-touching events a day, 208 requests per second on average and 1.3K at peak, at an estimated $4.0K a month. A mistake is expensive in the way customer contacts per shipment measures it.

**What success looks like.** Offline: Pinball loss and interval coverage and MAE of P50 ETA in hours. Online: Late-without-notice rate and Customer contacts per shipment. The launch is judged on "Late-without-notice rate" while "Customer contacts per shipment" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict arrival times for in-transit shipments with calibrated uncertainty so customers and planners can act before delays hit.

**Training objective.** `\mathcal{L}=\sum_i\rho_{0.5}(y_i-\hat q^{50}_i)+\rho_{0.9}(y_i-\hat q^{90}_i)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_{0.5} | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \hat{q}^{50}_i | The model's predicted value at the chosen quantile. (one value per example i) |

**Hard constraints**

- ETA refresh on every scan or ping
- 50 ms API
- Multimodal journeys
- Explainable delay reasons

## The approach in one paragraph

Start with planned transit time lookup by lane. Then earn the move to leg-wise quantile gradient boosting with a survival head for hub dwell, recomputed on every event and cached per shipment, and only if it beats the baseline on Pinball loss and interval coverage and MAE of P50 ETA in hours after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Hub dwell-time distribution | Recent dwell quantiles at the next hub. Biggest delay source. Guard against: window before prediction. |
| Add Remaining-leg progress | Fraction of leg completed by GPS. Progress. Guard against: gPS timestamp alignment. |
| Add Weather and disruption on route | Alerts in corridor. Delay risk. Guard against: known at prediction time. |
| Run it as one pipeline | Scan and GPS events (Kafka), Journey state builder (Flink), Leg and dwell models (LightGBM quantile), ETA combiner (distribution convolution), ETA cache (low-latency store), Customer notification (messaging) and Delivery outcome (labels). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle gPS gaps in tunnels or warehouses | Last-known state plus dead-reckoning confidence widening. |

**Deliberately not doing**

- Shipper name: none.
- Parcel colour: none.

**How the approach is proven**

Prove it offline on Pinball loss and interval coverage and MAE of P50 ETA in hours using time-ordered splits, then online on "Late-without-notice rate" with "Customer contacts per shipment" as the guardrail. Watch for: Evaluating only on delivered shipments and Using the final scan in training features.

## Baseline and production design

- **Baseline (build this first):** Planned transit time lookup by lane.
- **Production design:** Leg-wise quantile gradient boosting with a survival head for hub dwell, recomputed on every event and cached per shipment.

## Why AI, and why this kind

**Why AI.** Predict arrival times for in-transit shipments with calibrated uncertainty so customers and planners can act before delays hit. The evidence that separates good from bad outcomes (Hub dwell-time distribution, Remaining-leg progress, Weather and disruption on route) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single point ETA" are what teams reach for first, and they fail because A single ETA hides risk and is late half the time. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Leg-wise quantile gradient boosting with a survival head for hub dwell, recomputed on every event and cached per shipment.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Hub dwell-time distribution, Remaining-leg progress, Weather and disruption on route and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Planned transit time lookup by lane | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Leg-wise quantile gradient boosting with a survival head for hub dwell, recomputed on every event and cached per shipment | chosen | Meets the 80 ms envelope at $0.0075 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Late-without-notice rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating only on delivered shipments.
- Evaluation trap: Using the final scan in training features.
- GPS gaps in tunnels or warehouses: eTA freezes or jumps.
- Peak season hub overload: dwell distribution shifts within days.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
