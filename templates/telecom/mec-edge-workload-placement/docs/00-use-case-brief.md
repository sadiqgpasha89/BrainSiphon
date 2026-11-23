# MEC Edge Workload Placement: use-case brief

> Generated from the blueprint `telecom/mec-edge-workload-placement` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** MEC Edge Workload Placement · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Decide where to place and move edge workloads such as video analytics or industrial control across network edge sites, balancing latency, cost and capacity. The system has to run interactively, within a few seconds, inside these limits: Placement honours latency and data-residency constraints, Moves cause no service interruption and Human approval for new tenants.

**Why it is hard.** The obvious approach is a cost-only placement, and it fails because a cheap site that misses latency is useless. The second trap is in "Demand": the real signal is forecast load per site, while teams usually reach for static capacity.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $3.7K a month. A mistake is expensive in the way edge compute cost measures it.

**What success looks like.** Offline: Constraint violation rate in simulation, Latency target attainment and Forecast error. Online: SLA attainment for edge services, Edge compute cost and Disruptive migrations. The launch is judged on "SLA attainment for edge services" while "Edge compute cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Decide where to place and move edge workloads such as video analytics or industrial control across network edge sites, balancing latency, cost and capacity.

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

- Placement honours latency and data-residency constraints
- Moves cause no service interruption
- Human approval for new tenants
- Decisions within 20 s
- 5K workloads across 500 edge sites

## The approach in one paragraph

Start with place each workload at the nearest site with enough capacity, because it is the simplest scheme. Then earn the move to a constrained optimiser with a learned demand model and a migration cost term, simulated before use and executed through orchestrator templates, and only if it beats the baseline on Constraint violation rate in simulation and Latency target attainment after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Latency to users | Measured latency from the user population to each site. Constraint check. Guard against: live measurements. |
| Add Site capacity headroom | Spare compute and bandwidth. Feasibility. Guard against: live. |
| Add Workload demand forecast | Predicted load for the workload. Planning. Guard against: per workload. |
| Run it as one pipeline | Capacity and latency telemetry (edge monitoring), Demand forecast (time-series model), Placement optimiser (constrained solver), Simulation check (digital twin), Approval gate (risk tiers), Orchestration (edge orchestrator) and Outcome monitor (KPI checks). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle demand spike at one site | Overflow rules and quick scaling. |

**Deliberately not doing**

- Workload name: an identifier.
- Site name: an identifier.
- Tenant brand: irrelevant.

**How the approach is proven**

Prove it offline on Constraint violation rate in simulation, Latency target attainment and Forecast error using time-ordered splits, then online on "SLA attainment for edge services" with "Edge compute cost" as the guardrail. Watch for: Cost-only placement, Ignoring migration cost and No simulation.

## Baseline and production design

- **Baseline (build this first):** Place each workload at the nearest site with enough capacity, because it is the simplest scheme.
- **Production design:** A constrained optimiser with a learned demand model and a migration cost term, simulated before use and executed through orchestrator templates.

## Why AI, and why this kind

**Why AI.** Decide where to place and move edge workloads such as video analytics or industrial control across network edge sites, balancing latency, cost and capacity. The evidence that separates good from bad outcomes (Latency to users, Site capacity headroom, Workload demand forecast) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A cost-only placement" are what teams reach for first, and they fail because A cheap site that misses latency is useless. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A constrained optimiser with a learned demand model and a migration cost term, simulated before use and executed through orchestrator templates.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Latency to users, Site capacity headroom, Workload demand forecast and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Place each workload at the nearest site with enough capacity, because it is the simplest scheme | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A constrained optimiser with a learned demand model and a migration cost term, simulated before use and executed through orchestrator templates | chosen | Meets the 2500 ms envelope at $0.207 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (SLA attainment for edge services) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Cost-only placement.
- Evaluation trap: Ignoring migration cost.
- Demand spike at one site: capacity runs out.
- Site failure: workloads must move.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
