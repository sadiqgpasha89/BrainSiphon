# Healthcare Workforce Skill-Mix Optimization: use-case brief

> Generated from the blueprint `healthcare/healthcare-workforce-skill-mix-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Workforce Skill-Mix Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Build shift rosters with the right competency, specialty, experience and supervision mix for forecast workload, with an auditable proof of each hard constraint. The system has to run as a scheduled batch job, inside these limits: Hard constraints cover licensure, competency, supervision ratios, rest and policy mix rules, Soft objectives cover experience balance, development and preference and The output includes a proof of coverage and every violated soft constraint.

**Why it is hard.** The obvious approach is job title as a proxy for skill, and it fails because titles hide missing competencies. The second trap is in "Proof": the real signal is constraint proof per shift, while teams usually reach for an overall score.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.6K a month. A mistake is expensive in the way roster publication lead time measures it.

**What success looks like.** Offline: Skill-gap hours vs the best plan in hindsight, Constraint violations per roster and Solver gap and time to feasible. Online: Shifts meeting required mix at start, Roster publication lead time and Manager override rate. The launch is judged on "Shifts meeting required mix at start" while "Roster publication lead time" must not get worse.

## Objective, loss and constraints

**Business objective.** Build shift rosters with the right competency, specialty, experience and supervision mix for forecast workload, with an auditable proof of each hard constraint.

**Training objective.** `\min\;\sum_s \text{skill gap}_s+\lambda\,\text{experience imbalance}+\mu\,\text{preference loss}+\nu\,\text{supervision breach}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_s | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \text{skill gap}_s | Required competency hours not covered on shift s. |
| \lambda | Weight on experience imbalance: how strongly it counts against closing skill gaps. |
| \text{experience imbalance} | How far the mix of experience bands on a shift is from the target mix. |
| \mu | Weight on preference loss: how strongly unmet preferences count against the main objective. |
| \text{preference loss} | Staff preferences not honoured on shift s. |
| \nu | Weight on supervision breaches: set high so that a breach is almost never traded for another objective. |
| \text{supervision breach} | Cases where a person who needs supervision is rostered without an available supervisor. |

**Hard constraints**

- Hard constraints cover licensure, competency, supervision ratios, rest and policy mix rules
- Soft objectives cover experience balance, development and preference
- The output includes a proof of coverage and every violated soft constraint
- Credentialing and unit leaders validate eligibility and the final roster
- Infeasibility returns the binding constraints not a silent relaxation
- Pseudonymous IDs

## The approach in one paragraph

Start with spreadsheet roster with a manual skill-mix check by the unit leader. Then earn the move to constraint programming and mixed-integer optimisation with hard competency, supervision and rest constraints, weighted soft objectives and a constraint-proof generator that also reports infeasibility reasons, and only if it beats the baseline on Skill-gap hours vs the best plan in hindsight and Constraint violations per roster after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Skill coverage per shift | Required competency count present vs required. Core safety measure. Guard against: competencies valid on the shift date. |
| Add Experience balance | Share of staff within each experience band per shift. Balances risk and learning. Guard against: banding from HR records as of the date. |
| Add Supervision capacity | Preceptor slots available per shift. Limits how many novices can be rostered. Guard against: use rules as published. |
| Run it as one pipeline | Competency and requirement intake (credential and scheduling extracts), Eligibility validator (rules), Skill-mix optimizer (OR-Tools CP-SAT) and Publish (scheduling system), with Coverage proof and violation report, Unit leader and credentialing review and Audit and outcome log off the critical path. |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle competency record missing | Exception queue to credentialing rather than silent exclusion. |

**Deliberately not doing**

- Years of service alone: does not equal competence in the unit.
- Informal reputation: unfair and unverifiable.
- Preference ranking by managers: not a safe objective.

**How the approach is proven**

Prove it offline on Skill-gap hours vs the best plan in hindsight, Constraint violations per roster and Solver gap and time to feasible using time-ordered splits, then online on "Shifts meeting required mix at start" with "Roster publication lead time" as the guardrail. Watch for: Scoring against forecast acuity only, Relaxing hard constraints silently and Treating title as competency.

## Baseline and production design

- **Baseline (build this first):** Spreadsheet roster with a manual skill-mix check by the unit leader.
- **Production design:** Constraint programming and mixed-integer optimisation with hard competency, supervision and rest constraints, weighted soft objectives and a constraint-proof generator that also reports infeasibility reasons.

## Why AI, and why this kind

**Why AI.** Build shift rosters with the right competency, specialty, experience and supervision mix for forecast workload, with an auditable proof of each hard constraint. The evidence that separates good from bad outcomes (Skill coverage per shift, Experience balance, Supervision capacity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "job title as a proxy for skill" are what teams reach for first, and they fail because titles hide missing competencies. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Constraint programming and mixed-integer optimisation with hard competency, supervision and rest constraints, weighted soft objectives and a constraint-proof generator that also reports infeasibility reasons.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Skill coverage per shift, Experience balance, Supervision capacity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Spreadsheet roster with a manual skill-mix check by the unit leader | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Constraint programming and mixed-integer optimisation with hard competency, supervision and rest constraints, weighted soft objectives and a constraint-proof generator that also reports infeasibility reasons | chosen | Meets the run-window envelope at $0.061 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Shifts meeting required mix at start) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Scoring against forecast acuity only.
- Evaluation trap: Relaxing hard constraints silently.
- Competency record missing: a qualified person looks ineligible.
- Preceptor unavailable: novice cannot be rostered.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
