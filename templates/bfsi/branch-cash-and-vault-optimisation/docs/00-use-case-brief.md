# Branch Cash & Vault Optimisation: use-case brief

> Generated from the blueprint `bfsi/branch-cash-and-vault-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Branch Cash & Vault Optimisation · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Plan cash holdings and shipments for branch vaults so branches rarely run out and the bank does not hold idle cash. The system has to run as a scheduled batch job, inside these limits: Insurance limits per vault, Cash-in-transit schedules are fixed and Weekly plan with daily adjustments.

**Why it is hard.** The obvious approach is total cash only, and it fails because a stock-out of one note type blocks service. The second trap is in "Costs": the real signal is holding, transport and stock-out cost together, while teams usually reach for minimising shipments.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way stock-out events measures it.

**What success looks like.** Offline: Forecast pinball loss and Stock-out rate. Online: Cash held per branch and Stock-out events. The launch is judged on "Cash held per branch" while "Stock-out events" must not get worse.

## Objective, loss and constraints

**Business objective.** Plan cash holdings and shipments for branch vaults so branches rarely run out and the bank does not hold idle cash.

**Training objective.** `\min\;\sum_{b}\left(c_{\text{hold}}\,I_b+c_{\text{ship}}\,S_b+c_{\text{out}}\,\mathbb{E}[\text{stockout}_b]\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_{b} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| c_{\text{hold}} | A unit cost: c_hold is the cost of holding cash, c_ship the cost of a shipment and c_out the cost of a stock-out. |
| I_b | The average cash inventory held at branch b. |
| S_b | The number of cash shipments sent to branch b. |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \text{stockout}_b | A stock-out at branch b: a day when the vault cannot meet withdrawals. |

**Hard constraints**

- Insurance limits per vault
- Cash-in-transit schedules are fixed
- Weekly plan with daily adjustments
- Explainable to branch managers

## The approach in one paragraph

Start with fixed par stock per branch with replenishment on a schedule, because it is the current practice. Then earn the move to quantile demand forecasts by denomination feeding a stochastic inventory optimiser that sets shipment sizes within CIT slots and vault limits, and only if it beats the baseline on Forecast pinball loss and Stock-out rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Withdrawal profile | Median daily withdrawals by branch and weekday. Core demand. Guard against: branch closures change patterns. |
| Add Pay-day effect | Days since local payroll dates. Spike driver. Guard against: pay dates vary by employer. |
| Add Local event calendar | Festivals and market days. Spike driver. Guard against: must be maintained. |
| Run it as one pipeline | Branch transactions (core banking), Demand forecaster (quantile boosting), Event calendar (configuration store), Inventory optimiser (stochastic program), CIT scheduler (logistics tool), Branch manager view (web app) and Outcome store (warehouse). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle branch closure | Link closures to neighbour forecasts. |

**Deliberately not doing**

- Branch manager name: irrelevant.
- Branch opening date: not predictive.
- Weather noise: small effect.

**How the approach is proven**

Prove it offline on Forecast pinball loss and Stock-out rate using time-ordered splits, then online on "Cash held per branch" with "Stock-out events" as the guardrail. Watch for: Training on stocked-out days underestimates demand and Static calendar in test.

## Baseline and production design

- **Baseline (build this first):** Fixed par stock per branch with replenishment on a schedule, because it is the current practice.
- **Production design:** Quantile demand forecasts by denomination feeding a stochastic inventory optimiser that sets shipment sizes within CIT slots and vault limits.

## Why AI, and why this kind

**Why AI.** Plan cash holdings and shipments for branch vaults so branches rarely run out and the bank does not hold idle cash. The evidence that separates good from bad outcomes (Withdrawal profile, Pay-day effect, Local event calendar) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "total cash only" are what teams reach for first, and they fail because A stock-out of one note type blocks service. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Quantile demand forecasts by denomination feeding a stochastic inventory optimiser that sets shipment sizes within CIT slots and vault limits.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Withdrawal profile, Pay-day effect, Local event calendar and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed par stock per branch with replenishment on a schedule, because it is the current practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Quantile demand forecasts by denomination feeding a stochastic inventory optimiser that sets shipment sizes within CIT slots and vault limits | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cash held per branch) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on stocked-out days underestimates demand.
- Evaluation trap: Static calendar in test.
- Branch closure: demand moves to nearby branches.
- Armoured vehicle delay: a cash delivery misses its slot and the branch is at risk of running out.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
