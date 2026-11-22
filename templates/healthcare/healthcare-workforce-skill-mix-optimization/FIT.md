# Healthcare Workforce Skill-Mix Optimization: how well the starter fits

> Generated from the blueprint `healthcare/healthcare-workforce-skill-mix-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

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

- Score "Skill-gap hours vs the best plan in hindsight" and "Constraint violations per roster" instead of the kit metrics
- Add the scheduling structure the kit does not model (time slots, precedence, capacity over time) and score the schedule against true durations

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Allocation, routing and scheduling optimisation: Build shift rosters with the right competency, specialty, experience and supervision mix for forecast workload, with an auditable proof of each hard constraint | Allocation, routing and scheduling optimisation | match |  |
| label | The assignment, route or schedule that minimises realised cost under constraints | The quantity to minimise is realised total cost; predictions are inputs only and the plan is scored against true costs, with the optimal plan under true costs as the reference | match |  |
| validation | Instances with known true costs, scored against the best plan in hindsight | Instances with known true costs; regret against the oracle and the gap between promised and realised cost | match |  |
| metrics | Skill-gap hours vs the best plan in hindsight; Constraint violations per roster; Solver gap and time to feasible | Realised cost, regret against the oracle and optimism of the promise | adapt | Score "Skill-gap hours vs the best plan in hindsight" and "Constraint violations per roster" instead of the kit metrics |
| data | Allocation instances with predicted costs and hard constraints | Assignment instances with predicted costs, uncertainty and hard constraints | match |  |
| model | Baseline: Spreadsheet roster with a manual skill-mix check by the unit leader. Production: Constraint programming and mixed-integer optimisation with hard competency, supervision and rest constraints,… | Greedy assignment, optimal assignment on predictions and optimal assignment with an uncertainty penalty | adapt | Add the scheduling structure the kit does not model (time slots, precedence, capacity over time) and score the schedule against true durations |
| serving | Scheduled batch run | Offline scripts only: no scheduled planner, re-optimisation trigger or plan publication | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Competency and requirement intake (credential and scheduling extracts); Coverage proof and violation report (solver output); Unit leader and credentialing review (human): a person in the loop; Audit and outcome log (lakehouse) | None. Runs locally on synthetic assignment instances | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
