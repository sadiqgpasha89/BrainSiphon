# Dynamic Credit Limit Optimization: use-case brief

> Generated from the blueprint `fintech/dynamic-credit-limit-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dynamic Credit Limit Optimization · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Raise or lower card limits monthly to maximise risk-adjusted revenue subject to loss and capital constraints. The system has to run as a scheduled batch job, inside these limits: Regulatory limit-change notices, Portfolio loss ceiling and Fairness across segments.

**Why it is hard.** The obvious approach is correlation of high limit with high spend, and it fails because high limits are given to people who already spend more. The second trap is in "Evaluation": the real signal is off-policy evaluation with logged propensities, while teams usually reach for back-testing a new policy on historical outcomes.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.6K a month. A mistake is expensive in the way share of accounts with limit increases that default measures it.

**What success looks like.** Offline: Doubly-robust policy value estimate and Constraint violation rate in simulation. Online: Revenue per account net of loss and Share of accounts with limit increases that default. The launch is judged on "Revenue per account net of loss" while "Share of accounts with limit increases that default" must not get worse.

## Objective, loss and constraints

**Business objective.** Raise or lower card limits monthly to maximise risk-adjusted revenue subject to loss and capital constraints.

**Training objective.** `\max_\pi\;\mathbb{E}\!\left[\sum_t\gamma^t\left(\text{revenue}_t-\text{loss}_t-c\cdot\text{capital}_t\right)\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_\pi | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \gamma^t | Discount factor for later steps. |
| \text{revenue}_t | Interest and fee revenue earned at step t. |
| \text{loss}_t | Credit losses at step t. |
| c | The cost of capital charged per unit of capital held. |
| \text{capital}_t | Capital held against the credit line at step t. |

**Hard constraints**

- Regulatory limit-change notices
- Portfolio loss ceiling
- Fairness across segments
- Counterfactual evaluation only

## The approach in one paragraph

Start with rule grid using score band and utilisation. Then earn the move to contextual bandit with a doubly-robust off-policy estimator and Lagrangian risk constraints, learned on a randomised exploration slice, and only if it beats the baseline on Doubly-robust policy value estimate and Constraint violation rate in simulation after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Spend-to-limit headroom | Peak utilisation divided by limit over 3 cycles. Constrained high-demand customers. Guard against: use pre-decision cycles. |
| Add Early-delinquency hazard | Model-predicted 6-month default probability. Risk side of the trade. Guard against: score at action time not later. |
| Add Elasticity estimate | Causal forest estimate of spend change per limit step. Who responds to more credit. Guard against: needs randomised limit-test cohorts. |
| Run it as one pipeline | Portfolio snapshot (lakehouse), Risk and uplift models (GBDT and causal forest), Policy optimiser (constrained bandit), Constraint checker (loss and capital limits), Change publisher (batch to core banking) and Outcome tracker (monthly labels), with Compliance review off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle recession onset | Macro circuit breaker freezes increases and shifts to conservative policy. |

**Deliberately not doing**

- Raw credit score change: already inside the hazard model.
- Marketing segment tag: redundant and unstable across campaigns.

**How the approach is proven**

Prove it offline on Doubly-robust policy value estimate and Constraint violation rate in simulation using time-ordered splits, then online on "Revenue per account net of loss" with "Share of accounts with limit increases that default" as the guardrail. Watch for: Naive A/B of limit changes confounded by selection and No exploration data so counterfactuals are unsupported.

## Baseline and production design

- **Baseline (build this first):** Rule grid using score band and utilisation.
- **Production design:** Contextual bandit with a doubly-robust off-policy estimator and Lagrangian risk constraints, learned on a randomised exploration slice.

## Why AI, and why this kind

**Why AI.** Raise or lower card limits monthly to maximise risk-adjusted revenue subject to loss and capital constraints. The evidence that separates good from bad outcomes (Spend-to-limit headroom, Early-delinquency hazard, Elasticity estimate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "correlation of high limit with high spend" are what teams reach for first, and they fail because high limits are given to people who already spend more. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Contextual bandit with a doubly-robust off-policy estimator and Lagrangian risk constraints, learned on a randomised exploration slice.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Spend-to-limit headroom, Early-delinquency hazard, Elasticity estimate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule grid using score band and utilisation | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Contextual bandit with a doubly-robust off-policy estimator and Lagrangian risk constraints, learned on a randomised exploration slice | chosen | Meets the run-window envelope at $0.361 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Revenue per account net of loss) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Naive A/B of limit changes confounded by selection.
- Evaluation trap: No exploration data so counterfactuals are unsupported.
- Recession onset: policy keeps raising limits on stale elasticity.
- Logged-policy support gaps: off-policy estimates explode.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
