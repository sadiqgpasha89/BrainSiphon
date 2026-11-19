# Last-Mile Route Optimisation: use-case brief

> Generated from the blueprint `supply-chain/last-mile-route-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Last-Mile Route Optimisation · **Domain:** supply-chain · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Build daily delivery routes that minimise cost and lateness using learned service times and travel-time distributions. The system has to run interactively, within a few seconds, inside these limits: Time windows, Vehicle capacity and Driver hours.

**Why it is hard.** The obvious approach is fixed average speeds and stop times, and it fails because wrong inputs make an optimal solver produce bad routes. The second trap is in "Objective": the real signal is expected lateness and driver fairness, while teams usually reach for distance only.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $3.7K a month. A mistake is expensive in the way on-time delivery rate measures it.

**What success looks like.** Offline: Cost vs best-known solutions and Predicted vs actual service time MAE. Online: Cost per stop and On-time delivery rate. The launch is judged on "Cost per stop" while "On-time delivery rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Build daily delivery routes that minimise cost and lateness using learned service times and travel-time distributions.

**Training objective.** `\min_{R}\;\sum_{r\in R}\left(c_{\text{dist}}(r)+c_{\text{late}}\,\mathbb{E}[\text{lateness}(r)]\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min_{R} | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_{r\in R} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| c_{\text{dist}} | Cost coefficients: c_dist per unit distance and c_late per unit of lateness. |
| r | One route. |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \text{lateness} | How late the vehicle arrives at stops, in expectation over uncertain travel times. |

**Hard constraints**

- Time windows
- Vehicle capacity
- Driver hours
- Re-optimisation within 5 seconds mid-day

## The approach in one paragraph

Start with savings-algorithm VRP with fixed service times. Then earn the move to aLNS/OR-Tools solver fed by learned service-time and travel-time models, with a learned neighbourhood-selection policy and live re-optimisation, and only if it beats the baseline on Cost vs best-known solutions and Predicted vs actual service time MAE after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Stop service-time model | Predicted minutes per stop by building and parcel type. Realistic plan. Guard against: historical stop data. |
| Add Travel-time distribution | Quantiles per road segment and hour. Reliability. Guard against: traffic history. |
| Add Customer time-window flexibility | Historical acceptance of window changes. Slack. Guard against: preferences. |
| Run it as one pipeline | Order and address feed (OMS), Geocoder (address service), Service and travel time models (GBDT), VRP solver (ALNS with ML guidance), Route publisher (driver app), Dispatcher override (human) and Execution traces (telemetry). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle failed deliveries cascade through the route | Dynamic re-sequencing and buffer insertion. |

**Deliberately not doing**

- Driver name: handled by capability.
- Parcel ID: none.

**How the approach is proven**

Prove it offline on Cost vs best-known solutions and Predicted vs actual service time MAE using time-ordered splits, then online on "Cost per stop" with "On-time delivery rate" as the guardrail. Watch for: Benchmarks with synthetic service times and Ignoring driver deviations in evaluation.

## Baseline and production design

- **Baseline (build this first):** Savings-algorithm VRP with fixed service times.
- **Production design:** ALNS/OR-Tools solver fed by learned service-time and travel-time models, with a learned neighbourhood-selection policy and live re-optimisation.

## Why AI, and why this kind

**Why AI.** Build daily delivery routes that minimise cost and lateness using learned service times and travel-time distributions. The evidence that separates good from bad outcomes (Stop service-time model, Travel-time distribution, Customer time-window flexibility) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fixed average speeds and stop times" are what teams reach for first, and they fail because wrong inputs make an optimal solver produce bad routes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: ALNS/OR-Tools solver fed by learned service-time and travel-time models, with a learned neighbourhood-selection policy and live re-optimisation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Stop service-time model, Travel-time distribution, Customer time-window flexibility and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Savings-algorithm VRP with fixed service times | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| ALNS/OR-Tools solver fed by learned service-time and travel-time models, with a learned neighbourhood-selection policy and live re-optimisation | chosen | Meets the 2500 ms envelope at $0.207 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cost per stop) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Benchmarks with synthetic service times.
- Evaluation trap: Ignoring driver deviations in evaluation.
- Failed deliveries cascade through the route: later stops all late.
- Geocoding error sends driver to wrong location: the driver is sent to a wrong coordinate and loses minutes searching, delaying every later stop.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
