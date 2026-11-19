# Delivery Promise (ETA) Estimation: use-case brief

> Generated from the blueprint `retail/delivery-promise-estimation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Delivery Promise (ETA) Estimation · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Show accurate delivery dates at browse and checkout, balancing conversion (earlier promises) with on-time reliability. The system has to run in under 100 milliseconds, inside these limits: 40 ms per promise, Late delivery penalty and Carrier capacity constraints.

**Why it is hard.** The obvious approach is mean delivery time, and it fails because mean promises are late half the time. The second trap is in "Components": the real signal is model processing, middle-mile and last-mile separately, while teams usually reach for single end-to-end regressor.

**Scale and stakes.** At 10 million users this is about 24.0M model-touching events a day, 278 requests per second on average and 1.7K at peak, at an estimated $4.2K a month. A mistake is expensive in the way conversion lift from faster promises measures it.

**What success looks like.** Offline: On-time rate at promised quantile and Pinball loss. Online: Late delivery rate and Conversion lift from faster promises. The launch is judged on "Late delivery rate" while "Conversion lift from faster promises" must not get worse.

## Objective, loss and constraints

**Business objective.** Show accurate delivery dates at browse and checkout, balancing conversion (earlier promises) with on-time reliability.

**Training objective.** `\mathcal{L}=\sum_i\left[\alpha\,(y_i-\hat q_i)^+ +(1-\alpha)(\hat q_i-y_i)^+\right],\ \alpha=0.9`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \alpha | The quantile level (0.9): errors that make the promise too early are weighted 0.9 and too late 0.1, so the model learns the 90th percentile. |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \hat{q}_i | The predicted delivery time at that quantile. |

**Hard constraints**

- 40 ms per promise
- Late delivery penalty
- Carrier capacity constraints
- Pin-code granularity

## The approach in one paragraph

Start with static lead-time table by pin code. Then earn the move to quantile gradient boosting for each leg plus convolution of distributions, updated every 15 minutes with live capacity signals and cached per pin code, and only if it beats the baseline on On-time rate at promised quantile and Pinball loss after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Pin-code carrier lead-time quantile | 90th percentile of last-mile time by carrier and pin. Reliability anchor. Guard against: recent window as-of. |
| Add Warehouse processing backlog | Orders waiting vs processing capacity. Queue time. Guard against: snapshot at order time. |
| Add Weather and event disruption flags | Alerts on route. Delay risk. Guard against: alerts known before the order. |
| Run it as one pipeline | Promise request (catalogue and checkout API), Capacity and backlog feed (stream), Leg quantile models (LightGBM), Distribution combiner (convolution), Promise cache (per pin-code), Business rules (cut-offs) and Delivery outcome logs (Kafka). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle festive-season carrier delays | Dynamic buffer from live on-time rate. |

**Deliberately not doing**

- Order value: no effect on transit time.
- Customer age: irrelevant.

**How the approach is proven**

Prove it offline on On-time rate at promised quantile and Pinball loss using time-ordered splits, then online on "Late delivery rate" with "Conversion lift from faster promises" as the guardrail. Watch for: Evaluating on delivered orders only (survivorship) and Mean error reported instead of tail error.

## Baseline and production design

- **Baseline (build this first):** Static lead-time table by pin code.
- **Production design:** Quantile gradient boosting for each leg plus convolution of distributions, updated every 15 minutes with live capacity signals and cached per pin code.

## Why AI, and why this kind

**Why AI.** Show accurate delivery dates at browse and checkout, balancing conversion (earlier promises) with on-time reliability. The evidence that separates good from bad outcomes (Pin-code carrier lead-time quantile, Warehouse processing backlog, Weather and event disruption flags) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "mean delivery time" are what teams reach for first, and they fail because mean promises are late half the time. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Quantile gradient boosting for each leg plus convolution of distributions, updated every 15 minutes with live capacity signals and cached per pin code.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Pin-code carrier lead-time quantile, Warehouse processing backlog, Weather and event disruption flags and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static lead-time table by pin code | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Quantile gradient boosting for each leg plus convolution of distributions, updated every 15 minutes with live capacity signals and cached per pin code | chosen | Meets the 80 ms envelope at $0.0058 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Late delivery rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on delivered orders only (survivorship).
- Evaluation trap: Mean error reported instead of tail error.
- Festive-season carrier delays: promises miss widely.
- Pin code with few deliveries: uncertain estimates.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
