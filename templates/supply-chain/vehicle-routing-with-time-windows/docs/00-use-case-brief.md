# Fleet Planning & Vehicle Routing with Time Windows: use-case brief

> Generated from the blueprint `supply-chain/vehicle-routing-with-time-windows` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fleet Planning & Vehicle Routing with Time Windows · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Plan multi-day fleet assignments across depots for a regional network, minimising cost under capacity and driver-hour constraints. The system has to run as a scheduled batch job, inside these limits: Planning window of 2 hours overnight, Mixed fleets and Regulations on hours.

**Why it is hard.** The obvious approach is solving the full problem exactly, and it fails because exact solvers time out at scale. The second trap is in "Robustness": the real signal is plans with buffers and scenarios, while teams usually reach for tight deterministic plans.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.6K a month. A mistake is expensive in the way late deliveries measures it.

**What success looks like.** Offline: Gap to best-known solution and Plan feasibility rate in simulation. Online: Cost per delivered unit and Late deliveries. The launch is judged on "Cost per delivered unit" while "Late deliveries" must not get worse.

## Objective, loss and constraints

**Business objective.** Plan multi-day fleet assignments across depots for a regional network, minimising cost under capacity and driver-hour constraints.

**Training objective.** `\min\;\sum_k c_k\,\mathbb{1}[k\ \text{used}]+\sum_{(i,j)}d_{ij}x_{ijk}+\lambda\,\mathrm{Lateness}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_k | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| c_k | The fixed cost of using vehicle k. |
| \mathbb{1} | Indicator: equals 1 when the condition in the brackets is true and 0 otherwise. |
| k | A vehicle. |
| \text{used} | Whether the vehicle is used. |
| d_{ij} | The distance between stops i and j. |
| x_{ijk} | Decision: x_{ijk} is 1 if vehicle k drives from stop i to stop j. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Lateness} | Penalty for arriving after a customer's time window. |

**Hard constraints**

- Planning window of 2 hours overnight
- Mixed fleets
- Regulations on hours
- Re-plan on disruptions

## The approach in one paragraph

Start with cluster-first route-second heuristic. Then earn the move to hybrid pipeline: learned clustering and attention-based construction heuristic, followed by LNS improvement under a time budget, and only if it beats the baseline on Gap to best-known solution and Plan feasibility rate in simulation after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Demand uncertainty scenarios | Sampled order volumes per lane. Robust plan. Guard against: scenario generation model. |
| Add Depot capacity utilisation | Dock slots per hour. Feasibility. Guard against: real constraints. |
| Add Driver-hours remaining | Regulation tracker. Compliance. Guard against: duty rules. |
| Run it as one pipeline | Order consolidation (OMS), Demand scenario generator (forecast model), Construction heuristic (attention model), LNS improver (solver), Constraint checker (regulation rules) and Planner approval (human), with Execution feedback off the critical path. |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle vehicle breakdown mid-plan | Fast local repair and spare capacity pool. |

**Deliberately not doing**

- Customer name: none.
- Order creation hour: none.

**How the approach is proven**

Prove it offline on Gap to best-known solution and Plan feasibility rate in simulation using time-ordered splits, then online on "Cost per delivered unit" with "Late deliveries" as the guardrail. Watch for: Learning on small instances and testing on large ones and Ignoring execution variance.

## Baseline and production design

- **Baseline (build this first):** Cluster-first route-second heuristic.
- **Production design:** Hybrid pipeline: learned clustering and attention-based construction heuristic, followed by LNS improvement under a time budget.

## Why AI, and why this kind

**Why AI.** Plan multi-day fleet assignments across depots for a regional network, minimising cost under capacity and driver-hour constraints. The evidence that separates good from bad outcomes (Demand uncertainty scenarios, Depot capacity utilisation, Driver-hours remaining) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "solving the full problem exactly" are what teams reach for first, and they fail because exact solvers time out at scale. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Hybrid pipeline: learned clustering and attention-based construction heuristic, followed by LNS improvement under a time budget.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Demand uncertainty scenarios, Depot capacity utilisation, Driver-hours remaining and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Cluster-first route-second heuristic | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hybrid pipeline: learned clustering and attention-based construction heuristic, followed by LNS improvement under a time budget | chosen | Meets the run-window envelope at $0.363 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cost per delivered unit) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Learning on small instances and testing on large ones.
- Evaluation trap: Ignoring execution variance.
- Vehicle breakdown mid-plan: stops assigned to the broken vehicle go unserved until a manual recovery plan exists.
- Regulation change on driving hours: plans become illegal.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
