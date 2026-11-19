# Last-Mile Route Optimisation: how well the starter fits

> Generated from the blueprint `supply-chain/last-mile-route-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `optimize` (Allocation under predicted costs) · **Fit:** adaptable · **Problem type:** `optimisation-allocation`

The `optimize` engine implements a neighbouring problem. This use case is `optimisation-allocation`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter.

## Traps the synthetic data plants

- Trusting the promised cost
- Ignoring prediction uncertainty
- A greedy plan because it is simple
- Measuring plan quality on the planning data

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make before you rely on it

- Add route and time-window structure: the kit assigns items one at a time and has no routes, sequences or travel times. Replace the assignment solver with a routing solver and score tours, not assignments

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Allocation, routing and scheduling optimisation: Build daily delivery routes that minimise cost and lateness using learned service times and travel-time distributions | Allocation, routing and scheduling optimisation | match |  |
| label | The assignment, route or schedule that minimises realised cost under constraints | The quantity to minimise is realised total cost; predictions are inputs only and the plan is scored against true costs, with the optimal plan under true costs as the reference | match |  |
| validation | Instances with known true costs, scored against the best plan in hindsight | Instances with known true costs; regret against the oracle and the gap between promised and realised cost | match |  |
| metrics | Cost vs best-known solutions; Predicted vs actual service time MAE | Realised cost, regret against the oracle and optimism of the promise | match |  |
| data | Allocation instances with predicted costs and hard constraints | Assignment instances with predicted costs, uncertainty and hard constraints | match |  |
| model | Baseline: Savings-algorithm VRP with fixed service times. Production: ALNS/OR-Tools solver fed by learned service-time and travel-time models, with a learned neighbourhood-selecti… | Greedy assignment, optimal assignment on predictions and optimal assignment with an uncertainty penalty | adapt | Add route and time-window structure: the kit assigns items one at a time and has no routes, sequences or travel times. Replace the assignment solver with a routing solver and score tours, not assignments |
| serving | Interactive response in seconds (p99 2500 ms) | Offline scripts only: no scheduled planner, re-optimisation trigger or plan publication | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Execution traces (telemetry) | None. Runs locally on synthetic assignment instances | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
