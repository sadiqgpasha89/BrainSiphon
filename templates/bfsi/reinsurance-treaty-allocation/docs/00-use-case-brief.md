# Reinsurance Treaty Allocation Optimisation: use-case brief

> Generated from the blueprint `bfsi/reinsurance-treaty-allocation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Reinsurance Treaty Allocation Optimisation · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose how risks are ceded across reinsurance treaties to reduce capital and volatility at an acceptable premium. The system has to run as a scheduled batch job, inside these limits: Treaty limits and counterparty credit limits, Board risk appetite and Annual renewal cycle.

**Why it is hard.** The obvious approach is gross loss, and it fails because reinsurance changes the tail. The second trap is in "Credit": the real signal is reinsurer default risk, while teams usually reach for treating recoveries as certain.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.7K a month. A mistake is expensive in the way earnings volatility measures it.

**What success looks like.** Offline: Net loss tail error and Capital change accuracy. Online: Reinsurance spend per unit of capital relief and Earnings volatility. The launch is judged on "Reinsurance spend per unit of capital relief" while "Earnings volatility" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose how risks are ceded across reinsurance treaties to reduce capital and volatility at an acceptable premium.

**Training objective.** `\min_{x}\;\sum_{k}\mathrm{Premium}_k\,x_k+\lambda\,\mathrm{Var}(\text{net loss})+\mu\,\mathrm{Capital}(x)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min_{x} | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_{k} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Premium}_k | The premium charged for ceding risk under treaty option k. |
| x_k | The input features describing one example (what the model sees). (one value per class or label k) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Var} | Variance: how widely a quantity varies around its mean. |
| \text{net loss} | The insurer's loss after reinsurance recoveries; its variance is penalised. |
| \mu | The model's predicted mean (expected value) of the outcome. |
| \mathrm{Capital} | The solvency capital the insurer must hold under the chosen programme x. |

**Hard constraints**

- Treaty limits and counterparty credit limits
- Board risk appetite
- Annual renewal cycle
- Explainable trade-offs

## The approach in one paragraph

Start with last year's programme with price adjustments, because it is typical. Then earn the move to stochastic simulation with a constrained optimiser over treaty options, a credit adjustment and scenario comparison for the board, and only if it beats the baseline on Net loss tail error and Capital change accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Loss distribution by line | Simulated gross losses. Input. Guard against: model risk. |
| Add Treaty terms | Attachment, limit, reinstatement. Structure. Guard against: complexity. |
| Add Reinsurer credit | Rating and spread. Counterparty. Guard against: changes. |
| Run it as one pipeline | Exposure and loss sims (catastrophe and actuarial models), Treaty library (structured terms), Optimiser (stochastic program), Credit adjustment (spreads), Board pack (document) and Decision log (audit store), with Scenario report off the critical path. |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle hard market | Re-solve with price-shock scenarios and show the board the capital relief per extra premium unit. |

**Deliberately not doing**

- Broker: irrelevant.
- Treaty name: label.
- Renewal month: weak.

**How the approach is proven**

Prove it offline on Net loss tail error and Capital change accuracy using time-ordered splits, then online on "Reinsurance spend per unit of capital relief" with "Earnings volatility" as the guardrail. Watch for: Optimising against one simulation set and Historical prices.

## Baseline and production design

- **Baseline (build this first):** Last year's programme with price adjustments, because it is typical.
- **Production design:** Stochastic simulation with a constrained optimiser over treaty options, a credit adjustment and scenario comparison for the board.

## Why AI, and why this kind

**Why AI.** Choose how risks are ceded across reinsurance treaties to reduce capital and volatility at an acceptable premium. The evidence that separates good from bad outcomes (Loss distribution by line, Treaty terms, Reinsurer credit) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "gross loss" are what teams reach for first, and they fail because reinsurance changes the tail. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Stochastic simulation with a constrained optimiser over treaty options, a credit adjustment and scenario comparison for the board.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Loss distribution by line, Treaty terms, Reinsurer credit and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Last year's programme with price adjustments, because it is typical | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Stochastic simulation with a constrained optimiser over treaty options, a credit adjustment and scenario comparison for the board | chosen | Meets the run-window envelope at $0.372 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Reinsurance spend per unit of capital relief) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Optimising against one simulation set.
- Evaluation trap: Historical prices.
- Hard market: a hard reinsurance market raises prices sharply and the planned programme becomes too expensive.
- Aggregate vs per-event: covers behave differently.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
