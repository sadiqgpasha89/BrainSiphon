# Exam Timetabling Optimisation: use-case brief

> Generated from the blueprint `edtech/exam-timetabling-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Exam Timetabling Optimisation · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Schedule exams across rooms and slots to minimise student clashes and back-to-back loads while satisfying room capacity and accessibility needs. The system has to run as a scheduled batch job, inside these limits: Hard constraints (no clashes, capacity), Accessibility rooms and Invigilator availability.

**Why it is hard.** The obvious approach is greedy assignment, and it fails because greedy leaves clashes that need manual repair. The second trap is in "Fairness": the real signal is balance student load, while teams usually reach for minimise total exams per day only.

**Scale and stakes.** At 10 million users this is about 3.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.6K a month. A mistake is expensive in the way manual repair hours measures it.

**What success looks like.** Offline: Clash count and student-load fairness and Solve time. Online: Complaints from clashes and Manual repair hours. The launch is judged on "Complaints from clashes" while "Manual repair hours" must not get worse.

## Objective, loss and constraints

**Business objective.** Schedule exams across rooms and slots to minimise student clashes and back-to-back loads while satisfying room capacity and accessibility needs.

**Training objective.** `\min\;\sum_{s}\text{clashes}_s+\lambda\,\text{consecutive exams}_s+\mu\,\text{room cost}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_{s} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \text{clashes}_s | Number of students with two exams at the same time in slot s. |
| \lambda | Weight on consecutive exams: how strongly it counts against the main objective. |
| \text{consecutive exams}_s | Number of students with back-to-back exams in slot s. |
| \mu | Weight on room cost: how strongly it counts against the main objective. |
| \text{room cost} | The cost of the rooms used. |

**Hard constraints**

- Hard constraints (no clashes, capacity)
- Accessibility rooms
- Invigilator availability
- Run in minutes

## The approach in one paragraph

Start with manual scheduling with spreadsheets. Then earn the move to cP-SAT model with learned room-usage estimates and local search to resolve late changes, and only if it beats the baseline on Clash count and student-load fairness and Solve time after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Student conflict matrix | Pairs of exams sharing students. Clashes. Guard against: enrolment data. |
| Add Room capacity and accessibility | Rooms by features. Feasibility. Guard against: master data. |
| Add Invigilator availability | Staffing constraints. Feasibility. Guard against: roster. |
| Run it as one pipeline | Enrolment and exam data (SIS), Conflict matrix builder (batch), Timetable solver (CP-SAT), Accessibility checker (constraints), Staff roster merger (HR), Registrar approval (human) and Change management (re-solve). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle late enrolment changes create new clashes | Incremental re-solve minimising changes. |

**Deliberately not doing**

- Exam code: none.
- Lecturer: none.

**How the approach is proven**

Prove it offline on Clash count and student-load fairness and Solve time using time-ordered splits, then online on "Complaints from clashes" with "Manual repair hours" as the guardrail. Watch for: Hard constraints missing from test data and Ignoring late changes.

## Baseline and production design

- **Baseline (build this first):** Manual scheduling with spreadsheets.
- **Production design:** CP-SAT model with learned room-usage estimates and local search to resolve late changes.

## Why AI, and why this kind

**Why AI.** Schedule exams across rooms and slots to minimise student clashes and back-to-back loads while satisfying room capacity and accessibility needs. The evidence that separates good from bad outcomes (Student conflict matrix, Room capacity and accessibility, Invigilator availability) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "greedy assignment" are what teams reach for first, and they fail because greedy leaves clashes that need manual repair. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: CP-SAT model with learned room-usage estimates and local search to resolve late changes.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Student conflict matrix, Room capacity and accessibility, Invigilator availability and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual scheduling with spreadsheets | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| CP-SAT model with learned room-usage estimates and local search to resolve late changes | chosen | Meets the run-window envelope at $17.95 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Complaints from clashes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Hard constraints missing from test data.
- Evaluation trap: Ignoring late changes.
- Late enrolment changes create new clashes: timetable invalid.
- Room becomes unavailable: a room closes late and the displaced exam needs urgent rescheduling without new clashes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
