# Production Planning & Shop-Floor Scheduling: use-case brief

> Generated from the blueprint `supply-chain/production-planning-and-scheduling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Production Planning & Shop-Floor Scheduling · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Sequence jobs on machines to meet due dates with minimal changeovers and WIP, adapting to breakdowns and rush orders. The system has to run as a scheduled batch job, inside these limits: Machine eligibility, Changeover matrices and Due dates.

**Why it is hard.** The obvious approach is static daily plan, and it fails because disruptions invalidate static plans. The second trap is in "Objective": the real signal is weighted tardiness with setup costs, while teams usually reach for makespan only.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 1 at peak, at an estimated $1.6K a month. A mistake is expensive in the way changeover time measures it.

**What success looks like.** Offline: Weighted tardiness vs baseline rules and Schedule stability. Online: On-time delivery and Changeover time. The launch is judged on "On-time delivery" while "Changeover time" must not get worse.

## Objective, loss and constraints

**Business objective.** Sequence jobs on machines to meet due dates with minimal changeovers and WIP, adapting to breakdowns and rush orders.

**Training objective.** `\min\;\sum_j w_j T_j+\lambda\sum_m \text{setup}_m`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_j | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_j | The importance weight of job j. |
| T_j | The tardiness of job j: how late it finishes beyond its due date. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \text{setup}_m | The setup (changeover) time or cost on machine m. |

**Hard constraints**

- Machine eligibility
- Changeover matrices
- Due dates
- Reschedule in under 1 minute

## The approach in one paragraph

Start with dispatching rules (EDD, SPT). Then earn the move to cP-SAT scheduler with learned processing-time estimates and a neural dispatching policy for fast reactive decisions, and only if it beats the baseline on Weighted tardiness vs baseline rules and Schedule stability after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Setup time matrix | Changeover durations. Sequencing. Guard against: mES data. |
| Add Machine health state | Predicted downtime risk. Reliability. Guard against: sensors. |
| Add Job slack | Due date minus remaining processing. Priority. Guard against: routing. |
| Run it as one pipeline | Orders and BOM (ERP), Processing-time model (GBDT), CP-SAT scheduler (constraint solver), Reactive dispatcher (RL policy), Schedule publish (MES) and Planner override (human), with Shop-floor feedback off the critical path. |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle machine breakdown | Reactive re-sequencing and spare capacity rules. |

**Deliberately not doing**

- Job number: none.
- Operator ID: none.

**How the approach is proven**

Prove it offline on Weighted tardiness vs baseline rules and Schedule stability using time-ordered splits, then online on "On-time delivery" with "Changeover time" as the guardrail. Watch for: Using actual processing times known after the fact and Ignoring maintenance windows.

## Baseline and production design

- **Baseline (build this first):** Dispatching rules (EDD, SPT).
- **Production design:** CP-SAT scheduler with learned processing-time estimates and a neural dispatching policy for fast reactive decisions.

## Why AI, and why this kind

**Why AI.** Sequence jobs on machines to meet due dates with minimal changeovers and WIP, adapting to breakdowns and rush orders. The evidence that separates good from bad outcomes (Setup time matrix, Machine health state, Job slack) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "static daily plan" are what teams reach for first, and they fail because disruptions invalidate static plans. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: CP-SAT scheduler with learned processing-time estimates and a neural dispatching policy for fast reactive decisions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Setup time matrix, Machine health state, Job slack and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Dispatching rules (EDD, SPT) | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| CP-SAT scheduler with learned processing-time estimates and a neural dispatching policy for fast reactive decisions | chosen | Meets the run-window envelope at $0.899 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (On-time delivery) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using actual processing times known after the fact.
- Evaluation trap: Ignoring maintenance windows.
- Machine breakdown: schedule infeasible.
- Rush order insertion: tardiness cascades.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
