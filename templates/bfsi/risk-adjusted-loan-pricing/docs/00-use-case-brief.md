# Risk-Adjusted Loan Pricing (RAROC): use-case brief

> Generated from the blueprint `bfsi/risk-adjusted-loan-pricing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Risk-Adjusted Loan Pricing (RAROC) · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend the loan rate and fees that meet the hurdle return on capital while winning the deals worth winning. The system has to run interactively, within a few seconds, inside these limits: Never price below the risk-adjusted floor without approval, Pricing explainable to relationship managers and Fair lending rules apply to retail segments.

**Why it is hard.** The obvious approach is using only won deals, and it fails because won deals are cheap deals so the curve slopes the wrong way. The second trap is in "Costs": the real signal is funding, expected loss, capital and operating cost per deal, while teams usually reach for margin over the base rate.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $3.6K a month. A mistake is expensive in the way win rate at or above the hurdle measures it.

**What success looks like.** Offline: Win-probability calibration and Realised RAROC against predicted RAROC. Online: Portfolio RAROC and Win rate at or above the hurdle. The launch is judged on "Portfolio RAROC" while "Win rate at or above the hurdle" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend the loan rate and fees that meet the hurdle return on capital while winning the deals worth winning.

**Training objective.** `\min_{r}\;-\mathbb{E}\left[\mathbb{1}[\text{win}(r)]\left(r-c_{\text{funding}}-c_{\text{risk}}\right)K\right]+\lambda\,\mathrm{Var}(r)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min_{r} | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \mathbb{1} | Indicator: equals 1 when the condition in the brackets is true and 0 otherwise. |
| \text{win} | Whether the quote wins the deal; win(r) is 1 if the client accepts rate r and 0 if they do not. |
| r | The rate (price) quoted to the client, the thing being optimised. |
| c_{\text{funding}} | A cost per unit of loan: c_funding is the funding cost and c_risk the expected-loss and capital cost. |
| K | The size of the loan (exposure) the rate applies to. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Var} | Variance: how widely a quantity varies around its mean. |

**Hard constraints**

- Never price below the risk-adjusted floor without approval
- Pricing explainable to relationship managers
- Fair lending rules apply to retail segments
- Grid refresh weekly

## The approach in one paragraph

Start with pricing grids by risk grade and tenor, with relationship-manager discretion within bands, because they are what the bank runs now. Then earn the move to win-probability model plus cost model giving expected return at each price, a constrained optimiser that picks the price within policy bounds, and a contextual bandit for exploration within safe ranges, and only if it beats the baseline on Win-probability calibration and Realised RAROC against predicted RAROC after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Quote-to-win curve | Logistic model of win versus price gap to the market. Elasticity differs by segment. Guard against: quote data is truncated where deals never reached a quote. |
| Add Expected loss and capital | PD times LGD times EAD plus regulatory capital charge. Sets the floor. Guard against: risk parameters must be the approved ones. |
| Add Relationship profitability | Trailing 12-month income from the client's other products. Justifies concessions. Guard against: allocation of shared costs is contested. |
| Run it as one pipeline | Deal request (origination system), Cost builder (risk and treasury services), Win-probability model (gradient boosting), Price optimiser (constrained solver), Approval engine (delegated authority rules) and Quote record (CRM), with Outcome feedback off the critical path. |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle market rate shock | Rate-lock windows and repricing triggers on funding moves. |

**Deliberately not doing**

- Time since last meeting: relationship manager noise.
- Branch: administrative.
- Loan purpose free text: inconsistent categories.

**How the approach is proven**

Prove it offline on Win-probability calibration and Realised RAROC against predicted RAROC using time-ordered splits, then online on "Portfolio RAROC" with "Win rate at or above the hurdle" as the guardrail. Watch for: Truncated quote data biases elasticity and Past discounts reflect relationship-manager habits, not customer need.

## Baseline and production design

- **Baseline (build this first):** Pricing grids by risk grade and tenor, with relationship-manager discretion within bands, because they are what the bank runs now.
- **Production design:** Win-probability model plus cost model giving expected return at each price, a constrained optimiser that picks the price within policy bounds, and a contextual bandit for exploration within safe ranges.

## Why AI, and why this kind

**Why AI.** Recommend the loan rate and fees that meet the hurdle return on capital while winning the deals worth winning. The evidence that separates good from bad outcomes (Quote-to-win curve, Expected loss and capital, Relationship profitability) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "using only won deals" are what teams reach for first, and they fail because won deals are cheap deals so the curve slopes the wrong way. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Win-probability model plus cost model giving expected return at each price, a constrained optimiser that picks the price within policy bounds, and a contextual bandit for exploration within safe ranges.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Quote-to-win curve, Expected loss and capital, Relationship profitability and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Pricing grids by risk grade and tenor, with relationship-manager discretion within bands, because they are what the bank runs now | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Win-probability model plus cost model giving expected return at each price, a constrained optimiser that picks the price within policy bounds, and a contextual bandit for exploration within safe ranges | chosen | Meets the 2500 ms envelope at $0.802 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Portfolio RAROC) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Truncated quote data biases elasticity.
- Evaluation trap: Past discounts reflect relationship-manager habits, not customer need.
- Market rate shock: funding costs jump during the quote validity period.
- Strategic client: price below hurdle is justified by group value.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
