# Healthcare Compliance Remediation Prioritization: use-case brief

> Generated from the blueprint `healthcare/healthcare-compliance-remediation-prioritization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Compliance Remediation Prioritization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Prioritise remediation across findings by severity, likelihood, deadline, patient and operational exposure, recurrence and effort, and give the risk owner a ranked backlog, a sequence and resource scenarios. The system has to run as a scheduled batch job, inside these limits: The risk owner approves prioritisation and any accepted residual risk, Deterministic priority rules for severe patient-safety and legal-deadline findings sit above the optimiser and Dependencies and capacity are hard constraints.

**Why it is hard.** The obvious approach is optimiser decides everything, and it fails because some findings cannot be traded off. The second trap is in "Objective": the real signal is risk reduction per effort across several objectives, while teams usually reach for severity rank only.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way risk reduced per unit of effort measures it.

**What success looks like.** Offline: Risk reduction against the best plan in hindsight, Rule-layer violations and Overdue forecast error. Online: Overdue findings, Risk reduced per unit of effort and Share of recurring findings. The launch is judged on "Overdue findings" while "Risk reduced per unit of effort" must not get worse.

## Objective, loss and constraints

**Business objective.** Prioritise remediation across findings by severity, likelihood, deadline, patient and operational exposure, recurrence and effort, and give the risk owner a ranked backlog, a sequence and resource scenarios.

**Training objective.** `\max\;\sum_f x_f\,\text{risk reduction}_f\quad\text{s.t. capacity, dependency and deadline constraints}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \sum_f | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| x_f | Whether finding f is scheduled for remediation in the period: 1 if scheduled and 0 if not. |
| \text{risk reduction}_f | The estimated reduction in patient, regulatory and operational risk from remediating finding f. |

**Hard constraints**

- The risk owner approves prioritisation and any accepted residual risk
- Deterministic priority rules for severe patient-safety and legal-deadline findings sit above the optimiser
- Dependencies and capacity are hard constraints
- Plans show each constraint that binds
- Prioritises 15K open findings monthly
- Scenarios state their assumptions

## The approach in one paragraph

Start with findings are worked in the order they were logged. Then earn the move to a deterministic priority rule layer for severe and deadline-bound findings, then a multi-objective optimiser over risk reduction, effort and capacity with dependency constraints and a scenario engine for overdue forecasts, and only if it beats the baseline on Risk reduction against the best plan in hindsight and Rule-layer violations after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Severity and likelihood | Rated severity and the estimated chance of recurrence or harm. Core risk measure. Guard against: rating version. |
| Add Deadline slack | Days to the commitment less estimated effort time. Urgency. Guard against: plan data. |
| Add Recurrence history | Whether similar findings have repeated. Systemic risk. Guard against: findings history. |
| Run it as one pipeline | Findings and capacity intake (GRC and project extracts), Priority rules (deterministic policy), Constraint builder (dependency and capacity model), Multi-objective optimizer (MILP solver), Scenario and overdue forecaster (simulation), Risk owner approval (human) and Plan and outcome log (lakehouse). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new severe finding mid-cycle | Re-plan with the rule layer first. |

**Deliberately not doing**

- Finding title: wording.
- Reporter identity: not risk.
- Ticket age alone: not risk.

**How the approach is proven**

Prove it offline on Risk reduction against the best plan in hindsight, Rule-layer violations and Overdue forecast error using time-ordered splits, then online on "Overdue findings" with "Risk reduced per unit of effort" as the guardrail. Watch for: Letting the optimiser override severe-finding rules, Ignoring dependencies and Treating deferral as free.

## Baseline and production design

- **Baseline (build this first):** Findings are worked in the order they were logged.
- **Production design:** A deterministic priority rule layer for severe and deadline-bound findings, then a multi-objective optimiser over risk reduction, effort and capacity with dependency constraints and a scenario engine for overdue forecasts.

## Why AI, and why this kind

**Why AI.** Prioritise remediation across findings by severity, likelihood, deadline, patient and operational exposure, recurrence and effort, and give the risk owner a ranked backlog, a sequence and resource scenarios. The evidence that separates good from bad outcomes (Severity and likelihood, Deadline slack, Recurrence history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "optimiser decides everything" are what teams reach for first, and they fail because some findings cannot be traded off. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: A deterministic priority rule layer for severe and deadline-bound findings, then a multi-objective optimiser over risk reduction, effort and capacity with dependency constraints and a scenario engine for overdue forecasts.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Severity and likelihood, Deadline slack, Recurrence history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Findings are worked in the order they were logged | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A deterministic priority rule layer for severe and deadline-bound findings, then a multi-objective optimiser over risk reduction, effort and capacity with dependency constraints and a scenario engine for overdue forecasts | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Overdue findings) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Letting the optimiser override severe-finding rules.
- Evaluation trap: Ignoring dependencies.
- New severe finding mid-cycle: the plan is stale.
- Shared remediation fixes several findings: benefit is counted once.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
