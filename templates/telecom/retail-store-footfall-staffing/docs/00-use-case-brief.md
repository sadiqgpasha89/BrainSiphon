# Retail Store Footfall & Staffing: use-case brief

> Generated from the blueprint `telecom/retail-store-footfall-staffing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Retail Store Footfall & Staffing · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast store footfall and service demand by hour and plan shifts so queues fall and labour cost stays in budget. The system has to run as a scheduled batch job, inside these limits: Forecast per store per hour for 14 days, Rostering rules and labour law respected and Planner can override.

**Why it is hard.** The obvious approach is daily sales, and it fails because sales hide the queue. The second trap is in "Events": the real signal is launches, promotions and local events, while teams usually reach for seasonality only.

**Scale and stakes.** At 10 million users this is about 72.0M model-touching events a day, 833 requests per second on average and 833 at peak, at an estimated $2.5K a month. A mistake is expensive in the way labour cost per transaction measures it.

**What success looks like.** Offline: Weighted error by store and hour, Queue time prediction accuracy and Roster feasibility rate. Online: Queue time at peak, Labour cost per transaction and Hours of idle staff. The launch is judged on "Queue time at peak" while "Labour cost per transaction" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast store footfall and service demand by hour and plan shifts so queues fall and labour cost stays in budget.

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

- Forecast per store per hour for 14 days
- Rostering rules and labour law respected
- Planner can override
- Counter data aggregated without identifying individuals

## The approach in one paragraph

Start with seasonal naive footfall with average growth, because it is easy to explain to store managers. Then earn the move to a global forecast with store embeddings and calendar covariates feeding a shift optimiser with rules for skills and labour law, and only if it beats the baseline on Weighted error by store and hour and Queue time prediction accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Same hour last week | Footfall in the same hour in recent weeks. Seasonal anchor. Guard against: local time. |
| Add Launch and promotion calendar | Device launches and offers in the window. Demand spikes. Guard against: from the plan. |
| Add Local event flags | Events near the store. Footfall effect. Guard against: curated. |
| Run it as one pipeline | Counter ingestion (store sensors), Forecast model (gradient boosting), Event and promotion features (calendar join), Demand to staff conversion (queue model), Shift optimiser (integer programming) and Outcome tracking (weekly), with Planner review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new store | Borrow a profile from similar stores. |

**Deliberately not doing**

- Store manager name: irrelevant.
- Store opening date: weak link.
- Receipt number: an identifier.

**How the approach is proven**

Prove it offline on Weighted error by store and hour, Queue time prediction accuracy and Roster feasibility rate using time-ordered splits, then online on "Queue time at peak" with "Labour cost per transaction" as the guardrail. Watch for: Using sales as demand, Ignoring roster rules and Random time splits.

## Baseline and production design

- **Baseline (build this first):** Seasonal naive footfall with average growth, because it is easy to explain to store managers.
- **Production design:** A global forecast with store embeddings and calendar covariates feeding a shift optimiser with rules for skills and labour law.

## Why AI, and why this kind

**Why AI.** Forecast store footfall and service demand by hour and plan shifts so queues fall and labour cost stays in budget. The evidence that separates good from bad outcomes (Same hour last week, Launch and promotion calendar, Local event flags) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "daily sales" are what teams reach for first, and they fail because sales hide the queue. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A global forecast with store embeddings and calendar covariates feeding a shift optimiser with rules for skills and labour law.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Same hour last week, Launch and promotion calendar, Local event flags and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Seasonal naive footfall with average growth, because it is easy to explain to store managers | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A global forecast with store embeddings and calendar covariates feeding a shift optimiser with rules for skills and labour law | chosen | Meets the run-window envelope at $0.0012 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Queue time at peak) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using sales as demand.
- Evaluation trap: Ignoring roster rules.
- New store: the new store has no history yet.
- Counter fault: footfall drops to zero.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
