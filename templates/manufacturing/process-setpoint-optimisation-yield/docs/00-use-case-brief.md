# Process Setpoint Optimisation for Yield: use-case brief

> Generated from the blueprint `manufacturing/process-setpoint-optimisation-yield` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Process Setpoint Optimisation for Yield · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend setpoint adjustments on a continuous or batch process to raise yield and cut energy while staying within safe operating limits. The system has to run interactively, within a few seconds, inside these limits: Recommendations bounded by validated safe limits, Operator or engineer approves each change and A model output cannot write directly to the controller.

**Why it is hard.** The obvious approach is a model that learns the limits, and it fails because a learned limit can be wrong in a rare state. The second trap is in "Causality": the real signal is effects estimated from controlled variation and physics, while teams usually reach for correlations in historical data.

**Scale and stakes.** At 10 million users this is about 18.0M model-touching events a day, 208 requests per second on average and 1.3K at peak, at an estimated $7.0K a month. A mistake is expensive in the way energy per unit measures it.

**What success looks like.** Offline: Predicted versus achieved yield on matched runs, Safety clip rate and Model error in unseen operating regions. Online: Yield improvement against matched controls, Energy per unit and Off-spec output. The launch is judged on "Yield improvement against matched controls" while "Energy per unit" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend setpoint adjustments on a continuous or batch process to raise yield and cut energy while staying within safe operating limits.

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

- Recommendations bounded by validated safe limits
- Operator or engineer approves each change
- A model output cannot write directly to the controller
- Simulation test before use
- Recommendation every 5 minutes for 300 units

## The approach in one paragraph

Start with standard operating setpoints with manual tuning by experienced operators, because they are the benchmark for any gain. Then earn the move to a constrained optimiser over a learned process model with uncertainty, advice-only first, a staged rollout with matched controls and a safety layer that clips any recommendation to approved limits, and only if it beats the baseline on Predicted versus achieved yield on matched runs and Safety clip rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Current setpoint distance from the optimum region | Position relative to the learned yield surface. Direction of change. Guard against: constrained by limits. |
| Add Feed quality indicators | Measured properties of the incoming material. Context. Guard against: lab and inline analysers. |
| Add Ambient and utility conditions | Temperature, pressure and cooling water state. Context. Guard against: include timestamps. |
| Run it as one pipeline | Process data capture (historian), Process model (gradient boosting with uncertainty), Constrained optimiser (bounded search), Safety clip (rules in code), Advisory display (operator HMI), Operator action log (MES) and Matched control evaluation (analytics). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle unfamiliar feed | Uncertainty gating and fallback to standard setpoints. |

**Deliberately not doing**

- Operator name: not a process variable.
- Batch number: an identifier.
- Day of week alone: confounded.

**How the approach is proven**

Prove it offline on Predicted versus achieved yield on matched runs, Safety clip rate and Model error in unseen operating regions using time-ordered splits, then online on "Yield improvement against matched controls" with "Energy per unit" as the guardrail. Watch for: Letting the model learn safety limits, Reading correlations as causes and Comparing before and after.

## Baseline and production design

- **Baseline (build this first):** Standard operating setpoints with manual tuning by experienced operators, because they are the benchmark for any gain.
- **Production design:** A constrained optimiser over a learned process model with uncertainty, advice-only first, a staged rollout with matched controls and a safety layer that clips any recommendation to approved limits.

## Why AI, and why this kind

**Why AI.** Recommend setpoint adjustments on a continuous or batch process to raise yield and cut energy while staying within safe operating limits. The evidence that separates good from bad outcomes (Current setpoint distance from the optimum region, Feed quality indicators, Ambient and utility conditions) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A model that learns the limits" are what teams reach for first, and they fail because A learned limit can be wrong in a rare state. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: A constrained optimiser over a learned process model with uncertainty, advice-only first, a staged rollout with matched controls and a safety layer that clips any recommendation to approved limits.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Current setpoint distance from the optimum region, Feed quality indicators, Ambient and utility conditions and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Standard operating setpoints with manual tuning by experienced operators, because they are the benchmark for any gain | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A constrained optimiser over a learned process model with uncertainty, advice-only first, a staged rollout with matched controls and a safety layer that clips any recommendation to approved limits | chosen | Meets the 2500 ms envelope at $0.013 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Yield improvement against matched controls) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Letting the model learn safety limits.
- Evaluation trap: Reading correlations as causes.
- Unfamiliar feed: the model extrapolates.
- Actuator saturation: the advice cannot be followed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
