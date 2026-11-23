# Restoration Switching Recommendation: use-case brief

> Generated from the blueprint `energy/restoration-switching-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Restoration Switching Recommendation · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Propose switching sequences that restore as many customers as quickly as possible after a fault within loading and protection limits, for the operator to review and execute. The system has to run interactively, within a few seconds, inside these limits: Every proposed sequence passes a power flow and protection check, The operator reviews and executes and Proposal within 20 s.

**Why it is hard.** The obvious approach is number of switches, and it fails because fewer switches do not restore more customers. The second trap is in "Safety": the real signal is isolation and protection checks as hard constraints, while teams usually reach for learned preferences.

**Scale and stakes.** At 10 million users this is about 15.0M model-touching events a day, 174 requests per second on average and 1.0K at peak, at an estimated $4.3K a month. A mistake is expensive in the way switching steps measures it.

**What success looks like.** Offline: Customers restored in simulated faults, Constraint violation rate and Plan time. Online: Customer minutes interrupted, Switching steps and Plans accepted by operators. The launch is judged on "Customer minutes interrupted" while "Switching steps" must not get worse.

## Objective, loss and constraints

**Business objective.** Propose switching sequences that restore as many customers as quickly as possible after a fault within loading and protection limits, for the operator to review and execute.

**Training objective.** `\mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Every proposed sequence passes a power flow and protection check
- The operator reviews and executes
- Proposal within 20 s
- Safety isolation steps included
- 3K feeders

## The approach in one paragraph

Start with the standard restoration plan for each feeder prepared by planners, because it is the validated fallback. Then earn the move to a search and learned-heuristic planner on the network graph that checks each plan with power flow and protection rules and presents ranked sequences with the customers restored and timings, and only if it beats the baseline on Customers restored in simulated faults and Constraint violation rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Faulted section and isolation points | Location of the fault and the nearest switches. Defines the plan. Guard against: from fault location. |
| Add Alternate supply capacity | Spare capacity on neighbouring feeders. Feasibility. Guard against: from the power flow. |
| Add Customer priority | Critical customers on each section. Ordering. Guard against: from the register. |
| Run it as one pipeline | Fault and state intake (ADMS), Graph search (planner), Plan scoring (learned heuristic), Power flow and protection check (solver), Ranked plans (operator display), Operator execution (switching order) and Result logging (audit store). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle stale switch state | State freshness checks and a block on old data. |

**Deliberately not doing**

- Operator name: irrelevant.
- Event number: an identifier.
- Substation name alone: an identifier.

**How the approach is proven**

Prove it offline on Customers restored in simulated faults, Constraint violation rate and Plan time using time-ordered splits, then online on "Customer minutes interrupted" with "Switching steps" as the guardrail. Watch for: Learned safety checks, Automatic execution and Stale network state.

## Baseline and production design

- **Baseline (build this first):** The standard restoration plan for each feeder prepared by planners, because it is the validated fallback.
- **Production design:** A search and learned-heuristic planner on the network graph that checks each plan with power flow and protection rules and presents ranked sequences with the customers restored and timings.

## Why AI, and why this kind

**Why AI.** Propose switching sequences that restore as many customers as quickly as possible after a fault within loading and protection limits, for the operator to review and execute. The evidence that separates good from bad outcomes (Faulted section and isolation points, Alternate supply capacity, Customer priority) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "number of switches" are what teams reach for first, and they fail because fewer switches do not restore more customers. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: A search and learned-heuristic planner on the network graph that checks each plan with power flow and protection rules and presents ranked sequences with the customers restored and timings.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Faulted section and isolation points, Alternate supply capacity, Customer priority and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: The standard restoration plan for each feeder prepared by planners, because it is the validated fallback | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A search and learned-heuristic planner on the network graph that checks each plan with power flow and protection rules and presents ranked sequences with the customers restored and timings | chosen | Meets the 2500 ms envelope at $0.0096 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Customer minutes interrupted) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Learned safety checks.
- Evaluation trap: Automatic execution.
- Stale switch state: the network model is not current.
- Cascading overload: a plan overloads a neighbour.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
