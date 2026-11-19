# API Usage Forecasting & Quota Planning: use-case brief

> Generated from the blueprint `saas/api-usage-forecasting-and-quota-planning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** API Usage Forecasting & Quota Planning · **Domain:** saas · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast per-customer API usage to plan capacity, set fair quotas and forecast usage-based revenue. The system has to run as a scheduled batch job, inside these limits: Thousands of customers with different scales, Launch spikes and Quota fairness.

**Why it is hard.** The obvious approach is per-customer ARIMA, and it fails because per-customer models fail on short histories. The second trap is in "Events": the real signal is customer launch and campaign covariates, while teams usually reach for history only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way quota complaints measures it.

**What success looks like.** Offline: Weighted pinball loss and Interval coverage. Online: Capacity-related incidents and Quota complaints. The launch is judged on "Capacity-related incidents" while "Quota complaints" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast per-customer API usage to plan capacity, set fair quotas and forecast usage-based revenue.

**Training objective.** `\mathcal{L}=\sum_t\rho_q(y_t-\hat y_t)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_q | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. (one value per quantile level q) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Thousands of customers with different scales
- Launch spikes
- Quota fairness
- Billing implications

## The approach in one paragraph

Start with linear extrapolation of last 4 weeks. Then earn the move to global quantile GBDT/transformer with customer embeddings and event covariates, feeding quota recommendations and capacity plans, and only if it beats the baseline on Weighted pinball loss and Interval coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Usage trend and seasonality | Decomposed trend and weekly cycle. Baseline. Guard against: window. |
| Add Customer lifecycle stage | Onboarding, steady, expansion. Growth. Guard against: cRM. |
| Add Planned launch events | Dated releases from CSM notes. Spikes. Guard against: data capture. |
| Run it as one pipeline | Usage metrics (warehouse), Feature builder (dbt), Global forecaster (quantile model), Quota recommender (policy), Capacity planner (infrastructure) and Realised usage (calibration), with CSM review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle customer launches a new integration | Event feeds from CSMs and early-warning detectors. |

**Deliberately not doing**

- Customer name: none.
- Plan name: encoded.

**How the approach is proven**

Prove it offline on Weighted pinball loss and Interval coverage using time-ordered splits, then online on "Capacity-related incidents" with "Quota complaints" as the guardrail. Watch for: Training on throttled usage as true demand and Ignoring customer events.

## Baseline and production design

- **Baseline (build this first):** Linear extrapolation of last 4 weeks.
- **Production design:** Global quantile GBDT/transformer with customer embeddings and event covariates, feeding quota recommendations and capacity plans.

## Why AI, and why this kind

**Why AI.** Forecast per-customer API usage to plan capacity, set fair quotas and forecast usage-based revenue. The evidence that separates good from bad outcomes (Usage trend and seasonality, Customer lifecycle stage, Planned launch events) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "per-customer ARIMA" are what teams reach for first, and they fail because per-customer models fail on short histories. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Global quantile GBDT/transformer with customer embeddings and event covariates, feeding quota recommendations and capacity plans.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Usage trend and seasonality, Customer lifecycle stage, Planned launch events and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Linear extrapolation of last 4 weeks | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Global quantile GBDT/transformer with customer embeddings and event covariates, feeding quota recommendations and capacity plans | chosen | Meets the run-window envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Capacity-related incidents) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on throttled usage as true demand.
- Evaluation trap: Ignoring customer events.
- Customer launches a new integration: usage jumps tenfold.
- Quota limits suppress observed demand: throttled customers appear to use less than they need, so censored usage understates true demand.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
