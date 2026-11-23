# CI Queue and Resource Optimisation: use-case brief

> Generated from the blueprint `devtools/ci-queue-resource-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** CI Queue and Resource Optimisation · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Allocate runners and order jobs so developer wait time falls and compute cost stays within budget, protecting release builds from starvation. The system has to run interactively, within a few seconds, inside these limits: Release and hotfix jobs always have priority, Budget caps on compute and Scheduling decision within 1 s.

**Why it is hard.** The obvious approach is runner utilisation, and it fails because high utilisation creates long queues. The second trap is in "Fairness": the real signal is equal access across teams, while teams usually reach for first-come first-served.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.8K a month. A mistake is expensive in the way compute cost measures it.

**What success looks like.** Offline: Wait time in replay, Cost in replay and Starvation incidents. Online: Median wait time, Compute cost and Release build delays. The launch is judged on "Median wait time" while "Compute cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Allocate runners and order jobs so developer wait time falls and compute cost stays within budget, protecting release builds from starvation.

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

- Release and hotfix jobs always have priority
- Budget caps on compute
- Scheduling decision within 1 s
- Fairness across teams
- 500K jobs per day

## The approach in one paragraph

Start with a first-in first-out queue with static runner pools, because it is the default. Then earn the move to a scheduler with duration predictions, priority lanes and autoscaling that is tested in simulation on replayed queues before use, and only if it beats the baseline on Wait time in replay and Cost in replay after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Queue depth and wait time | Pending jobs and waiting time. State. Guard against: from the scheduler. |
| Add Job duration forecast | Predicted runtime. Packing. Guard against: from history. |
| Add Runner pool capacity | Available runners by type. Constraint. Guard against: from infrastructure. |
| Run it as one pipeline | Job intake (CI scheduler), Duration prediction (gradient boosting), Priority and fairness rules (policy), Packing and scaling (optimiser), Runner allocation (runner manager), Metrics (observability) and Simulation test (replay). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle surge after a release | Burst capacity and priority lanes. |

**Deliberately not doing**

- Developer name: personal data.
- Job name wording: weak link.
- Branch name: an artefact.

**How the approach is proven**

Prove it offline on Wait time in replay, Cost in replay and Starvation incidents using time-ordered splits, then online on "Median wait time" with "Compute cost" as the guardrail. Watch for: Utilisation as the goal, One queue for everything and No simulation before use.

## Baseline and production design

- **Baseline (build this first):** A first-in first-out queue with static runner pools, because it is the default.
- **Production design:** A scheduler with duration predictions, priority lanes and autoscaling that is tested in simulation on replayed queues before use.

## Why AI, and why this kind

**Why AI.** Allocate runners and order jobs so developer wait time falls and compute cost stays within budget, protecting release builds from starvation. The evidence that separates good from bad outcomes (Queue depth and wait time, Job duration forecast, Runner pool capacity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "runner utilisation" are what teams reach for first, and they fail because high utilisation creates long queues. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A scheduler with duration predictions, priority lanes and autoscaling that is tested in simulation on replayed queues before use.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Queue depth and wait time, Job duration forecast, Runner pool capacity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A first-in first-out queue with static runner pools, because it is the default | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A scheduler with duration predictions, priority lanes and autoscaling that is tested in simulation on replayed queues before use | chosen | Meets the 2500 ms envelope at $0.042 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Median wait time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Utilisation as the goal.
- Evaluation trap: One queue for everything.
- Surge after a release: many jobs arrive.
- Runner outage: capacity is lost.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
