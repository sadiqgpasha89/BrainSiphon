# Court Hearing Scheduling Optimisation: use-case brief

> Generated from the blueprint `public-safety/court-scheduling-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Court Hearing Scheduling Optimisation · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Schedule hearings and courtrooms to cut waiting time and adjournments while respecting statutory timelines, judge availability and accessibility needs. The system has to run as a scheduled batch job, inside these limits: Statutory timelines are hard constraints, Judges and registrars can override and Accessibility and interpreter needs honoured.

**Why it is hard.** The obvious approach is fully booked rooms, and it fails because overbooking causes wasted attendance. The second trap is in "Rules": the real signal is legal timelines and rights, while teams usually reach for learned priorities.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way adjournments measures it.

**What success looks like.** Offline: Feasibility of schedules, Duration error and Adjournment rate. Online: Time to hearing, Adjournments and Courtroom utilisation. The launch is judged on "Time to hearing" while "Adjournments" must not get worse.

## Objective, loss and constraints

**Business objective.** Schedule hearings and courtrooms to cut waiting time and adjournments while respecting statutory timelines, judge availability and accessibility needs.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Statutory timelines are hard constraints
- Judges and registrars can override
- Accessibility and interpreter needs honoured
- Weekly schedule for 500 courtrooms

## The approach in one paragraph

Start with registry staff scheduling by availability and rules of thumb, because it is the current approach. Then earn the move to a scheduling optimiser with duration and adjournment models, hard legal constraints, accessibility needs and a registrar review step, and only if it beats the baseline on Feasibility of schedules and Duration error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Case type and expected duration | Hearing length by type. Planning. Guard against: from history. |
| Add Participant needs | Interpreters and accessibility. Constraint. Guard against: from the case file. |
| Add Statutory deadline | Days to the legal limit. Priority. Guard against: from rules. |
| Run it as one pipeline | Duration and risk model (gradient boosting), Constraint model (legal rules), Schedule optimiser (solver) and Notification (parties), with Case and calendar data, Registrar review and Outcome review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle urgent application | Insertion with a re-plan. |

**Deliberately not doing**

- Party name: personal data.
- Lawyer name: irrelevant.
- Case number: an identifier.

**How the approach is proven**

Prove it offline on Feasibility of schedules, Duration error and Adjournment rate using time-ordered splits, then online on "Time to hearing" with "Adjournments" as the guardrail. Watch for: Overbooking for utilisation, Learned legal timelines and Unequal priority.

## Baseline and production design

- **Baseline (build this first):** Registry staff scheduling by availability and rules of thumb, because it is the current approach.
- **Production design:** A scheduling optimiser with duration and adjournment models, hard legal constraints, accessibility needs and a registrar review step.

## Why AI, and why this kind

**Why AI.** Schedule hearings and courtrooms to cut waiting time and adjournments while respecting statutory timelines, judge availability and accessibility needs. The evidence that separates good from bad outcomes (Case type and expected duration, Participant needs, Statutory deadline) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fully booked rooms" are what teams reach for first, and they fail because overbooking causes wasted attendance. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A scheduling optimiser with duration and adjournment models, hard legal constraints, accessibility needs and a registrar review step.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Case type and expected duration, Participant needs, Statutory deadline and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Registry staff scheduling by availability and rules of thumb, because it is the current approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A scheduling optimiser with duration and adjournment models, hard legal constraints, accessibility needs and a registrar review step | chosen | Meets the run-window envelope at $0.038 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to hearing) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Overbooking for utilisation.
- Evaluation trap: Learned legal timelines.
- Urgent application: a priority hearing arrives.
- Judge absence: a calendar slot disappears.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
