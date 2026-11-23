# Evacuation Route Planning: use-case brief

> Generated from the blueprint `public-safety/evacuation-route-planning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Evacuation Route Planning · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Compute evacuation routes and staging that account for road capacity, hazards and vulnerable populations, so planners and commanders test and choose plans. The system has to run interactively, within a few seconds, inside these limits: Plans consider residents with mobility needs from consented registers, Commanders approve every instruction and Simulations compare plans in minutes.

**Why it is hard.** The obvious approach is free-flow speed, and it fails because evacuation traffic exceeds normal capacity. The second trap is in "Equity": the real signal is plans covering people without cars, while teams usually reach for car-owner assumptions.

**Scale and stakes.** At 10 million users this is about 15.0M model-touching events a day, 174 requests per second on average and 1.0K at peak, at an estimated $4.3K a month. A mistake is expensive in the way residents without transport assisted measures it.

**What success looks like.** Offline: Clearance time in simulation, Coverage of vulnerable residents and Replan time. Online: Evacuation clearance time, Residents without transport assisted and Exercise findings. The launch is judged on "Evacuation clearance time" while "Residents without transport assisted" must not get worse.

## Objective, loss and constraints

**Business objective.** Compute evacuation routes and staging that account for road capacity, hazards and vulnerable populations, so planners and commanders test and choose plans.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Plans consider residents with mobility needs from consented registers
- Commanders approve every instruction
- Simulations compare plans in minutes
- Road closures update the model live
- 500K residents

## The approach in one paragraph

Start with pre-planned zone evacuation maps and orders, because they are the standard preparation. Then earn the move to a traffic simulation with an optimiser for route and timing plans, vulnerable resident coverage and a command view for approval and live replan, and only if it beats the baseline on Clearance time in simulation and Coverage of vulnerable residents after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Road capacity and closures | Live capacity of roads. Constraint. Guard against: from traffic data. |
| Add Hazard spread forecast | Predicted fire or flood extent. Timing. Guard against: from hazard models. |
| Add Population by area and mode | Residents and transport availability. Demand. Guard against: from census and registers. |
| Run it as one pipeline | Network and hazard data (GIS and hazard models), Population and need model (aggregated registers), Evacuation simulation (traffic model), Plan optimiser (solver) and Alert wording (approved templates), with Commander review and Exercise review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle blocked road | Live replanning. |

**Deliberately not doing**

- Planner name: irrelevant.
- Exercise label: an artefact.
- Map style: an artefact.

**How the approach is proven**

Prove it offline on Clearance time in simulation, Coverage of vulnerable residents and Replan time using time-ordered splits, then online on "Evacuation clearance time" with "Residents without transport assisted" as the guardrail. Watch for: Free-flow assumptions, Car-owner assumptions and Automatic public instructions.

## Baseline and production design

- **Baseline (build this first):** Pre-planned zone evacuation maps and orders, because they are the standard preparation.
- **Production design:** A traffic simulation with an optimiser for route and timing plans, vulnerable resident coverage and a command view for approval and live replan.

## Why AI, and why this kind

**Why AI.** Compute evacuation routes and staging that account for road capacity, hazards and vulnerable populations, so planners and commanders test and choose plans. The evidence that separates good from bad outcomes (Road capacity and closures, Hazard spread forecast, Population by area and mode) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free-flow speed" are what teams reach for first, and they fail because evacuation traffic exceeds normal capacity. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A traffic simulation with an optimiser for route and timing plans, vulnerable resident coverage and a command view for approval and live replan.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Road capacity and closures, Hazard spread forecast, Population by area and mode and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Pre-planned zone evacuation maps and orders, because they are the standard preparation | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A traffic simulation with an optimiser for route and timing plans, vulnerable resident coverage and a command view for approval and live replan | chosen | Meets the 2500 ms envelope at $0.0096 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Evacuation clearance time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Free-flow assumptions.
- Evaluation trap: Car-owner assumptions.
- Blocked road: a planned route is cut by a hazard.
- Hazard faster than forecast: the timeline shrinks.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
