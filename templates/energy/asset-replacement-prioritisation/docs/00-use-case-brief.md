# Asset Replacement Prioritisation: use-case brief

> Generated from the blueprint `energy/asset-replacement-prioritisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Asset Replacement Prioritisation · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rank assets for replacement or refurbishment under a capital budget by balancing failure risk, consequence and cost across the network. The system has to run as a scheduled batch job, inside these limits: Budget and outage-window limits respected, Planners can lock or exclude assets and Every ranking shows its drivers.

**Why it is hard.** The obvious approach is highest risk first, and it fails because cheap fixes can reduce more risk per dollar. The second trap is in "Constraint": the real signal is crew, outage and supply chain limits, while teams usually reach for pure ranking.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way emergency replacements measures it.

**What success looks like.** Offline: Risk reduced per unit cost in backtests, Plan feasibility and Sensitivity to input error. Online: Risk reduced per budget, Emergency replacements and Planner acceptance of the ranking. The launch is judged on "Risk reduced per budget" while "Emergency replacements" must not get worse.

## Objective, loss and constraints

**Business objective.** Rank assets for replacement or refurbishment under a capital budget by balancing failure risk, consequence and cost across the network.

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

- Budget and outage-window limits respected
- Planners can lock or exclude assets
- Every ranking shows its drivers
- Plans for a 10-year horizon
- 2M assets

## The approach in one paragraph

Start with the annual capital plan from engineering judgement with age thresholds, because it is the planning norm. Then earn the move to a multi-period optimisation on calibrated risk and cost with scenario budgets, lock and exclude rules, and an explanation of each choice for the investment board, and only if it beats the baseline on Risk reduced per unit cost in backtests and Plan feasibility after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Failure probability | Calibrated failure probability by asset. Likelihood. Guard against: from health models. |
| Add Consequence of failure | Customers, safety and repair cost. Impact. Guard against: from GIS and finance. |
| Add Intervention cost and risk reduction | Cost and expected risk change. Value. Guard against: from engineering. |
| Run it as one pipeline | Asset risk data (health models), Cost and consequence join (finance and GIS), Portfolio optimiser (constrained solver), Scenario budgets (planning) and Plan export (capital planning tool), with Planner review and Outcome review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle budget cut | Re-optimisation with a comparison to the previous plan. |

**Deliberately not doing**

- Asset tag: an identifier.
- Project author: irrelevant.
- Spreadsheet version: an artefact.

**How the approach is proven**

Prove it offline on Risk reduced per unit cost in backtests, Plan feasibility and Sensitivity to input error using time-ordered splits, then online on "Risk reduced per budget" with "Emergency replacements" as the guardrail. Watch for: Highest risk first only, Unconstrained rankings and Opaque risk inputs.

## Baseline and production design

- **Baseline (build this first):** The annual capital plan from engineering judgement with age thresholds, because it is the planning norm.
- **Production design:** A multi-period optimisation on calibrated risk and cost with scenario budgets, lock and exclude rules, and an explanation of each choice for the investment board.

## Why AI, and why this kind

**Why AI.** Rank assets for replacement or refurbishment under a capital budget by balancing failure risk, consequence and cost across the network. The evidence that separates good from bad outcomes (Failure probability, Consequence of failure, Intervention cost and risk reduction) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "highest risk first" are what teams reach for first, and they fail because cheap fixes can reduce more risk per dollar. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: A multi-period optimisation on calibrated risk and cost with scenario budgets, lock and exclude rules, and an explanation of each choice for the investment board.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Failure probability, Consequence of failure, Intervention cost and risk reduction and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: The annual capital plan from engineering judgement with age thresholds, because it is the planning norm | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A multi-period optimisation on calibrated risk and cost with scenario budgets, lock and exclude rules, and an explanation of each choice for the investment board | chosen | Meets the run-window envelope at $0.182 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Risk reduced per budget) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Highest risk first only.
- Evaluation trap: Unconstrained rankings.
- Budget cut: the capital pool shrinks.
- Bad risk input: a risk model has errors.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
