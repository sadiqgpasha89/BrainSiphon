# Pick-Path & Wave Planning: use-case brief

> Generated from the blueprint `supply-chain/pick-path-and-wave-planning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Pick-Path & Wave Planning · **Domain:** supply-chain · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Group orders into waves and sequence picks to meet cut-off times with minimal labour and congestion. The system has to run interactively, within a few seconds, inside these limits: Carrier cut-offs, Zone capacity and Pick-station balance.

**Why it is hard.** The obvious approach is single-order picks, and it fails because batching cuts travel dramatically. The second trap is in "Congestion": the real signal is aisle congestion as a constraint, while teams usually reach for shortest path per picker.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $3.6K a month. A mistake is expensive in the way pick cost per line measures it.

**What success looks like.** Offline: Simulated lines per hour and Cut-off miss rate. Online: Orders shipped on time and Pick cost per line. The launch is judged on "Orders shipped on time" while "Pick cost per line" must not get worse.

## Objective, loss and constraints

**Business objective.** Group orders into waves and sequence picks to meet cut-off times with minimal labour and congestion.

**Training objective.** `\min\;\sum_{w}\mathrm{PathLength}(w)+\lambda\,\mathrm{Lateness}+\mu\,\mathrm{Congestion}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_{w} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{PathLength} | The distance pickers walk to complete wave w. |
| w | A wave: a batch of orders released together. |
| \lambda | Weight on lateness: how strongly it counts against the main objective. |
| \mathrm{Lateness} | Penalty for orders completed after their cut-off. |
| \mu | Weight on congestion: how strongly it counts against the main objective. |
| \mathrm{Congestion} | Penalty for too many pickers in the same aisle. |

**Hard constraints**

- Carrier cut-offs
- Zone capacity
- Pick-station balance
- Re-plan every few minutes

## The approach in one paragraph

Start with first-come-first-served waves with fixed batch size. Then earn the move to rolling-horizon optimiser with learned travel-time estimates and a heuristic for batching, re-solved when orders arrive, and only if it beats the baseline on Simulated lines per hour and Cut-off miss rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Order due-time slack | Time to carrier cut-off. Priority. Guard against: cut-off table. |
| Add Zone workload | Pending lines per zone. Load balance. Guard against: real-time. |
| Add Aisle congestion estimate | Pickers per aisle. Delay. Guard against: sensors or WMS. |
| Run it as one pipeline | Order release (WMS), Travel-time model (regression), Batch optimiser (heuristics plus MILP), Path sequencer (TSP variants), Task push (picker handhelds), Floor supervisor override (human) and Completion events (WMS). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle late rush of orders before cut-off | Priority re-ranking and overflow pickers. |

**Deliberately not doing**

- Order ID: none.
- Customer: none.

**How the approach is proven**

Prove it offline on Simulated lines per hour and Cut-off miss rate using time-ordered splits, then online on "Orders shipped on time" with "Pick cost per line" as the guardrail. Watch for: Travel time assumptions from empty warehouse and Ignoring pick errors.

## Baseline and production design

- **Baseline (build this first):** First-come-first-served waves with fixed batch size.
- **Production design:** Rolling-horizon optimiser with learned travel-time estimates and a heuristic for batching, re-solved when orders arrive.

## Why AI, and why this kind

**Why AI.** Group orders into waves and sequence picks to meet cut-off times with minimal labour and congestion. The evidence that separates good from bad outcomes (Order due-time slack, Zone workload, Aisle congestion estimate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single-order picks" are what teams reach for first, and they fail because batching cuts travel dramatically. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Rolling-horizon optimiser with learned travel-time estimates and a heuristic for batching, re-solved when orders arrive.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Order due-time slack, Zone workload, Aisle congestion estimate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: First-come-first-served waves with fixed batch size | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Rolling-horizon optimiser with learned travel-time estimates and a heuristic for batching, re-solved when orders arrive | chosen | Meets the 2500 ms envelope at $0.200 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Orders shipped on time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Travel time assumptions from empty warehouse.
- Evaluation trap: Ignoring pick errors.
- Late rush of orders before cut-off: schedule collapses.
- Stockout discovered at pick: route becomes invalid.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
