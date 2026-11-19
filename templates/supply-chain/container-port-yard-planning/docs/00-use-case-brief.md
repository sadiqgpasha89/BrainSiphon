# Container Yard Stacking & Crane Planning: use-case brief

> Generated from the blueprint `supply-chain/container-port-yard-planning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Container Yard Stacking & Crane Planning · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Assign container slots and sequence crane moves to minimise reshuffles and vessel turnaround time. The system has to run as a scheduled batch job, inside these limits: Vessel schedules, Container weight and type constraints and Reefer plugs.

**Why it is hard.** The obvious approach is stack in arrival order, and it fails because late-pickup containers block early ones. The second trap is in "Objective": the real signal is rehandles and turnaround jointly, while teams usually reach for crane productivity alone.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 1 at peak, at an estimated $1.6K a month. A mistake is expensive in the way moves per crane hour measures it.

**What success looks like.** Offline: Rehandle count in simulation and Dwell-time prediction error. Online: Vessel turnaround time and Moves per crane hour. The launch is judged on "Vessel turnaround time" while "Moves per crane hour" must not get worse.

## Objective, loss and constraints

**Business objective.** Assign container slots and sequence crane moves to minimise reshuffles and vessel turnaround time.

**Training objective.** `\min\;\sum_c \mathbb{E}[\text{rehandles}_c]+\lambda\,\text{turnaround}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_c | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \text{rehandles}_c | The number of extra container moves needed to reach container c. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \text{turnaround} | How long ships and trucks wait in port. |

**Hard constraints**

- Vessel schedules
- Container weight and type constraints
- Reefer plugs
- Plan updates every 15 minutes

## The approach in one paragraph

Start with rule-based stacking by vessel and weight class. Then earn the move to learned dwell predictor feeding a stacking policy (value-function approximation) with a MIP for crane sequencing, and only if it beats the baseline on Rehandle count in simulation and Dwell-time prediction error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Pickup-time prediction | Predicted dwell time per container. Stacking order. Guard against: consignee history. |
| Add Stack height and exposure | Rehandle risk of position. Cost. Guard against: yard state. |
| Add Vessel stowage plan | Planned load sequence. Constraints. Guard against: plan version. |
| Run it as one pipeline | Gate and vessel data (TOS), Dwell predictor (GBDT), Stacking policy (approximate DP), Crane sequencer (MIP), Plan to equipment (TOS), Yard planner approval (human) and Move logs (telemetry). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle vessel arrives early or late | Rolling-horizon replan with disturbance triggers. |

**Deliberately not doing**

- Container ID: none.
- Shipping line colour: none.

**How the approach is proven**

Prove it offline on Rehandle count in simulation and Dwell-time prediction error using time-ordered splits, then online on "Vessel turnaround time" with "Moves per crane hour" as the guardrail. Watch for: Simulator with perfect information and Ignoring customs variance.

## Baseline and production design

- **Baseline (build this first):** Rule-based stacking by vessel and weight class.
- **Production design:** Learned dwell predictor feeding a stacking policy (value-function approximation) with a MIP for crane sequencing.

## Why AI, and why this kind

**Why AI.** Assign container slots and sequence crane moves to minimise reshuffles and vessel turnaround time. The evidence that separates good from bad outcomes (Pickup-time prediction, Stack height and exposure, Vessel stowage plan) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "stack in arrival order" are what teams reach for first, and they fail because late-pickup containers block early ones. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Learned dwell predictor feeding a stacking policy (value-function approximation) with a MIP for crane sequencing.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Pickup-time prediction, Stack height and exposure, Vessel stowage plan and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based stacking by vessel and weight class | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Learned dwell predictor feeding a stacking policy (value-function approximation) with a MIP for crane sequencing | chosen | Meets the run-window envelope at $0.899 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Vessel turnaround time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Simulator with perfect information.
- Evaluation trap: Ignoring customs variance.
- Vessel arrives early or late: plan invalidated.
- Customs holds appear: container immobile at bad slot.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
