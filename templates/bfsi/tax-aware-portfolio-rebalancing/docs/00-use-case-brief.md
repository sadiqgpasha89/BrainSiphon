# Tax-Aware Portfolio Rebalancing: use-case brief

> Generated from the blueprint `bfsi/tax-aware-portfolio-rebalancing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Tax-Aware Portfolio Rebalancing · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend trades that bring accounts back to target allocation at the lowest tax and trading cost. The system has to run as a scheduled batch job, inside these limits: Respect client restrictions and wash-sale rules, Trade lists explainable to the advisor and Daily scan, monthly trading.

**Why it is hard.** The obvious approach is pre-tax tracking error alone, and it fails because a perfect rebalance can cost more than it earns. The second trap is in "Lots": the real signal is tax lot selection, while teams usually reach for average cost.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.7K a month. A mistake is expensive in the way turnover measures it.

**What success looks like.** Offline: After-tax tracking error and Tax saved versus naive. Online: Net-of-tax return and Turnover. The launch is judged on "Net-of-tax return" while "Turnover" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend trades that bring accounts back to target allocation at the lowest tax and trading cost.

**Training objective.** `\min_{x}\;\sum_{i}\mathrm{Drift}_i^2+\lambda\sum_{j}\mathrm{Tax}_j\,x_j+\mu\sum_{j}\mathrm{Cost}_j\,x_j`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min_{x} | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_{i} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Drift}_i^2 | How far asset class i is from its target allocation; squared so larger drifts count more. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Tax}_j | The tax cost of selling lot j. |
| x_j | The input features describing one example (what the model sees). (one value per candidate or other item j) |
| \mu | The model's predicted mean (expected value) of the outcome. |
| \mathrm{Cost}_j | The trading cost (spread and fee) of trade j. |

**Hard constraints**

- Respect client restrictions and wash-sale rules
- Trade lists explainable to the advisor
- Daily scan, monthly trading
- Minimum trade size

## The approach in one paragraph

Start with calendar rebalancing to target with a drift threshold, because it is common practice. Then earn the move to a convex or mixed-integer optimiser with lot-level tax models and cost estimates, wrapped in a policy check and advisor review, and only if it beats the baseline on After-tax tracking error and Tax saved versus naive after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Drift versus band | Allocation minus target relative to the band. Trigger. Guard against: targets change. |
| Add Unrealised gain by lot | Gain per lot and holding period. Tax cost. Guard against: lot data errors. |
| Add Cash flow available | Contributions and income. Can rebalance without selling. Guard against: timing. |
| Run it as one pipeline | Positions and lots (custody feed), Target allocation service (model portfolios), Cost and tax estimator (rules and boosting), Optimiser (convex solver), Compliance check (rules) and Trade file (OMS), with Advisor review off the critical path. |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle wash-sale | Window tracking across accounts. |

**Deliberately not doing**

- Account nickname: irrelevant.
- Advisor: irrelevant.
- Statement date: arbitrary.

**How the approach is proven**

Prove it offline on After-tax tracking error and Tax saved versus naive using time-ordered splits, then online on "Net-of-tax return" with "Turnover" as the guardrail. Watch for: Back-test ignores lot constraints and Static prices.

## Baseline and production design

- **Baseline (build this first):** Calendar rebalancing to target with a drift threshold, because it is common practice.
- **Production design:** A convex or mixed-integer optimiser with lot-level tax models and cost estimates, wrapped in a policy check and advisor review.

## Why AI, and why this kind

**Why AI.** Recommend trades that bring accounts back to target allocation at the lowest tax and trading cost. The evidence that separates good from bad outcomes (Drift versus band, Unrealised gain by lot, Cash flow available) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "pre-tax tracking error alone" are what teams reach for first, and they fail because A perfect rebalance can cost more than it earns. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A convex or mixed-integer optimiser with lot-level tax models and cost estimates, wrapped in a policy check and advisor review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Drift versus band, Unrealised gain by lot, Cash flow available and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Calendar rebalancing to target with a drift threshold, because it is common practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A convex or mixed-integer optimiser with lot-level tax models and cost estimates, wrapped in a policy check and advisor review | chosen | Meets the run-window envelope at $0.188 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Net-of-tax return) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Back-test ignores lot constraints.
- Evaluation trap: Static prices.
- Wash-sale: repurchase within the window.
- Concentrated stock: large gain with restrictions.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
