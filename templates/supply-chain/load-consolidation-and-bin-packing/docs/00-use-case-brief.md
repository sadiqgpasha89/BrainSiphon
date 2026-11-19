# Load Consolidation & 3D Bin Packing: use-case brief

> Generated from the blueprint `supply-chain/load-consolidation-and-bin-packing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Load Consolidation & 3D Bin Packing · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Pack orders into containers and trailers to minimise empty space while respecting weight, stacking and delivery order. The system has to run as a scheduled batch job, inside these limits: Axle weight limits, Fragile and stacking rules and Delivery sequence.

**Why it is hard.** The obvious approach is volume-only packing, and it fails because volume-feasible plans can be unstable or undeliverable. The second trap is in "Heuristics": the real signal is learned packing heuristics with local search, while teams usually reach for exact MIP at scale.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way loading time measures it.

**What success looks like.** Offline: Container count vs baseline and Constraint violation rate. Online: Trailer utilisation and Loading time. The launch is judged on "Trailer utilisation" while "Loading time" must not get worse.

## Objective, loss and constraints

**Business objective.** Pack orders into containers and trailers to minimise empty space while respecting weight, stacking and delivery order.

**Training objective.** `\min\;\#\text{containers}+\lambda\,\text{unload penalties}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \text{containers} | The number of containers or trucks used, which the plan tries to minimise. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \text{unload penalties} | Extra cost when loads are packed so that unloading order is awkward. |

**Hard constraints**

- Axle weight limits
- Fragile and stacking rules
- Delivery sequence
- Solve in seconds

## The approach in one paragraph

Start with first-fit decreasing by volume. Then earn the move to learned placement policy (attention) with beam search and local improvement, constraint checker for stability and legal axle loads, and only if it beats the baseline on Container count vs baseline and Constraint violation rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Item dimensions and fragility class | Master data. Packing. Guard against: accuracy. |
| Add Delivery sequence rank | Unload order. Accessibility. Guard against: route plan. |
| Add Axle load distribution | Weight balance. Safety. Guard against: calc. |
| Run it as one pipeline | Order and item data (OMS), Dimension validator (master data), Packing policy (attention model), Local search (improvement heuristic), Constraint verifier (physics rules), Loader instructions (handheld) and Load outcomes (feedback). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle wrong item dimensions | Dimension audits and scan-based verification. |

**Deliberately not doing**

- Item name: none.
- Customer: none.

**How the approach is proven**

Prove it offline on Container count vs baseline and Constraint violation rate using time-ordered splits, then online on "Trailer utilisation" with "Loading time" as the guardrail. Watch for: Benchmarks with random boxes and Ignoring unloading sequence.

## Baseline and production design

- **Baseline (build this first):** First-fit decreasing by volume.
- **Production design:** Learned placement policy (attention) with beam search and local improvement, constraint checker for stability and legal axle loads.

## Why AI, and why this kind

**Why AI.** Pack orders into containers and trailers to minimise empty space while respecting weight, stacking and delivery order. The evidence that separates good from bad outcomes (Item dimensions and fragility class, Delivery sequence rank, Axle load distribution) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "volume-only packing" are what teams reach for first, and they fail because volume-feasible plans can be unstable or undeliverable. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Learned placement policy (attention) with beam search and local improvement, constraint checker for stability and legal axle loads.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Item dimensions and fragility class, Delivery sequence rank, Axle load distribution and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: First-fit decreasing by volume | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Learned placement policy (attention) with beam search and local improvement, constraint checker for stability and legal axle loads | chosen | Meets the run-window envelope at $0.182 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Trailer utilisation) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Benchmarks with random boxes.
- Evaluation trap: Ignoring unloading sequence.
- Wrong item dimensions: packing infeasible on dock.
- Late additions to the load: last-minute additions invalidate the packing plan and force an unplanned full repack.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
