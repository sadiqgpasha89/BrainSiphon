# Nurse Scheduling Optimisation: use-case brief

> Generated from the blueprint `healthcare/nurse-scheduling-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Nurse Scheduling Optimisation · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Generate fair shift schedules that meet predicted patient demand and skill mix while respecting preferences and labour rules. The system has to run as a scheduled batch job, inside these limits: Labour regulations, Skill mix and licensure and Fairness in preferences.

**Why it is hard.** The obvious approach is fixed nurse-to-patient ratios, and it fails because acuity changes workload. The second trap is in "Fairness": the real signal is transparent fairness metrics, while teams usually reach for opaque heuristics.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way nurse turnover measures it.

**What success looks like.** Offline: Understaffing hours and Preference satisfaction distribution. Online: Overtime cost and Nurse turnover. The launch is judged on "Overtime cost" while "Nurse turnover" must not get worse.

## Objective, loss and constraints

**Business objective.** Generate fair shift schedules that meet predicted patient demand and skill mix while respecting preferences and labour rules.

**Training objective.** `\min\;\sum_s \text{understaffing}_s+\lambda\,\text{preference violations}+\mu\,\text{overtime}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_s | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \text{understaffing}_s | The shortfall of nurses below the required level in shift s. |
| \lambda | Weight on preference violations: how strongly it counts against the main objective. |
| \text{preference violations} | Shifts that go against nurses' stated preferences. |
| \mu | Weight on overtime: how strongly it counts against the main objective. |
| \text{overtime} | Hours worked beyond contract. |

**Hard constraints**

- Labour regulations
- Skill mix and licensure
- Fairness in preferences
- Last-minute changes

## The approach in one paragraph

Start with manual scheduling in spreadsheets. Then earn the move to constraint programming with acuity forecasts, fairness objectives and a re-optimisation engine for call-outs, and only if it beats the baseline on Understaffing hours and Preference satisfaction distribution after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Acuity-weighted demand forecast | Workload units per shift. Staffing target. Guard against: forecast quality. |
| Add Preference satisfaction score | Fraction of requests honoured. Retention. Guard against: fair allocation. |
| Add Skill coverage per shift | Required competencies present. Safety. Guard against: credential data. |
| Run it as one pipeline | Census and acuity forecast (ADT feed), Constraint model (CP-SAT), Preference collector (staff app), Schedule optimiser (solver), Publish (HR system) and Call-out re-optimiser (live), with Manager review off the critical path. |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle sudden call-outs | Rolling re-optimisation with float pool. |

**Deliberately not doing**

- Nurse name: none.
- Seniority alone: fairness.

**How the approach is proven**

Prove it offline on Understaffing hours and Preference satisfaction distribution using time-ordered splits, then online on "Overtime cost" with "Nurse turnover" as the guardrail. Watch for: Evaluating only on forecast demand and Ignoring real-world call-outs.

## Baseline and production design

- **Baseline (build this first):** Manual scheduling in spreadsheets.
- **Production design:** Constraint programming with acuity forecasts, fairness objectives and a re-optimisation engine for call-outs.

## Why AI, and why this kind

**Why AI.** Generate fair shift schedules that meet predicted patient demand and skill mix while respecting preferences and labour rules. The evidence that separates good from bad outcomes (Acuity-weighted demand forecast, Preference satisfaction score, Skill coverage per shift) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fixed nurse-to-patient ratios" are what teams reach for first, and they fail because acuity changes workload. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Constraint programming with acuity forecasts, fairness objectives and a re-optimisation engine for call-outs.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Acuity-weighted demand forecast, Preference satisfaction score, Skill coverage per shift and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual scheduling in spreadsheets | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Constraint programming with acuity forecasts, fairness objectives and a re-optimisation engine for call-outs | chosen | Meets the run-window envelope at $0.180 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Overtime cost) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating only on forecast demand.
- Evaluation trap: Ignoring real-world call-outs.
- Sudden call-outs: gaps in coverage.
- Preference gaming: unfair distribution.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
