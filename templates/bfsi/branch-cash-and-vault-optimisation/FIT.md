# Branch Cash & Vault Optimisation: how well the starter fits

> Generated from the blueprint `bfsi/branch-cash-and-vault-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

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

- Score "Forecast pinball loss" and "Stock-out rate" instead of the kit metrics
- Add the scheduling structure the kit does not model (time slots, precedence, capacity over time) and score the schedule against true durations; Add the multi-period, multi-resource structure (inventory, packing or network flow) that the kit's one-shot assignment lacks

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Allocation, routing and scheduling optimisation: Plan cash holdings and shipments for branch vaults so branches rarely run out and the bank does not hold idle cash | Allocation, routing and scheduling optimisation | match |  |
| label | The assignment, route or schedule that minimises realised cost under constraints | The quantity to minimise is realised total cost; predictions are inputs only and the plan is scored against true costs, with the optimal plan under true costs as the reference | match |  |
| validation | Instances with known true costs, scored against the best plan in hindsight | Instances with known true costs; regret against the oracle and the gap between promised and realised cost | match |  |
| metrics | Forecast pinball loss; Stock-out rate | Realised cost, regret against the oracle and optimism of the promise | adapt | Score "Forecast pinball loss" and "Stock-out rate" instead of the kit metrics |
| data | Allocation instances with predicted costs and hard constraints | Assignment instances with predicted costs, uncertainty and hard constraints | match |  |
| model | Baseline: Fixed par stock per branch with replenishment on a schedule, because it is the current practice. Production: Quantile demand forecasts by denomination feeding a stochastic inventory optimiser that sets shipment sizes w… | Greedy assignment, optimal assignment on predictions and optimal assignment with an uncertainty penalty | adapt | Add the scheduling structure the kit does not model (time slots, precedence, capacity over time) and score the schedule against true durations; Add the multi-period, multi-resource structure (inventory, packing or network flow) that the kit's one-shot assignment lacks |
| serving | Scheduled batch run | Offline scripts only: no scheduled planner, re-optimisation trigger or plan publication | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Event calendar (configuration store); Outcome store (warehouse) | None. Runs locally on synthetic assignment instances | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
