# Capacity Forecasting & Predictive Autoscaling: use-case brief

> Generated from the blueprint `saas/capacity-forecasting-and-autoscaling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Capacity Forecasting & Predictive Autoscaling · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast load and scale infrastructure ahead of demand to meet SLOs at lowest cost. The system has to run in under 100 milliseconds, inside these limits: Warm-up time of new nodes, SLO of p99 latency and Cost targets.

**Why it is hard.** The obvious approach is reactive CPU thresholds, and it fails because reactive scaling lags the spike. The second trap is in "Quantile": the real signal is provision to a high quantile of demand, while teams usually reach for mean forecast.

**Scale and stakes.** At 10 million users this is about 3000.0M model-touching events a day, 34.7K requests per second on average and 208.3K at peak, at an estimated $86.5K a month. A mistake is expensive in the way infrastructure cost per request measures it.

**What success looks like.** Offline: Quantile coverage and SLO misses in simulation and Cost vs baseline. Online: SLO attainment and Infrastructure cost per request. The launch is judged on "SLO attainment" while "Infrastructure cost per request" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast load and scale infrastructure ahead of demand to meet SLOs at lowest cost.

**Training objective.** `\mathcal{L}=\sum_t\rho_{0.95}(y_t-\hat y_t)+\lambda\,\text{cost}(\text{capacity})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_{0.95} | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \text{cost} | The infrastructure cost of the capacity provisioned. |
| \text{capacity} | The amount of compute provisioned in advance for the forecast load. |

**Hard constraints**

- Warm-up time of new nodes
- SLO of p99 latency
- Cost targets
- Bursty traffic

## The approach in one paragraph

Start with reactive autoscaling on CPU utilisation. Then earn the move to probabilistic forecasts with capacity models and a cost-aware controller combining predictive and reactive scaling, and only if it beats the baseline on Quantile coverage and SLO misses in simulation and Cost vs baseline after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Request rate forecast | Seasonal and event-aware forecast. Demand. Guard against: forecast quality. |
| Add Per-instance capacity curve | Requests per instance at SLO. Sizing. Guard against: load tests. |
| Add Event calendar | Launches, campaigns, holidays. Spikes. Guard against: calendar. |
| Run it as one pipeline | Traffic metrics (time-series DB), Forecaster (quantile model), Capacity model (load-test curves), Scaling controller (predictive plus reactive), Orchestrator (Kubernetes), SRE oversight (human) and SLO outcomes (feedback). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle unannounced viral traffic | Reactive safety net and fast burst capacity. |

**Deliberately not doing**

- Instance ID: none.
- CPU of single host: local noise.

**How the approach is proven**

Prove it offline on Quantile coverage and SLO misses in simulation and Cost vs baseline using time-ordered splits, then online on "SLO attainment" with "Infrastructure cost per request" as the guardrail. Watch for: Backtests without warm-up delays and Ignoring code-induced capacity shifts.

## Baseline and production design

- **Baseline (build this first):** Reactive autoscaling on CPU utilisation.
- **Production design:** Probabilistic forecasts with capacity models and a cost-aware controller combining predictive and reactive scaling.

## Why AI, and why this kind

**Why AI.** Forecast load and scale infrastructure ahead of demand to meet SLOs at lowest cost. The evidence that separates good from bad outcomes (Request rate forecast, Per-instance capacity curve, Event calendar) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "reactive CPU thresholds" are what teams reach for first, and they fail because reactive scaling lags the spike. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Probabilistic forecasts with capacity models and a cost-aware controller combining predictive and reactive scaling.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Request rate forecast, Per-instance capacity curve, Event calendar and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Reactive autoscaling on CPU utilisation | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Probabilistic forecasts with capacity models and a cost-aware controller combining predictive and reactive scaling | chosen | Meets the 80 ms envelope at $0.00096 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (SLO attainment) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Backtests without warm-up delays.
- Evaluation trap: Ignoring code-induced capacity shifts.
- Unannounced viral traffic: forecast misses a spike.
- Capacity curve shifts after code change: over- or under-provisioning.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
