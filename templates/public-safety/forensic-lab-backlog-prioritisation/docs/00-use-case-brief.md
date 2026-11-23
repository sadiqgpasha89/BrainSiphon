# Forensic Lab Backlog Prioritisation: use-case brief

> Generated from the blueprint `public-safety/forensic-lab-backlog-prioritisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Forensic Lab Backlog Prioritisation · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Plan the order of forensic analysis requests by statutory deadlines, case seriousness and lab capacity to cut turnaround for urgent cases, with analysts and prosecutors able to override. The system has to run as a scheduled batch job, inside these limits: Statutory and court deadlines as rules, No ranking by suspect characteristics and Analysts and prosecutors can reprioritise.

**Why it is hard.** The obvious approach is fastest throughput, and it fails because throughput can leave urgent cases waiting. The second trap is in "Rules": the real signal is legal deadlines are fixed, while teams usually reach for model predictions of urgency.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.7K a month. A mistake is expensive in the way turnaround time measures it.

**What success looks like.** Offline: Deadline attainment, Effort estimate error and Turnaround by case class. Online: Cases past deadline, Turnaround time and Backlog size. The launch is judged on "Cases past deadline" while "Turnaround time" must not get worse.

## Objective, loss and constraints

**Business objective.** Plan the order of forensic analysis requests by statutory deadlines, case seriousness and lab capacity to cut turnaround for urgent cases, with analysts and prosecutors able to override.

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

- Statutory and court deadlines as rules
- No ranking by suspect characteristics
- Analysts and prosecutors can reprioritise
- Capacity by discipline
- 60K requests per year

## The approach in one paragraph

Start with first-come first-served queues with manual escalation, because it is the typical process. Then earn the move to a scheduler with deadline and seriousness rules, effort estimates and capacity limits that proposes a queue for the lab manager and tracks equal treatment, and only if it beats the baseline on Deadline attainment and Effort estimate error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Days to court or statutory deadline | Time remaining. Priority. Guard against: from case systems. |
| Add Case seriousness class | Offence class. Priority. Guard against: from case systems. |
| Add Analysis effort estimate | Estimated hours by test. Planning. Guard against: from history. |
| Run it as one pipeline | Request intake (lab system), Effort model (gradient boosting), Rule and deadline engine (rules) and Scheduler (constraint solver), with Lab manager review, Queue update and Turnaround review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle late urgent request | Priority insertion with reasons. |

**Deliberately not doing**

- Suspect name: personal data.
- Neighbourhood: a proxy.
- Submitting officer: irrelevant.

**How the approach is proven**

Prove it offline on Deadline attainment, Effort estimate error and Turnaround by case class using time-ordered splits, then online on "Cases past deadline" with "Turnaround time" as the guardrail. Watch for: Fastest-throughput objectives, Ranking by neighbourhood and Model-set legal deadlines.

## Baseline and production design

- **Baseline (build this first):** First-come first-served queues with manual escalation, because it is the typical process.
- **Production design:** A scheduler with deadline and seriousness rules, effort estimates and capacity limits that proposes a queue for the lab manager and tracks equal treatment.

## Why AI, and why this kind

**Why AI.** Plan the order of forensic analysis requests by statutory deadlines, case seriousness and lab capacity to cut turnaround for urgent cases, with analysts and prosecutors able to override. The evidence that separates good from bad outcomes (Days to court or statutory deadline, Case seriousness class, Analysis effort estimate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fastest throughput" are what teams reach for first, and they fail because throughput can leave urgent cases waiting. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A scheduler with deadline and seriousness rules, effort estimates and capacity limits that proposes a queue for the lab manager and tracks equal treatment.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Days to court or statutory deadline, Case seriousness class, Analysis effort estimate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: First-come first-served queues with manual escalation, because it is the typical process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A scheduler with deadline and seriousness rules, effort estimates and capacity limits that proposes a queue for the lab manager and tracks equal treatment | chosen | Meets the run-window envelope at $0.062 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cases past deadline) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Fastest-throughput objectives.
- Evaluation trap: Ranking by neighbourhood.
- Late urgent request: a case jumps the queue.
- Equipment outage: lab capacity drops after a breakdown.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
