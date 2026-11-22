# Provider Network Expansion Optimization: use-case brief

> Generated from the blueprint `healthcare/provider-network-expansion-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Network Expansion Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend where and which provider capacity to add to improve access, adequacy, cost and service coverage, and give strategy and contracting teams ranked expansion scenarios with the expected access improvement, cost and trade-offs. The system has to run as a scheduled batch job, inside these limits: Network strategy and contracting teams decide and the tool makes no contracting offer, Access targets and network rules are constraints and Candidates must pass credentialing and contracting eligibility before they appear.

**Why it is hard.** The obvious approach is cost minimisation alone, and it fails because expansion exists to improve access. The second trap is in "Targets": the real signal is access targets as hard constraints, while teams usually reach for soft preferences.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way cost per member reached measures it.

**What success looks like.** Offline: Access gain realised against predicted gain, Constraint violations in proposals (must be zero) and Solver gap and time to feasible. Online: Members brought within the access standard, Cost per member reached and Scenario adoption by strategy teams. The launch is judged on "Members brought within the access standard" while "Cost per member reached" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend where and which provider capacity to add to improve access, adequacy, cost and service coverage, and give strategy and contracting teams ranked expansion scenarios with the expected access improvement, cost and trade-offs.

**Training objective.** `\max\;\sum_j x_j\,\text{access gain}_j-\lambda\sum_j x_j\,\text{cost}_j\quad\text{s.t. budget and access-target constraints}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \sum_j | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| x_j | Whether candidate j is added to the network: 1 if added and 0 if not. |
| \text{access gain}_j | The additional members brought within the access standard if candidate j joins. |
| \lambda | The weight that trades cost against access gain. |
| \text{cost}_j | The expected contracting and onboarding cost of candidate j. |

**Hard constraints**

- Network strategy and contracting teams decide and the tool makes no contracting offer
- Access targets and network rules are constraints
- Candidates must pass credentialing and contracting eligibility before they appear
- Cost and access estimates are ranges with assumptions
- Plans 3K geographic units and 5K candidates per cycle
- Scenario results state which constraint binds

## The approach in one paragraph

Start with planners pick expansion targets from gap maps and relationships. Then earn the move to a capacity-allocation and facility-location optimiser over access gain, contracting cost and capacity with hard access-target and budget constraints, a scenario engine and an eligibility filter for candidates, and only if it beats the baseline on Access gain realised against predicted gain and Constraint violations in proposals (must be zero) after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Access gain per candidate | Additional members reached within the standard if the candidate joins. The benefit. Guard against: gap model snapshot. |
| Add Contracting cost estimate | Expected cost of adding the candidate. The cost. Guard against: contract tables. |
| Add Candidate capacity | Accepting status and appointment capacity. Real contribution. Guard against: candidate data. |
| Run it as one pipeline | Gap and candidate intake (warehouse extracts), Eligibility filter (credentialing and contracting rules), Access gain calculator (travel-time model), Expansion optimizer (MILP location model) and Scenario comparer (simulation), with Strategy and contracting review and Decision and audit log off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle candidate declines | Re-solve with excluded candidates. |

**Deliberately not doing**

- Candidate marketing: not capacity.
- Practice name: label.
- Candidate rank in the directory: artefact.

**How the approach is proven**

Prove it offline on Access gain realised against predicted gain, Constraint violations in proposals (must be zero) and Solver gap and time to feasible using time-ordered splits, then online on "Members brought within the access standard" with "Cost per member reached" as the guardrail. Watch for: Ignoring candidate capacity, Counting overlapping gains twice and Making contracting offers automatically.

## Baseline and production design

- **Baseline (build this first):** Planners pick expansion targets from gap maps and relationships.
- **Production design:** A capacity-allocation and facility-location optimiser over access gain, contracting cost and capacity with hard access-target and budget constraints, a scenario engine and an eligibility filter for candidates.

## Why AI, and why this kind

**Why AI.** Recommend where and which provider capacity to add to improve access, adequacy, cost and service coverage, and give strategy and contracting teams ranked expansion scenarios with the expected access improvement, cost and trade-offs. The evidence that separates good from bad outcomes (Access gain per candidate, Contracting cost estimate, Candidate capacity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "cost minimisation alone" are what teams reach for first, and they fail because expansion exists to improve access. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A capacity-allocation and facility-location optimiser over access gain, contracting cost and capacity with hard access-target and budget constraints, a scenario engine and an eligibility filter for candidates.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Access gain per candidate, Contracting cost estimate, Candidate capacity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Planners pick expansion targets from gap maps and relationships | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A capacity-allocation and facility-location optimiser over access gain, contracting cost and capacity with hard access-target and budget constraints, a scenario engine and an eligibility filter for candidates | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Members brought within the access standard) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Ignoring candidate capacity.
- Evaluation trap: Counting overlapping gains twice.
- Candidate declines: the plan changes.
- Budget cut: the plan is infeasible.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
