# Course Timetabling & Classroom Allocation: use-case brief

> Generated from the blueprint `edtech/classroom-allocation-and-timetable` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Course Timetabling & Classroom Allocation · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Allocate courses to times and rooms to maximise utilisation and student/teacher preferences under capacity and accessibility constraints. The system has to run as a scheduled batch job, inside these limits: Hard constraints, Multi-campus travel and Enrolment forecasts.

**Why it is hard.** The obvious approach is use last year's room sizes, and it fails because demand shifts by programme. The second trap is in "Preferences": the real signal is weighted student and teacher preferences, while teams usually reach for ignoring gaps.

**Scale and stakes.** At 10 million users this is about 3.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.6K a month. A mistake is expensive in the way student gap hours measures it.

**What success looks like.** Offline: Preference satisfaction and room utilisation and Forecast MAPE. Online: Utilisation rate and Student gap hours. The launch is judged on "Utilisation rate" while "Student gap hours" must not get worse.

## Objective, loss and constraints

**Business objective.** Allocate courses to times and rooms to maximise utilisation and student/teacher preferences under capacity and accessibility constraints.

**Training objective.** `\min\;\text{preference violations}+\lambda\,\text{room waste}+\mu\,\text{gaps}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \text{preference violations} | Count of teacher or student preferences that the timetable breaks. |
| \lambda | Weight on room waste: how strongly it counts against the main objective. |
| \text{room waste} | Empty seats: room capacity minus class size. |
| \mu | Weight on gaps: how strongly it counts against the main objective. |
| \text{gaps} | Idle gaps in a timetable between classes. |

**Hard constraints**

- Hard constraints
- Multi-campus travel
- Enrolment forecasts
- Term-planning timelines

## The approach in one paragraph

Start with previous year's timetable with manual edits. Then earn the move to enrolment forecasting plus ILP or CP-SAT timetabling with preference weights and iterative improvement, and only if it beats the baseline on Preference satisfaction and room utilisation and Forecast MAPE after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Enrolment forecast | Predicted course enrolment. Capacity. Guard against: model. |
| Add Travel time between rooms | Campus distances. Feasibility. Guard against: maps. |
| Add Teacher preferences | Availability windows. Soft constraints. Guard against: survey. |
| Run it as one pipeline | Enrolment forecast (ML), Constraint model builder (SIS data), Timetable solver (CP-SAT), Preference scorer (weights), Publication (SIS) and Utilisation analytics (BI), with Registrar review off the critical path. |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle enrolment under-forecast | Safety margins and flexible rooms. |

**Deliberately not doing**

- Course name: none.
- Department: weak.

**How the approach is proven**

Prove it offline on Preference satisfaction and room utilisation and Forecast MAPE using time-ordered splits, then online on "Utilisation rate" with "Student gap hours" as the guardrail. Watch for: Optimising on forecasts without uncertainty and Ignoring accessibility needs.

## Baseline and production design

- **Baseline (build this first):** Previous year's timetable with manual edits.
- **Production design:** Enrolment forecasting plus ILP or CP-SAT timetabling with preference weights and iterative improvement.

## Why AI, and why this kind

**Why AI.** Allocate courses to times and rooms to maximise utilisation and student/teacher preferences under capacity and accessibility constraints. The evidence that separates good from bad outcomes (Enrolment forecast, Travel time between rooms, Teacher preferences) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "use last year's room sizes" are what teams reach for first, and they fail because demand shifts by programme. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Enrolment forecasting plus ILP or CP-SAT timetabling with preference weights and iterative improvement.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Enrolment forecast, Travel time between rooms, Teacher preferences and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Previous year's timetable with manual edits | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Enrolment forecasting plus ILP or CP-SAT timetabling with preference weights and iterative improvement | chosen | Meets the run-window envelope at $17.95 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Utilisation rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Optimising on forecasts without uncertainty.
- Evaluation trap: Ignoring accessibility needs.
- Enrolment under-forecast: under-forecast enrolment allocates a room that is too small on the first day of term.
- Campus travel not modelled: back-to-back classes impossible.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
