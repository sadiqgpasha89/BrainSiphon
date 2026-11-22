# Quality Improvement Initiative Prioritization: use-case brief

> Generated from the blueprint `healthcare/quality-improvement-initiative-prioritization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Quality Improvement Initiative Prioritization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rank proposed improvement projects by patient impact, compliance urgency, feasibility, cost, equity and expected benefit, giving leaders a transparent portfolio with trade-offs and assumptions to decide from. The system has to run as a scheduled batch job, inside these limits: Leadership sets criteria weights and makes the final portfolio decision, Hard constraints cover budget, staffing capacity and mandatory compliance projects and The scoring method is transparent with sensitivity to weights.

**Why it is hard.** The obvious approach is single opaque score, and it fails because leaders must be able to challenge a ranking. The second trap is in "Evidence": the real signal is evidence strength as a criterion and an uncertainty, while teams usually reach for point benefit estimate.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way portfolio utilisation of capacity measures it.

**What success looks like.** Offline: Rank stability under weight perturbation, Portfolio value vs the best feasible portfolio and Estimate calibration against realised benefit. Online: Realised benefit of selected projects, Portfolio utilisation of capacity and Share of mandatory deadlines met. The launch is judged on "Realised benefit of selected projects" while "Portfolio utilisation of capacity" must not get worse.

## Objective, loss and constraints

**Business objective.** Rank proposed improvement projects by patient impact, compliance urgency, feasibility, cost, equity and expected benefit, giving leaders a transparent portfolio with trade-offs and assumptions to decide from.

**Training objective.** `\max\;\sum_k x_k\big(\sum_m w_m\,\text{score}_{km}\big)\quad\text{s.t.}\quad\sum_k c_k x_k\le B`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \sum_k | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| x_k | Whether project k is selected: 1 if it is in the portfolio and 0 if it is not. |
| w_m | A weight that scales how much a particular example, class or term counts in the loss. (one value per item m) |
| \text{score}_{km} | The score of project k on criterion m after normalisation and evidence discount; w_m is the weight on criterion m. |
| c_k | The cost or resource requirement of project k. |
| B | The budget or capacity limit for the period: selected projects must cost no more than this. |

**Hard constraints**

- Leadership sets criteria weights and makes the final portfolio decision
- Hard constraints cover budget, staffing capacity and mandatory compliance projects
- The scoring method is transparent with sensitivity to weights
- Assumptions and evidence strength are shown beside every score
- Equity impact is an explicit criterion
- Infeasibility reports which constraint binds

## The approach in one paragraph

Start with ranking by sponsor request and a cost threshold. Then earn the move to multi-criteria scoring with versioned weights, a constrained portfolio optimiser for resource allocation under budget and capacity limits, a rank-stability sensitivity analysis and a decision record generator, and only if it beats the baseline on Rank stability under weight perturbation and Portfolio value vs the best feasible portfolio after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Expected patient impact | Estimated harm avoided or outcomes gained with evidence grade. The core value. Guard against: estimates from the stated source. |
| Add Compliance urgency | Days to a mandatory deadline and penalty exposure. Hard drivers. Guard against: calendar. |
| Add Feasibility | Resource requirement against available capacity. Unrealistic projects waste effort. Guard against: current capacity. |
| Run it as one pipeline | Proposal and gap intake (portfolio workbook), Criteria scoring (MCDA with versioned weights), Portfolio optimizer for resource allocation (integer program), Sensitivity and equity analysis (scenario engine) and Decision record and benefit tracking (portfolio system), with Leadership review off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle weights disputed | Scenario views per weight set and a recorded decision. |

**Deliberately not doing**

- Sponsor seniority: pressure not merit.
- Project name or branding: not value.
- Past project success rate of the team: confounded.

**How the approach is proven**

Prove it offline on Rank stability under weight perturbation, Portfolio value vs the best feasible portfolio and Estimate calibration against realised benefit using time-ordered splits, then online on "Realised benefit of selected projects" with "Portfolio utilisation of capacity" as the guardrail. Watch for: Treating estimated benefits as certain, Ignoring budget as a constraint and Letting weights be chosen to produce a preferred answer.

## Baseline and production design

- **Baseline (build this first):** Ranking by sponsor request and a cost threshold.
- **Production design:** Multi-criteria scoring with versioned weights, a constrained portfolio optimiser for resource allocation under budget and capacity limits, a rank-stability sensitivity analysis and a decision record generator.

## Why AI, and why this kind

**Why AI.** Rank proposed improvement projects by patient impact, compliance urgency, feasibility, cost, equity and expected benefit, giving leaders a transparent portfolio with trade-offs and assumptions to decide from. The evidence that separates good from bad outcomes (Expected patient impact, Compliance urgency, Feasibility) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single opaque score" are what teams reach for first, and they fail because leaders must be able to challenge a ranking. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Multi-criteria scoring with versioned weights, a constrained portfolio optimiser for resource allocation under budget and capacity limits, a rank-stability sensitivity analysis and a decision record generator.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Expected patient impact, Compliance urgency, Feasibility and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Ranking by sponsor request and a cost threshold | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multi-criteria scoring with versioned weights, a constrained portfolio optimiser for resource allocation under budget and capacity limits, a rank-stability sensitivity analysis and a decision record generator | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Realised benefit of selected projects) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating estimated benefits as certain.
- Evaluation trap: Ignoring budget as a constraint.
- Weights disputed: different leaders prefer different weights.
- Cost estimates change: the portfolio is no longer feasible.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
