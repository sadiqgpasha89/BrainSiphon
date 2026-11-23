# Autoscaling Policy Optimisation: use-case brief

> Generated from the blueprint `it-ops/autoscaling-policy-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Autoscaling Policy Optimisation · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Tune autoscaling thresholds and schedules to meet latency targets at lower cost, evaluated in simulation on replayed traffic and rolled out with guardrails. The system has to run interactively, within a few seconds, inside these limits: Latency objectives never traded for cost, Minimum capacity floors enforced and Policy tested in simulation before rollout.

**Why it is hard.** The obvious approach is utilisation alone, and it fails because high utilisation hurts latency. The second trap is in "Safety": the real signal is floors, ceilings and rollback, while teams usually reach for unbounded scaling.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.8K a month. A mistake is expensive in the way compute cost measures it.

**What success looks like.** Offline: Latency attainment in replay, Cost in replay and Scaling oscillation. Online: Latency target attainment, Compute cost and Scaling incidents. The launch is judged on "Latency target attainment" while "Compute cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Tune autoscaling thresholds and schedules to meet latency targets at lower cost, evaluated in simulation on replayed traffic and rolled out with guardrails.

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

- Latency objectives never traded for cost
- Minimum capacity floors enforced
- Policy tested in simulation before rollout
- Decision within 30 s
- 5K services

## The approach in one paragraph

Start with threshold rules on CPU utilisation, because they are the default autoscaler. Then earn the move to a policy tuner that proposes thresholds and schedules from replayed traffic, with floors and ceilings, staged rollout and automatic rollback on latency regression, and only if it beats the baseline on Latency attainment in replay and Cost in replay after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Request rate and trend | Load and slope. State. Guard against: from load balancers. |
| Add Latency percentile | P95 and p99. Constraint. Guard against: from metrics. |
| Add Startup time of instances | Warm-up duration. Lag. Guard against: from the platform. |
| Run it as one pipeline | Traffic replay (historical metrics), Simulator (load model), Policy search (optimiser), Guardrail check (rules), Staged rollout (platform) and Latency watch (observability), with Review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle flash traffic | Burst buffers and pre-scaling. |

**Deliberately not doing**

- Instance id: an identifier.
- Team name: weak link.
- Cluster name: an identifier.

**How the approach is proven**

Prove it offline on Latency attainment in replay, Cost in replay and Scaling oscillation using time-ordered splits, then online on "Latency target attainment" with "Compute cost" as the guardrail. Watch for: CPU as the only signal, Live-only tuning and No capacity floors.

## Baseline and production design

- **Baseline (build this first):** Threshold rules on CPU utilisation, because they are the default autoscaler.
- **Production design:** A policy tuner that proposes thresholds and schedules from replayed traffic, with floors and ceilings, staged rollout and automatic rollback on latency regression.

## Why AI, and why this kind

**Why AI.** Tune autoscaling thresholds and schedules to meet latency targets at lower cost, evaluated in simulation on replayed traffic and rolled out with guardrails. The evidence that separates good from bad outcomes (Request rate and trend, Latency percentile, Startup time of instances) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "utilisation alone" are what teams reach for first, and they fail because high utilisation hurts latency. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A policy tuner that proposes thresholds and schedules from replayed traffic, with floors and ceilings, staged rollout and automatic rollback on latency regression.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Request rate and trend, Latency percentile, Startup time of instances and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Threshold rules on CPU utilisation, because they are the default autoscaler | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A policy tuner that proposes thresholds and schedules from replayed traffic, with floors and ceilings, staged rollout and automatic rollback on latency regression | chosen | Meets the 2500 ms envelope at $0.042 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Latency target attainment) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: CPU as the only signal.
- Evaluation trap: Live-only tuning.
- Flash traffic: load jumps faster than scaling.
- Slow start: instances take minutes to warm.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
