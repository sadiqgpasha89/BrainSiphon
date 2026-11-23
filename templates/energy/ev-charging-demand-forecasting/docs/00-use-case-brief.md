# EV Charging Demand Forecasting: use-case brief

> Generated from the blueprint `energy/ev-charging-demand-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** EV Charging Demand Forecasting · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast charging demand by site and feeder so grid upgrades, tariffs and charger operations match when and where vehicles charge. The system has to run as a scheduled batch job, inside these limits: 15-minute resolution for 14 days, Aggregated demand by site and feeder and No tracking of individual drivers.

**Why it is hard.** The obvious approach is history only, and it fails because behaviour changes with tariffs and events. The second trap is in "Privacy": the real signal is aggregated charging sessions, while teams usually reach for individual vehicle trips.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 3.3K at peak, at an estimated $9.0K a month. A mistake is expensive in the way upgrade cost avoided measures it.

**What success looks like.** Offline: Weighted quantile loss, Peak error and Coverage by site type. Online: Feeder overloads, Upgrade cost avoided and Forecast bias at peak. The launch is judged on "Feeder overloads" while "Upgrade cost avoided" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast charging demand by site and feeder so grid upgrades, tariffs and charger operations match when and where vehicles charge.

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

- 15-minute resolution for 14 days
- Aggregated demand by site and feeder
- No tracking of individual drivers
- Quantile output for peaks
- 50K chargers

## The approach in one paragraph

Start with same-day-last-week demand per site, because it is the simple benchmark. Then earn the move to a hierarchical forecaster with site and feeder aggregation, tariff and event covariates, quantile outputs and a growth model for new chargers, and only if it beats the baseline on Weighted quantile loss and Peak error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Site type and location | Workplace, public or home area. Load shape. Guard against: from the register. |
| Add Day type and events | Weekday, holiday and local events. Demand pattern. Guard against: from calendars. |
| Add Tariff and price signals | Time-of-use prices. Shifting. Guard against: from tariffs. |
| Run it as one pipeline | Session and meter aggregation (charge point operators), Feature build (calendar and tariff joins), Demand forecast (gradient boosting), Hierarchical reconciliation (rules), Feeder peak view (planning tool) and Accuracy tracking (monthly), with Planner review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new site | Borrow from similar sites with a wide interval. |

**Deliberately not doing**

- Driver name: irrelevant and private.
- Vehicle identifier: an identifier and private.
- Card number: an identifier.

**How the approach is proven**

Prove it offline on Weighted quantile loss, Peak error and Coverage by site type using time-ordered splits, then online on "Feeder overloads" with "Upgrade cost avoided" as the guardrail. Watch for: Individual trip tracking, Average-based capacity planning and Ignoring prices.

## Baseline and production design

- **Baseline (build this first):** Same-day-last-week demand per site, because it is the simple benchmark.
- **Production design:** A hierarchical forecaster with site and feeder aggregation, tariff and event covariates, quantile outputs and a growth model for new chargers.

## Why AI, and why this kind

**Why AI.** Forecast charging demand by site and feeder so grid upgrades, tariffs and charger operations match when and where vehicles charge. The evidence that separates good from bad outcomes (Site type and location, Day type and events, Tariff and price signals) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "history only" are what teams reach for first, and they fail because behaviour changes with tariffs and events. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A hierarchical forecaster with site and feeder aggregation, tariff and event covariates, quantile outputs and a growth model for new chargers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Site type and location, Day type and events, Tariff and price signals and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Same-day-last-week demand per site, because it is the simple benchmark | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A hierarchical forecaster with site and feeder aggregation, tariff and event covariates, quantile outputs and a growth model for new chargers | chosen | Meets the run-window envelope at $0.0010 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Feeder overloads) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Individual trip tracking.
- Evaluation trap: Average-based capacity planning.
- New site: the site has no charging history.
- Pricing change: behaviour shifts quickly.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
