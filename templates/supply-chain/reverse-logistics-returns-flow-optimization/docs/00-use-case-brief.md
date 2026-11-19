# Reverse Logistics Disposition Optimisation: use-case brief

> Generated from the blueprint `supply-chain/reverse-logistics-returns-flow-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Reverse Logistics Disposition Optimisation · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Decide for each returned item whether to restock, refurbish, liquidate, donate or recycle, maximising recovered value. The system has to run as a scheduled batch job, inside these limits: Grading consistency, Warehouse capacity and Brand and safety policies.

**Why it is hard.** The obvious approach is default restock, and it fails because restocking damaged items harms customers. The second trap is in "Grading": the real signal is learned grade prediction from photos and returns reasons, while teams usually reach for manual-only grading.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.6K a month. A mistake is expensive in the way days to resale measures it.

**What success looks like.** Offline: Recovery value uplift vs rules and Grade accuracy. Online: Recovery rate and Days to resale. The launch is judged on "Recovery rate" while "Days to resale" must not get worse.

## Objective, loss and constraints

**Business objective.** Decide for each returned item whether to restock, refurbish, liquidate, donate or recycle, maximising recovered value.

**Training objective.** `\max_{a}\;\mathbb{E}[\text{recovery}(a\mid x)]-\text{cost}(a)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_{a} | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \text{recovery} | The value recovered from the returned item, for example resale value. |
| a | The disposition chosen: resell, refurbish, liquidate or recycle. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| x | The returned item's features. |
| \text{cost} | The cost of handling the return with option a. |

**Hard constraints**

- Grading consistency
- Warehouse capacity
- Brand and safety policies
- Time-to-shelf

## The approach in one paragraph

Start with rule-based disposition by category. Then earn the move to vision-based grading plus a value model per channel and a disposition optimiser under capacity limits, and only if it beats the baseline on Recovery value uplift vs rules and Grade accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Condition grade prediction | Grade from images. Disposition. Guard against: labelled grades. |
| Add Resale price model | Expected resale value by channel. Value. Guard against: market data. |
| Add Processing cost by route | Labour and shipping cost. Cost. Guard against: rate card. |
| Run it as one pipeline | Return receipt (WMS), Grading photos (station cameras), Grade model (CNN), Value and cost models (GBDT), Disposition optimiser (MILP) and Recovery outcomes (sales), with Warehouse operator off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle safety-recalled products | Recall list check as hard constraint. |

**Deliberately not doing**

- Return reason text length: none.
- Customer name: none.

**How the approach is proven**

Prove it offline on Recovery value uplift vs rules and Grade accuracy using time-ordered splits, then online on "Recovery rate" with "Days to resale" as the guardrail. Watch for: Resale prices assumed constant and Ignoring grade disagreement.

## Baseline and production design

- **Baseline (build this first):** Rule-based disposition by category.
- **Production design:** Vision-based grading plus a value model per channel and a disposition optimiser under capacity limits.

## Why AI, and why this kind

**Why AI.** Decide for each returned item whether to restock, refurbish, liquidate, donate or recycle, maximising recovered value. The evidence that separates good from bad outcomes (Condition grade prediction, Resale price model, Processing cost by route) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "default restock" are what teams reach for first, and they fail because restocking damaged items harms customers. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Vision-based grading plus a value model per channel and a disposition optimiser under capacity limits.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Condition grade prediction, Resale price model, Processing cost by route and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based disposition by category | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Vision-based grading plus a value model per channel and a disposition optimiser under capacity limits | chosen | Meets the run-window envelope at $0.091 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Recovery rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Resale prices assumed constant.
- Evaluation trap: Ignoring grade disagreement.
- Safety-recalled products: restocked by mistake.
- Seasonal glut of returns: capacity overflow.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
