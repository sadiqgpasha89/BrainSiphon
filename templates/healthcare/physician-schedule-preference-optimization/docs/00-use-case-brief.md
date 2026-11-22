# Physician Schedule Preference Optimization: use-case brief

> Generated from the blueprint `healthcare/physician-schedule-preference-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Physician Schedule Preference Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Maximise physician preferences while meeting coverage, skill, continuity, workload and fairness constraints, and give the scheduling committee ranked feasible schedules with trade-off explanations. The system has to run as a scheduled batch job, inside these limits: The scheduling committee approves final schedules and exceptions, Coverage, skill, continuity, workload and contract rules are hard constraints and Preferences are soft and fairness in preference outcomes is measured.

**Why it is hard.** The obvious approach is preference as a hard goal, and it fails because patient coverage comes first. The second trap is in "Preferences": the real signal is weighted soft objective, while teams usually reach for hard requests.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way manual rework per cycle measures it.

**What success looks like.** Offline: Hard-constraint violations (must be zero), Preference satisfaction and its dispersion across physicians and Committee acceptance rate of the top schedule. Online: Preference satisfaction, Manual rework per cycle and Schedule publication lead time. The launch is judged on "Preference satisfaction" while "Manual rework per cycle" must not get worse.

## Objective, loss and constraints

**Business objective.** Maximise physician preferences while meeting coverage, skill, continuity, workload and fairness constraints, and give the scheduling committee ranked feasible schedules with trade-off explanations.

**Training objective.** `\max\;\sum_{p,s} x_{ps}\,\text{preference}_{ps}\quad\text{s.t. coverage, continuity, workload and fairness constraints}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \sum_{p,s} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| x_{ps} | Whether physician p is assigned to shift s: 1 if assigned and 0 if not. |
| \text{preference}_{ps} | The weighted preference score of physician p for shift s from their ranked requests. |

**Hard constraints**

- The scheduling committee approves final schedules and exceptions
- Coverage, skill, continuity, workload and contract rules are hard constraints
- Preferences are soft and fairness in preference outcomes is measured
- Each trade-off explains which constraint bound
- Solves 1.2K physicians per cycle
- Preference data is restricted to scheduling roles

## The approach in one paragraph

Start with a scheduler resolves preference conflicts by hand each cycle. Then earn the move to a multi-objective constraint optimiser with hard coverage, skill, continuity and contract constraints, a weighted preference objective with an alternation term for fairness, and an explainer for unmet requests, and only if it beats the baseline on Hard-constraint violations (must be zero) and Preference satisfaction and its dispersion across physicians after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Preference weight and window | Rank and timing of each request. The objective. Guard against: submission data. |
| Add Eligibility | Privilege and skill match for each shift. Feasibility. Guard against: privilege register. |
| Add Continuity needs | Existing patient-physician relationships by session. Care continuity. Guard against: schedule data. |
| Run it as one pipeline | Preference and roster intake (scheduling extracts), Constraint and objective builder (rule compiler), Schedule optimizer (CP-SAT and MILP), Alternative schedule ranker (multi-objective ranking) and Trade-off explainer (constraint analysis), with Scheduling committee review and Approved schedule and audit off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle many conflicting requests | Show the binding constraints and options. |

**Deliberately not doing**

- Submission time: not priority.
- Comment wording: free text.
- Physician seniority: not a rule.

**How the approach is proven**

Prove it offline on Hard-constraint violations (must be zero), Preference satisfaction and its dispersion across physicians and Committee acceptance rate of the top schedule using time-ordered splits, then online on "Preference satisfaction" with "Manual rework per cycle" as the guardrail. Watch for: Treating preferences as hard constraints, Optimising total satisfaction only and Publishing without committee approval.

## Baseline and production design

- **Baseline (build this first):** A scheduler resolves preference conflicts by hand each cycle.
- **Production design:** A multi-objective constraint optimiser with hard coverage, skill, continuity and contract constraints, a weighted preference objective with an alternation term for fairness, and an explainer for unmet requests.

## Why AI, and why this kind

**Why AI.** Maximise physician preferences while meeting coverage, skill, continuity, workload and fairness constraints, and give the scheduling committee ranked feasible schedules with trade-off explanations. The evidence that separates good from bad outcomes (Preference weight and window, Eligibility, Continuity needs) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "preference as a hard goal" are what teams reach for first, and they fail because patient coverage comes first. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A multi-objective constraint optimiser with hard coverage, skill, continuity and contract constraints, a weighted preference objective with an alternation term for fairness, and an explainer for unmet requests.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Preference weight and window, Eligibility, Continuity needs and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A scheduler resolves preference conflicts by hand each cycle | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A multi-objective constraint optimiser with hard coverage, skill, continuity and contract constraints, a weighted preference objective with an alternation term for fairness, and an explainer for unmet requests | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Preference satisfaction) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating preferences as hard constraints.
- Evaluation trap: Optimising total satisfaction only.
- Many conflicting requests: satisfaction is low.
- Late preference change: the plan is stale.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
