# Risk-Weighted Asset Optimisation: use-case brief

> Generated from the blueprint `bfsi/risk-weighted-asset-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Risk-Weighted Asset Optimisation · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend actions (sell, hedge, restructure, re-price) that reduce risk-weighted assets per unit of lost income so capital is used where it earns most. The system has to run as a scheduled batch job, inside these limits: All actions respect limits and client commitments, Output explainable to the capital committee and Weekly refresh.

**Why it is hard.** The obvious approach is average RWA density, and it fails because the average hides which exposure to sell. The second trap is in "Feasibility": the real signal is actions the bank can execute (tenor, consent, market), while teams usually reach for theoretical reductions.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.7K a month. A mistake is expensive in the way cost of execution measures it.

**What success looks like.** Offline: RWA saved per plan and Income retained. Online: Capital ratio change and Cost of execution. The launch is judged on "Capital ratio change" while "Cost of execution" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend actions (sell, hedge, restructure, re-price) that reduce risk-weighted assets per unit of lost income so capital is used where it earns most.

**Training objective.** `\min_{x}\;\sum_{k}\mathrm{RWA}_k x_k+\lambda\sum_{k}\mathrm{Cost}_k\,x_k`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min_{x} | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_{k} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{RWA}_k | Risk-weighted assets of candidate action k: the capital-relevant exposure that action would remove or add. |
| x_k | The input features describing one example (what the model sees). (one value per class or label k) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Cost}_k | The income lost or execution cost of candidate action k. |

**Hard constraints**

- All actions respect limits and client commitments
- Output explainable to the capital committee
- Weekly refresh
- No action breaches regulatory rules

## The approach in one paragraph

Start with rank exposures by RWA density and review manually, because treasury and finance already do that. Then earn the move to a constrained optimiser (mixed integer program) over candidate actions with RWA and income models, and a learned execution-cost estimator, giving a ranked plan with trade-offs, and only if it beats the baseline on RWA saved per plan and Income retained after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Marginal RWA per unit of income | RWA released divided by income lost. Ranks actions. Guard against: allocation of shared costs matters. |
| Add Execution cost | Bid-ask or break cost of each action. Real cost of change. Guard against: estimates vary by market conditions. |
| Add Maturity and optionality | Remaining tenor and call dates. Short tenors run off naturally. Guard against: wrong dates distort the plan. |
| Run it as one pipeline | Exposure and RWA feed (risk engine), Action generator (rules over book), Cost estimator (boosting), Optimiser (MIP solver), Capital committee pack (BI) and Execution tracker (workflow), with Plan archive off the critical path. |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle rule change mid-quarter | Keep rule sets parameterised with effective dates and rerun the plan when a rule changes. |

**Deliberately not doing**

- Loan identifier order: arbitrary.
- Booking desk: administrative.
- Currency: indirect.

**How the approach is proven**

Prove it offline on RWA saved per plan and Income retained using time-ordered splits, then online on "Capital ratio change" with "Cost of execution" as the guardrail. Watch for: Counting reductions that cannot be executed and Static prices make plans look cheaper.

## Baseline and production design

- **Baseline (build this first):** Rank exposures by RWA density and review manually, because treasury and finance already do that.
- **Production design:** A constrained optimiser (mixed integer program) over candidate actions with RWA and income models, and a learned execution-cost estimator, giving a ranked plan with trade-offs.

## Why AI, and why this kind

**Why AI.** Recommend actions (sell, hedge, restructure, re-price) that reduce risk-weighted assets per unit of lost income so capital is used where it earns most. The evidence that separates good from bad outcomes (Marginal RWA per unit of income, Execution cost, Maturity and optionality) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "average RWA density" are what teams reach for first, and they fail because the average hides which exposure to sell. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: A constrained optimiser (mixed integer program) over candidate actions with RWA and income models, and a learned execution-cost estimator, giving a ranked plan with trade-offs.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Marginal RWA per unit of income, Execution cost, Maturity and optionality and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rank exposures by RWA density and review manually, because treasury and finance already do that | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A constrained optimiser (mixed integer program) over candidate actions with RWA and income models, and a learned execution-cost estimator, giving a ranked plan with trade-offs | chosen | Meets the run-window envelope at $0.372 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Capital ratio change) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Counting reductions that cannot be executed.
- Evaluation trap: Static prices make plans look cheaper.
- Rule change mid-quarter: the RWA calculation changes part-way through the quarter and the optimiser plans on rules that no longer apply.
- Client refusal: a planned sale or reduction is blocked by the client and the plan no longer adds up.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
