# Provider Onboarding Cycle-Time Optimization: use-case brief

> Generated from the blueprint `healthcare/provider-onboarding-cycle-time-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Onboarding Cycle-Time Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find the bottlenecks across HR, credentialing, IT, facilities, payer enrollment and department readiness and recommend the task sequencing that shortens time to start-readiness. The system has to run as a scheduled batch job, inside these limits: Owners approve every task reassignment and every start-date change, Critical-path analysis uses explicit dependencies including hard prerequisites such as credentialing and Recommendations never skip a mandatory verification step.

**Why it is hard.** The obvious approach is inferred order from average timing, and it fails because order inferred from history repeats past mistakes. The second trap is in "Bottleneck": the real signal is queue and handoff delay at a stage, while teams usually reach for the slowest task by duration.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way cases starting on the planned date measures it.

**What success looks like.** Offline: Remaining-time error by case, Critical-path hit rate and Simulated lateness against the best plan in hindsight. Online: Days from offer to start-readiness, Cases starting on the planned date and Idle wait per case. The launch is judged on "Days from offer to start-readiness" while "Cases starting on the planned date" must not get worse.

## Objective, loss and constraints

**Business objective.** Find the bottlenecks across HR, credentialing, IT, facilities, payer enrollment and department readiness and recommend the task sequencing that shortens time to start-readiness.

**Training objective.** `\min\;\sum_c \text{lateness}_c+\lambda\,\text{idle wait}+\mu\,\text{rework}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_c | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \text{lateness}_c | Days by which case c is past its planned start-readiness date. |
| \lambda | Weight on idle wait: how strongly queue time counts against lateness. |
| \text{idle wait} | Time tasks sit in a queue waiting for an owner team rather than being worked. |
| \mu | Weight on rework: how strongly reopened tasks count against lateness. |
| \text{rework} | Tasks reopened because the previous handoff lacked information. |

**Hard constraints**

- Owners approve every task reassignment and every start-date change
- Critical-path analysis uses explicit dependencies including hard prerequisites such as credentialing
- Recommendations never skip a mandatory verification step
- Duration predictions carry intervals
- Handles 40K onboarding cases per year with parallel tasks
- Process-mining logs hold pseudonymous provider IDs

## The approach in one paragraph

Start with gantt chart with static durations maintained by the coordinator. Then earn the move to process mining on the event log with duration models per task, critical-path computation on the dependency graph, a scheduler that proposes resequencing and reassignment under capacity limits, and an explanation of each recommendation, and only if it beats the baseline on Remaining-time error by case and Critical-path hit rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Critical-path slack | Latest start minus earliest start for each open task. Identifies tasks that drive the date. Guard against: use the dependency graph at scoring time. |
| Add Queue wait time | Median waiting time before a task is picked up by the owner team. Shows capacity limits. Guard against: event timestamps. |
| Add Rework rate | Share of tasks reopened for missing information. Quality of handoff. Guard against: past cycles only. |
| Run it as one pipeline | Workflow event intake (process-mining log), Dependency graph builder (workflow definitions), Duration predictor (gradient boosting survival), Critical-path scheduler (constraint solver) and Policy and mandatory-step rules (rules), with Onboarding coordinator review and Outcome and audit log off the critical path. |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing events from one system | Event-completeness checks per source before mining. |

**Deliberately not doing**

- Task owner seniority: not a cause of delay.
- Calendar month alone: mixes many causes.
- Provider specialty prestige: irrelevant.

**How the approach is proven**

Prove it offline on Remaining-time error by case, Critical-path hit rate and Simulated lateness against the best plan in hindsight using time-ordered splits, then online on "Days from offer to start-readiness" with "Cases starting on the planned date" as the guardrail. Watch for: Learning order from history rather than rules, Ignoring queue wait and Measuring task duration but not handoff delay.

## Baseline and production design

- **Baseline (build this first):** Gantt chart with static durations maintained by the coordinator.
- **Production design:** Process mining on the event log with duration models per task, critical-path computation on the dependency graph, a scheduler that proposes resequencing and reassignment under capacity limits, and an explanation of each recommendation.

## Why AI, and why this kind

**Why AI.** Find the bottlenecks across HR, credentialing, IT, facilities, payer enrollment and department readiness and recommend the task sequencing that shortens time to start-readiness. The evidence that separates good from bad outcomes (Critical-path slack, Queue wait time, Rework rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "inferred order from average timing" are what teams reach for first, and they fail because order inferred from history repeats past mistakes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Process mining on the event log with duration models per task, critical-path computation on the dependency graph, a scheduler that proposes resequencing and reassignment under capacity limits, and an explanation of each recommendation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Critical-path slack, Queue wait time, Rework rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Gantt chart with static durations maintained by the coordinator | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Process mining on the event log with duration models per task, critical-path computation on the dependency graph, a scheduler that proposes resequencing and reassignment under capacity limits, and an explanation of each recommendation | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Days from offer to start-readiness) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Learning order from history rather than rules.
- Evaluation trap: Ignoring queue wait.
- Missing events from one system: the process looks shorter than it is.
- Task reopened: duration is double counted.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
