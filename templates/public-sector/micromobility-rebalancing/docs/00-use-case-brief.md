# Shared Micromobility Rebalancing: use-case brief

> Generated from the blueprint `public-sector/micromobility-rebalancing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Shared Micromobility Rebalancing · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Plan the moves of shared bikes and scooters between zones so vehicles are available where demand is, with routes and crews that are cost-efficient. The system has to run as a scheduled batch job, inside these limits: Zone-level forecasts and plans only, No tracking of individual riders and Crew routes within shift limits.

**Why it is hard.** The obvious approach is rides alone, and it fails because pure ride maximisation ignores underserved areas. The second trap is in "Privacy": the real signal is aggregated trips by zone, while teams usually reach for rider histories.

**Scale and stakes.** At 10 million users this is about 144.0M model-touching events a day, 1.7K requests per second on average and 1.7K at peak, at an estimated $7.2K a month. A mistake is expensive in the way rides served measures it.

**What success looks like.** Offline: Demand error by zone, Coverage attainment and Route cost. Online: Availability in underserved areas, Rides served and Crew cost per ride. The launch is judged on "Availability in underserved areas" while "Rides served" must not get worse.

## Objective, loss and constraints

**Business objective.** Plan the moves of shared bikes and scooters between zones so vehicles are available where demand is, with routes and crews that are cost-efficient.

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

- Zone-level forecasts and plans only
- No tracking of individual riders
- Crew routes within shift limits
- Re-plan every hour
- 100K vehicles

## The approach in one paragraph

Start with crews move vehicles from the fullest to the emptiest zone by rule, because it is the usual practice. Then earn the move to a demand forecast with a rebalancing optimiser that respects crew limits and coverage targets, with a route planner and a daily equity report, and only if it beats the baseline on Demand error by zone and Coverage attainment after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Zone demand forecast | Forecast departures. Need. Guard against: from the model. |
| Add Current stock by zone | Vehicles available. State. Guard against: from telemetry. |
| Add Battery level | Charge of each vehicle. Feasibility. Guard against: from telemetry. |
| Run it as one pipeline | Telemetry and trip aggregates (operator platform), Demand forecast (time-series model), Rebalancing optimiser (vehicle routing), Coverage rules (policy), Crew task list (mobile app) and Outcome measurement (daily), with Equity report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle weather change | Fast re-plans. |

**Deliberately not doing**

- Rider name: personal data.
- Vehicle id alone: an identifier.
- Payment method: irrelevant.

**How the approach is proven**

Prove it offline on Demand error by zone, Coverage attainment and Route cost using time-ordered splits, then online on "Availability in underserved areas" with "Rides served" as the guardrail. Watch for: Maximising rides only, Individual rider histories and Ignoring battery state.

## Baseline and production design

- **Baseline (build this first):** Crews move vehicles from the fullest to the emptiest zone by rule, because it is the usual practice.
- **Production design:** A demand forecast with a rebalancing optimiser that respects crew limits and coverage targets, with a route planner and a daily equity report.

## Why AI, and why this kind

**Why AI.** Plan the moves of shared bikes and scooters between zones so vehicles are available where demand is, with routes and crews that are cost-efficient. The evidence that separates good from bad outcomes (Zone demand forecast, Current stock by zone, Battery level) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "rides alone" are what teams reach for first, and they fail because pure ride maximisation ignores underserved areas. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A demand forecast with a rebalancing optimiser that respects crew limits and coverage targets, with a route planner and a daily equity report.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Zone demand forecast, Current stock by zone, Battery level and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Crews move vehicles from the fullest to the emptiest zone by rule, because it is the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A demand forecast with a rebalancing optimiser that respects crew limits and coverage targets, with a route planner and a daily equity report | chosen | Meets the run-window envelope at $0.0017 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Availability in underserved areas) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Maximising rides only.
- Evaluation trap: Individual rider histories.
- Weather change: rain collapses demand.
- Event crowd: demand spikes around the venue.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
