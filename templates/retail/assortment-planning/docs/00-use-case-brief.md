# Assortment Planning & Space Optimisation: use-case brief

> Generated from the blueprint `retail/assortment-planning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Assortment Planning & Space Optimisation · **Domain:** retail · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose which SKUs each store cluster carries to maximise margin given space limits, substitution and local demand. The system has to run as a scheduled batch job, inside these limits: Shelf space per store, Vendor commitments and Local preferences.

**Why it is hard.** The obvious approach is sum of item sales, and it fails because removing a SKU moves 30-70% of its demand to substitutes. The second trap is in "Clusters": the real signal is behavioural store clusters, while teams usually reach for store size tiers.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.6K a month. A mistake is expensive in the way customer-switching loss measures it.

**What success looks like.** Offline: Predicted vs realised sales change at reset and Substitution accuracy. Online: Margin per square foot and Customer-switching loss. The launch is judged on "Margin per square foot" while "Customer-switching loss" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose which SKUs each store cluster carries to maximise margin given space limits, substitution and local demand.

**Training objective.** `\max_{x\in\{0,1\}^N}\;\sum_i m_i\,\mathbb{E}[D_i(x)]\ \text{s.t. }\sum_i s_i x_i\le S`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_{x\in\{0,1\}^N} | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| m_i | The profit margin of item i. |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| D_i | The expected demand for item i given the chosen assortment. |
| x | Decision: x_i is 1 if item i is stocked, 0 if not. |
| s_i | The shelf space item i needs. |
| S | The total shelf space available. |

**Hard constraints**

- Shelf space per store
- Vendor commitments
- Local preferences
- Quarterly planning cycle

## The approach in one paragraph

Start with rank by sales and fill space to the cut-off. Then earn the move to choice-model-based demand with substitution (MNL / ML-based) and an integer optimiser per store cluster, and only if it beats the baseline on Predicted vs realised sales change at reset and Substitution accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Substitution matrix | Estimated demand transfer between SKUs. True marginal value. Guard against: estimated from stock-out natural experiments. |
| Add Local demand index | Category share vs chain average. Localisation. Guard against: normalise by store traffic. |
| Add Space elasticity | Sales response to facings. Optimisation input. Guard against: controlled planogram tests. |
| Run it as one pipeline | Sales and space data (lakehouse), Choice-model trainer (MNL with ML features), Cluster builder (behavioural clustering), Assortment optimiser (MILP), Planogram generator (space tool) and Post-reset sales (tracking), with Category manager review off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle out-of-stock events distort demand | Stock-out correction in estimation. |

**Deliberately not doing**

- Absolute sales rank: ignores substitutability.
- Supplier promotions: temporary distortions.

**How the approach is proven**

Prove it offline on Predicted vs realised sales change at reset and Substitution accuracy using time-ordered splits, then online on "Margin per square foot" with "Customer-switching loss" as the guardrail. Watch for: Using sales as demand when items were unavailable and Ignoring halo effects.

## Baseline and production design

- **Baseline (build this first):** Rank by sales and fill space to the cut-off.
- **Production design:** Choice-model-based demand with substitution (MNL / ML-based) and an integer optimiser per store cluster.

## Why AI, and why this kind

**Why AI.** Choose which SKUs each store cluster carries to maximise margin given space limits, substitution and local demand. The evidence that separates good from bad outcomes (Substitution matrix, Local demand index, Space elasticity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "sum of item sales" are what teams reach for first, and they fail because removing a SKU moves 30-70% of its demand to substitutes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Choice-model-based demand with substitution (MNL / ML-based) and an integer optimiser per store cluster.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Substitution matrix, Local demand index, Space elasticity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rank by sales and fill space to the cut-off | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Choice-model-based demand with substitution (MNL / ML-based) and an integer optimiser per store cluster | chosen | Meets the run-window envelope at $0.360 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Margin per square foot) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using sales as demand when items were unavailable.
- Evaluation trap: Ignoring halo effects.
- Out-of-stock events distort demand: censored sales bias results.
- Vendor funding changes late: plan violates commitments.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
