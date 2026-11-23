# Public Transit Demand Forecasting: use-case brief

> Generated from the blueprint `public-sector/transit-demand-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Public Transit Demand Forecasting · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast boardings by route, stop and time from card, count and event data so timetables, vehicle sizes and crowding information match demand. The system has to run as a scheduled batch job, inside these limits: Forecast by route and 15-minute interval, Aggregated and anonymised card data and Event and weather inputs.

**Why it is hard.** The obvious approach is individual journeys, and it fails because journey histories are private. The second trap is in "Censoring": the real signal is estimated unconstrained demand, while teams usually reach for boardings when vehicles were full.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 3.3K at peak, at an estimated $9.0K a month. A mistake is expensive in the way empty running measures it.

**What success looks like.** Offline: Weighted error by route, Peak error and Unconstrained demand estimate checks. Online: Overcrowded trips, Empty running and Forecast bias at peak. The launch is judged on "Overcrowded trips" while "Empty running" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast boardings by route, stop and time from card, count and event data so timetables, vehicle sizes and crowding information match demand.

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

- Forecast by route and 15-minute interval
- Aggregated and anonymised card data
- Event and weather inputs
- Weekly run for 800 routes

## The approach in one paragraph

Start with seasonal average of boardings by route and time, because planners use it today. Then earn the move to a hierarchical forecaster with calendar and event covariates, censoring correction on full vehicles and scenarios for timetable changes, and only if it beats the baseline on Weighted error by route and Peak error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Boardings last week | Boardings at the same time last week. Anchor. Guard against: aligned. |
| Add Events and school terms | Event calendars and term dates. Demand shifts. Guard against: from calendars. |
| Add Weather | Rain and temperature. Mode choice. Guard against: from weather. |
| Run it as one pipeline | Boarding data (ticketing and counters), Aggregation and anonymisation (batch), Censoring correction (statistical model), Forecast model (gradient boosting), Scenario testing (planning tool) and Accuracy tracking (monthly), with Planner review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle strike or closure | Event flags and scenario inputs. |

**Deliberately not doing**

- Route name: an identifier.
- Driver name: irrelevant.
- Fare product alone: weak link.

**How the approach is proven**

Prove it offline on Weighted error by route, Peak error and Unconstrained demand estimate checks using time-ordered splits, then online on "Overcrowded trips" with "Empty running" as the guardrail. Watch for: Observed boardings as demand, Individual journey data and Ignoring events.

## Baseline and production design

- **Baseline (build this first):** Seasonal average of boardings by route and time, because planners use it today.
- **Production design:** A hierarchical forecaster with calendar and event covariates, censoring correction on full vehicles and scenarios for timetable changes.

## Why AI, and why this kind

**Why AI.** Forecast boardings by route, stop and time from card, count and event data so timetables, vehicle sizes and crowding information match demand. The evidence that separates good from bad outcomes (Boardings last week, Events and school terms, Weather) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "individual journeys" are what teams reach for first, and they fail because journey histories are private. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A hierarchical forecaster with calendar and event covariates, censoring correction on full vehicles and scenarios for timetable changes.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Boardings last week, Events and school terms, Weather and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Seasonal average of boardings by route and time, because planners use it today | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A hierarchical forecaster with calendar and event covariates, censoring correction on full vehicles and scenarios for timetable changes | chosen | Meets the run-window envelope at $0.0010 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Overcrowded trips) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Observed boardings as demand.
- Evaluation trap: Individual journey data.
- Strike or closure: demand shifts across modes.
- Counter fault: boardings are undercounted.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
