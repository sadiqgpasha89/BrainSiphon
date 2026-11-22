# Physician On-Call & Call-Rotation Optimization: use-case brief

> Generated from the blueprint `healthcare/physician-on-call-rotation-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Physician On-Call & Call-Rotation Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Build equitable, compliant on-call rotations that meet specialty coverage, availability, rest and contractual requirements, with a constraint proof and a log of every manual override. The system has to run as a scheduled batch job, inside these limits: Physician leadership approves and publishes every rotation and the solver only proposes, Coverage, privileges, rest and contract rules are hard constraints with a proof of satisfaction and Fairness is measured against comparable groups and reported.

**Why it is hard.** The obvious approach is soft penalties for rule breaks, and it fails because a rule break can be a safety or contract breach. The second trap is in "Fairness": the real signal is burden distribution within comparable groups, while teams usually reach for equal counts across all.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way share of rotations published without manual rework measures it.

**What success looks like.** Offline: Hard-constraint violations (must be zero), Burden dispersion within groups and Solver gap and time to feasible. Online: Coverage gaps, Share of rotations published without manual rework and Physician-reported fairness. The launch is judged on "Coverage gaps" while "Share of rotations published without manual rework" must not get worse.

## Objective, loss and constraints

**Business objective.** Build equitable, compliant on-call rotations that meet specialty coverage, availability, rest and contractual requirements, with a constraint proof and a log of every manual override.

**Training objective.** `\min\;\sum_p \text{burden}_p^2+\mu\sum_p \text{rule violation}_p\quad\text{s.t. coverage, rest and privilege constraints}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_p | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \text{burden}_p^2 | The weighted count of nights, weekends, holidays and call assigned to physician p, per FTE. |
| \mu | The penalty weight on soft-rule breaches relative to burden dispersion. |
| \text{rule violation}_p | The number of soft-rule breaches for physician p; hard rules cannot be broken. |

**Hard constraints**

- Physician leadership approves and publishes every rotation and the solver only proposes
- Coverage, privileges, rest and contract rules are hard constraints with a proof of satisfaction
- Fairness is measured against comparable groups and reported
- Solver status and gap are reported
- Plans 1.2K physicians across 60 specialty rotations per cycle
- Physician-level data is restricted to scheduling roles

## The approach in one paragraph

Start with a scheduler builds the rotation in a spreadsheet each quarter. Then earn the move to a constraint-programming and mixed-integer optimiser that treats coverage, privilege, rest and contract rules as hard constraints, minimises burden dispersion within comparable groups and emits a constraint proof and override log, and only if it beats the baseline on Hard-constraint violations (must be zero) and Burden dispersion within groups after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Availability and leave | Blocked dates and leave per physician. Defines feasibility. Guard against: roster snapshot. |
| Add Privileges and specialty | Procedures and sites a physician may cover. Eligibility for each slot. Guard against: privilege register. |
| Add Burden history | Nights, weekends and holidays worked in recent cycles. Fair allocation. Guard against: closed cycles. |
| Run it as one pipeline | Roster and rules intake (scheduling extracts), Constraint builder (rule compiler), Rotation optimizer (CP-SAT and MILP), Publication and notification (scheduling system) and Override and outcome log (lakehouse), with Fairness and proof reporter and Scheduler and leadership review off the critical path. |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle infeasible coverage | Show the binding rules and options for leadership. |

**Deliberately not doing**

- Physician seniority alone: not a rule.
- Request submission time: process artefact.
- Prior plan layout: format.

**How the approach is proven**

Prove it offline on Hard-constraint violations (must be zero), Burden dispersion within groups and Solver gap and time to feasible using time-ordered splits, then online on "Coverage gaps" with "Share of rotations published without manual rework" as the guardrail. Watch for: Soft-penalising a rest rule, Publishing without approval and Using total call counts as fairness.

## Baseline and production design

- **Baseline (build this first):** A scheduler builds the rotation in a spreadsheet each quarter.
- **Production design:** A constraint-programming and mixed-integer optimiser that treats coverage, privilege, rest and contract rules as hard constraints, minimises burden dispersion within comparable groups and emits a constraint proof and override log.

## Why AI, and why this kind

**Why AI.** Build equitable, compliant on-call rotations that meet specialty coverage, availability, rest and contractual requirements, with a constraint proof and a log of every manual override. The evidence that separates good from bad outcomes (Availability and leave, Privileges and specialty, Burden history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "soft penalties for rule breaks" are what teams reach for first, and they fail because A rule break can be a safety or contract breach. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A constraint-programming and mixed-integer optimiser that treats coverage, privilege, rest and contract rules as hard constraints, minimises burden dispersion within comparable groups and emits a constraint proof and override log.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Availability and leave, Privileges and specialty, Burden history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A scheduler builds the rotation in a spreadsheet each quarter | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A constraint-programming and mixed-integer optimiser that treats coverage, privilege, rest and contract rules as hard constraints, minimises burden dispersion within comparable groups and emits a constraint proof and override log | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Coverage gaps) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Soft-penalising a rest rule.
- Evaluation trap: Publishing without approval.
- Infeasible coverage: no rotation satisfies all rules.
- Mid-cycle leave: the plan breaks.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
