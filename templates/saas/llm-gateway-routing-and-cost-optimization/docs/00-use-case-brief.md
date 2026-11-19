# LLM Gateway Routing & Cost Optimisation: use-case brief

> Generated from the blueprint `saas/llm-gateway-routing-and-cost-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** LLM Gateway Routing & Cost Optimisation · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Route each LLM request to the cheapest model that meets quality needs, with caching, rate limiting and fallbacks. The system has to run in under 100 milliseconds, inside these limits: Routing overhead under 20 ms, Quality guarantees per task and Provider outages.

**Why it is hard.** The obvious approach is always the largest model, and it fails because most requests don't need the largest model. The second trap is in "Caching": the real signal is semantic and prefix caching with safety, while teams usually reach for no caching.

**Scale and stakes.** At 10 million users this is about 90.0M model-touching events a day, 1.0K requests per second on average and 6.3K at peak, at an estimated $12.43M a month. A mistake is expensive in the way quality regressions measures it.

**What success looks like.** Offline: Cost saved at equal quality on eval sets and Router accuracy. Online: Cost per request and Quality regressions. The launch is judged on "Cost per request" while "Quality regressions" must not get worse.

## Objective, loss and constraints

**Business objective.** Route each LLM request to the cheapest model that meets quality needs, with caching, rate limiting and fallbacks.

**Training objective.** `\min_\pi\;\mathbb{E}\!\left[\text{cost}(m)+\lambda\,\mathbb{1}[\text{quality}<\tau]\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min_\pi | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \text{cost} | The cost of calling the chosen model. |
| m | The model chosen for the request. |
| \lambda | Penalty for answers below the quality threshold. |
| \mathbb{1} | Indicator: equals 1 when the condition in the brackets is true and 0 otherwise. |
| \text{quality} | The quality of the response. |
| \tau | The minimum acceptable quality. |

**Hard constraints**

- Routing overhead under 20 ms
- Quality guarantees per task
- Provider outages
- Budget enforcement per team

## The approach in one paragraph

Start with fixed model per application. Then earn the move to router model predicting quality per model, semantic cache with similarity thresholds, budget guards and multi-provider failover, and only if it beats the baseline on Cost saved at equal quality on eval sets and Router accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Query difficulty estimate | Predicted need for strong model. Routing. Guard against: router model. |
| Add Cache hit probability | Semantic similarity to cached. Savings. Guard against: index. |
| Add Provider health and latency | Live status. Fallback. Guard against: monitors. |
| Run it as one pipeline | LLM request (gateway), Auth and budget check (policy), Semantic cache (vector lookup), Router (difficulty classifier), Model call (provider adapters), Quality sampler (judge) and Usage metering (billing). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle cache returns an answer for a similar but different question | High similarity thresholds and task-specific cache TTLs. |

**Deliberately not doing**

- Prompt length alone: weak.
- Team name: none.

**How the approach is proven**

Prove it offline on Cost saved at equal quality on eval sets and Router accuracy using time-ordered splits, then online on "Cost per request" with "Quality regressions" as the guardrail. Watch for: Router trained on judge scores with bias and Cache evaluated on easy repeats.

## Baseline and production design

- **Baseline (build this first):** Fixed model per application.
- **Production design:** Router model predicting quality per model, semantic cache with similarity thresholds, budget guards and multi-provider failover.

## Why AI, and why this kind

**Why AI.** Route each LLM request to the cheapest model that meets quality needs, with caching, rate limiting and fallbacks. The evidence that separates good from bad outcomes (Query difficulty estimate, Cache hit probability, Provider health and latency) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "always the largest model" are what teams reach for first, and they fail because most requests don't need the largest model. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Router model predicting quality per model, semantic cache with similarity thresholds, budget guards and multi-provider failover.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Query difficulty estimate, Cache hit probability, Provider health and latency and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed model per application | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Router model predicting quality per model, semantic cache with similarity thresholds, budget guards and multi-provider failover | chosen | Meets the 80 ms envelope at $4.60 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cost per request) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Router trained on judge scores with bias.
- Evaluation trap: Cache evaluated on easy repeats.
- Cache returns an answer for a similar but different question: wrong response served.
- Provider outage: an LLM provider outage causes an error spike unless traffic fails over to an equivalent model.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
