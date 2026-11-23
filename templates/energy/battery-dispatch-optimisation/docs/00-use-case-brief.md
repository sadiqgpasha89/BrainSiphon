# Battery Dispatch Optimisation: use-case brief

> Generated from the blueprint `energy/battery-dispatch-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Battery Dispatch Optimisation · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Schedule battery charging and discharging across energy, ancillary and capacity markets to maximise margin while protecting battery life and respecting grid limits. The system has to run interactively, within a few seconds, inside these limits: State of charge and power limits enforced in the controller, Degradation cost in the objective and Warranty and grid connection limits respected.

**Why it is hard.** The obvious approach is revenue, and it fails because aggressive cycling wears out the battery. The second trap is in "Uncertainty": the real signal is price scenarios and forecast errors, while teams usually reach for a single price path.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 20.0K at peak, at an estimated $21.3K a month. A mistake is expensive in the way throughput and ageing measures it.

**What success looks like.** Offline: Margin after degradation in backtests, Limit violation rate and Forecast calibration. Online: Margin per MWh, Throughput and ageing and Warranty limit breaches. The launch is judged on "Margin per MWh" while "Throughput and ageing" must not get worse.

## Objective, loss and constraints

**Business objective.** Schedule battery charging and discharging across energy, ancillary and capacity markets to maximise margin while protecting battery life and respecting grid limits.

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

- State of charge and power limits enforced in the controller
- Degradation cost in the objective
- Warranty and grid connection limits respected
- Dispatch plan every 5 minutes
- 500 sites

## The approach in one paragraph

Start with a rule that charges at night and discharges at evening peak, because it is the usual simple schedule. Then earn the move to a stochastic model-predictive controller with a degradation model and market stack optimisation, a rules layer for limits and an operator view of the plan, and only if it beats the baseline on Margin after degradation in backtests and Limit violation rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Price and ancillary scenarios | Scenario set from the price models. Value of options. Guard against: from forecasts. |
| Add State of charge and temperature | Charge level and cell temperature. Constraint. Guard against: from the battery system. |
| Add Degradation cost per cycle | Cost from the ageing model. Objective. Guard against: from the health model. |
| Run it as one pipeline | Price and forecast ingestion (market feeds), State estimation (battery system), Scenario generation (stochastic model), Dispatch optimiser (MPC), Limit filter (rules) and Dispatch command (battery controller interface), with Settlement review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle forecast miss | Rolling horizon and reserve margins. |

**Deliberately not doing**

- Site name: an identifier.
- Operator name: irrelevant.
- Log format: an artefact.

**How the approach is proven**

Prove it offline on Margin after degradation in backtests, Limit violation rate and Forecast calibration using time-ordered splits, then online on "Margin per MWh" with "Throughput and ageing" as the guardrail. Watch for: Revenue-only objectives, Learned safety limits and Single price paths.

## Baseline and production design

- **Baseline (build this first):** A rule that charges at night and discharges at evening peak, because it is the usual simple schedule.
- **Production design:** A stochastic model-predictive controller with a degradation model and market stack optimisation, a rules layer for limits and an operator view of the plan.

## Why AI, and why this kind

**Why AI.** Schedule battery charging and discharging across energy, ancillary and capacity markets to maximise margin while protecting battery life and respecting grid limits. The evidence that separates good from bad outcomes (Price and ancillary scenarios, State of charge and temperature, Degradation cost per cycle) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "revenue" are what teams reach for first, and they fail because aggressive cycling wears out the battery. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A stochastic model-predictive controller with a degradation model and market stack optimisation, a rules layer for limits and an operator view of the plan.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Price and ancillary scenarios, State of charge and temperature, Degradation cost per cycle and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A rule that charges at night and discharges at evening peak, because it is the usual simple schedule | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A stochastic model-predictive controller with a degradation model and market stack optimisation, a rules layer for limits and an operator view of the plan | chosen | Meets the 2500 ms envelope at $0.0025 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Margin per MWh) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Revenue-only objectives.
- Evaluation trap: Learned safety limits.
- Forecast miss: prices move against the plan.
- Cell fault: usable capacity drops.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
