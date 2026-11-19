# Dynamic Pricing Optimisation: use-case brief

> Generated from the blueprint `retail/dynamic-pricing-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dynamic Pricing Optimisation · **Domain:** retail · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Set prices per SKU and channel to maximise margin dollars under inventory, competitor and brand-guardrail constraints. The system has to run as a scheduled batch job, inside these limits: Price-change frequency limits, Legal price-parity rules and Customer trust.

**Why it is hard.** The obvious approach is regressing sales on price, and it fails because sellers raise price when demand is high, creating a positive confounded slope. The second trap is in "Dynamics": the real signal is inventory and lifecycle-aware pricing, while teams usually reach for per-day myopic optimisation.

**Scale and stakes.** At 10 million users this is about 50.0M model-touching events a day, 579 requests per second on average and 579 at peak, at an estimated $3.5K a month. A mistake is expensive in the way price perception index measures it.

**What success looks like.** Offline: Demand model WAPE and Optimiser uplift on holdout stores. Online: Gross margin dollars and Price perception index. The launch is judged on "Gross margin dollars" while "Price perception index" must not get worse.

## Objective, loss and constraints

**Business objective.** Set prices per SKU and channel to maximise margin dollars under inventory, competitor and brand-guardrail constraints.

**Training objective.** `\max_p\;\sum_i (p_i-c_i)\,D_i(p_i,x_i)\quad\text{s.t. }p_i\in[p^{min}_i,p^{max}_i]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_p | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| p_i | The price chosen for item i, the thing being optimised; p^min and p^max are the lowest and highest allowed prices. |
| c_i | The unit cost of item i. |
| D_i | The predicted demand for item i at price p_i in context x_i. |
| x_i | Context features such as day, stock and competitor prices. |

**Hard constraints**

- Price-change frequency limits
- Legal price-parity rules
- Customer trust
- Daily batch for 50M SKUs

## The approach in one paragraph

Start with rule-based markup over cost with competitor matching. Then earn the move to hierarchical Bayesian demand model with randomised test cells and a constrained optimiser (MILP) solving per category nightly, with live guardrails, and only if it beats the baseline on Demand model WAPE and Optimiser uplift on holdout stores after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Own-price elasticity | Log-log slope from randomised price cells. Demand response. Guard against: randomisation required for validity. |
| Add Competitor price index | Own price divided by matched competitor median. Relative position. Guard against: matching must be accurate. |
| Add Days of cover | Stock divided by forecast demand. Scarcity. Guard against: forecast as-of, not realised. |
| Run it as one pipeline | Sales and inventory feed (lakehouse), Demand model (hierarchical Bayesian), Elasticity store (versioned table), Price optimiser (MILP solver), Guardrail engine (min/max rules) and Price publisher (catalogue API), with Pricing review off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle competitor scraper returns wrong match | Match-confidence gating and outlier clipping. |

**Deliberately not doing**

- Page views alone: confounded with traffic campaigns.
- Last week's price: autocorrelated with the policy itself.

**How the approach is proven**

Prove it offline on Demand model WAPE and Optimiser uplift on holdout stores using time-ordered splits, then online on "Gross margin dollars" with "Price perception index" as the guardrail. Watch for: Elasticities estimated from observational price changes and Offline simulation uses the same demand model that picks prices.

## Baseline and production design

- **Baseline (build this first):** Rule-based markup over cost with competitor matching.
- **Production design:** Hierarchical Bayesian demand model with randomised test cells and a constrained optimiser (MILP) solving per category nightly, with live guardrails.

## Why AI, and why this kind

**Why AI.** Set prices per SKU and channel to maximise margin dollars under inventory, competitor and brand-guardrail constraints. The evidence that separates good from bad outcomes (Own-price elasticity, Competitor price index, Days of cover) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "regressing sales on price" are what teams reach for first, and they fail because sellers raise price when demand is high, creating a positive confounded slope. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Hierarchical Bayesian demand model with randomised test cells and a constrained optimiser (MILP) solving per category nightly, with live guardrails.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Own-price elasticity, Competitor price index, Days of cover and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based markup over cost with competitor matching | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hierarchical Bayesian demand model with randomised test cells and a constrained optimiser (MILP) solving per category nightly, with live guardrails | chosen | Meets the run-window envelope at $0.0024 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Gross margin dollars) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Elasticities estimated from observational price changes.
- Evaluation trap: Offline simulation uses the same demand model that picks prices.
- Competitor scraper returns wrong match: system chases bad price.
- Price war spiral: margins collapse.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
