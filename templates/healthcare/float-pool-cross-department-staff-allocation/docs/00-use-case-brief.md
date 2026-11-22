# Float Pool & Cross-Department Staff Allocation: use-case brief

> Generated from the blueprint `healthcare/float-pool-cross-department-staff-allocation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Float Pool & Cross-Department Staff Allocation · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Allocate eligible float-pool and cross-trained staff to units with shortages, improving coverage while preserving continuity, fairness, rest periods and cost limits. The system has to run as a scheduled batch job, inside these limits: Hard constraints cover licensure, competency, rest periods, maximum hours and collective-agreement rules, Soft objectives cover continuity, fairness of float burden and cost and Every plan includes the reasons options were rejected.

**Why it is hard.** The obvious approach is matching on job title, and it fails because a nurse with the right title may lack the unit competency. The second trap is in "Fairness": the real signal is float burden distributed across the pool with a transparent metric, while teams usually reach for always floating the most flexible people.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way premium labour hours avoided measures it.

**What success looks like.** Offline: Unmet required hours vs the best plan in hindsight, Float burden Gini across the pool and Solver gap and time to feasible. Online: Coverage achieved at shift start, Premium labour hours avoided and Float-pool retention. The launch is judged on "Coverage achieved at shift start" while "Premium labour hours avoided" must not get worse.

## Objective, loss and constraints

**Business objective.** Allocate eligible float-pool and cross-trained staff to units with shortages, improving coverage while preserving continuity, fairness, rest periods and cost limits.

**Training objective.** `\min\;\sum_u \text{shortage}_u+\lambda\,\text{float burden imbalance}+\mu\,\text{extra cost}+\nu\,\text{continuity breaks}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_u | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \text{shortage}_u | Required hours still unmet on unit u after the allocation. |
| \lambda | Weight on float burden imbalance: how strongly unfair float distribution counts against coverage. |
| \text{float burden imbalance} | How unevenly float shifts fall across the pool, for example the gap between the most and least floated staff. |
| \mu | Weight on extra cost: how strongly spend counts against coverage. |
| \text{extra cost} | Premium pay, travel and agency cost above the baseline roster. |
| \nu | Weight on continuity breaks: how strongly unfamiliar assignments count against coverage. |
| \text{continuity breaks} | Assignments to a unit the person has not worked on recently, which cost familiarity and handover time. |

**Hard constraints**

- Hard constraints cover licensure, competency, rest periods, maximum hours and collective-agreement rules
- Soft objectives cover continuity, fairness of float burden and cost
- Every plan includes the reasons options were rejected
- A human approves before any assignment is published
- The solver reports status, gap to optimum and a deterministic fallback
- Pseudonymous staff IDs in the solver

## The approach in one paragraph

Start with manual allocation by the float coordinator from a spreadsheet. Then earn the move to mixed-integer program solved with a constraint solver with hard licensure, competency and rest constraints, weighted soft objectives for continuity, fairness and cost, a feasibility explainer and a greedy fallback, and only if it beats the baseline on Unmet required hours vs the best plan in hindsight and Float burden Gini across the pool after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Coverage gain | Reduction in unmet required hours if the person is assigned. Direct measure of value of each assignment. Guard against: use the shortage list at solve time. |
| Add Continuity score | Prior shifts the person worked on the receiving unit. Familiarity reduces risk and handover cost. Guard against: count only completed past shifts. |
| Add Float burden | Float shifts in the trailing 8 weeks relative to the pool median. Keeps the load fair and the pool willing. Guard against: window must end before the solve. |
| Run it as one pipeline | Shortage and availability intake (scheduling extract), Eligibility rules (credential and competency validator), Allocation optimizer (OR-Tools CP-SAT), Fairness and cost evaluator (metric service) and Publish and notification (scheduling system), with Float coordinator review and Audit and outcome log off the critical path. |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle no feasible plan | Return the largest feasible partial plan and the binding constraints as escalation reasons. |

**Deliberately not doing**

- Seniority alone: does not equal unit competency and entrenches the same people floating.
- Past acceptance of incentives: confounds willingness with need.
- Unit manager preference ranking: informal and unfair when used as a score.

**How the approach is proven**

Prove it offline on Unmet required hours vs the best plan in hindsight, Float burden Gini across the pool and Solver gap and time to feasible using time-ordered splits, then online on "Coverage achieved at shift start" with "Premium labour hours avoided" as the guardrail. Watch for: Scoring plans on forecast shortage only, Ignoring float burden fairness and Treating a greedy fallback as the optimum.

## Baseline and production design

- **Baseline (build this first):** Manual allocation by the float coordinator from a spreadsheet.
- **Production design:** Mixed-integer program solved with a constraint solver with hard licensure, competency and rest constraints, weighted soft objectives for continuity, fairness and cost, a feasibility explainer and a greedy fallback.

## Why AI, and why this kind

**Why AI.** Allocate eligible float-pool and cross-trained staff to units with shortages, improving coverage while preserving continuity, fairness, rest periods and cost limits. The evidence that separates good from bad outcomes (Coverage gain, Continuity score, Float burden) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "matching on job title" are what teams reach for first, and they fail because A nurse with the right title may lack the unit competency. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Mixed-integer program solved with a constraint solver with hard licensure, competency and rest constraints, weighted soft objectives for continuity, fairness and cost, a feasibility explainer and a greedy fallback.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Coverage gain, Continuity score, Float burden and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual allocation by the float coordinator from a spreadsheet | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Mixed-integer program solved with a constraint solver with hard licensure, competency and rest constraints, weighted soft objectives for continuity, fairness and cost, a feasibility explainer and a greedy fallback | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Coverage achieved at shift start) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Scoring plans on forecast shortage only.
- Evaluation trap: Ignoring float burden fairness.
- No feasible plan: hard constraints leave a shortage uncovered.
- Credential expires overnight: an assigned person becomes ineligible.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
