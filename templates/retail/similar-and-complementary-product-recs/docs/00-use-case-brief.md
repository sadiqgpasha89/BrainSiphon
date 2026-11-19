# Similar & Complementary Product Recommendations: use-case brief

> Generated from the blueprint `retail/similar-and-complementary-product-recs` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Similar & Complementary Product Recommendations · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Show substitutes on out-of-stock or low-fit items and complements at cart, lifting basket size without cannibalising margin. The system has to run in under 100 milliseconds, inside these limits: Compatibility correctness (phone case fits phone), 40 ms and Brand/legal exclusions.

**Why it is hard.** The obvious approach is one similarity score for all, and it fails because substitutes are rarely bought together; mixing them hurts both. The second trap is in "Compatibility": the real signal is hard attribute-compatibility constraints, while teams usually reach for purely behavioural signals.

**Scale and stakes.** At 10 million users this is about 24.0M model-touching events a day, 278 requests per second on average and 1.7K at peak, at an estimated $13.1K a month. A mistake is expensive in the way average order value measures it.

**What success looks like.** Offline: Complement HitRate@10 and Compatibility violation rate. Online: Attach rate and Average order value. The launch is judged on "Attach rate" while "Average order value" must not get worse.

## Objective, loss and constraints

**Business objective.** Show substitutes on out-of-stock or low-fit items and complements at cart, lifting basket size without cannibalising margin.

**Training objective.** `\mathcal{L}=\mathrm{InfoNCE}(i,i^+)+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{InfoNCE} | Contrastive loss that pulls true matching pairs together and pushes non-matching pairs apart. |
| i | Index over examples. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Compatibility correctness (phone case fits phone)
- 40 ms
- Brand/legal exclusions
- Explainable reason strings

## The approach in one paragraph

Start with item-to-item collaborative filtering on co-views. Then earn the move to multi-relation item graph with a GNN producing substitute/complement embeddings, attribute compatibility filter and margin-aware re-ranker, and only if it beats the baseline on Complement HitRate@10 and Compatibility violation rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Co-purchase lift | PMI of co-purchase versus independence. Complement relation. Guard against: use matured orders only. |
| Add Visual-text embedding distance | Multimodal embedding similarity. Substitute relation. Guard against: domain-specific fine-tuning. |
| Add Attribute compatibility flags | Structured compatibility table. Correctness. Guard against: maintain via catalogue pipeline. |
| Run it as one pipeline | Product page request (API), Item graph store (embedding lookup), Relation retrieval (ANN per relation), Compatibility filter (attribute rules), Margin-aware ranker (GBDT), Cache (CDN edge) and Interaction logs (Kafka). |
| Optimise the right thing | The objective weighs contrastive loss that pulls true matching pairs together and pushes non-matching pairs apart, so the model is trained on the cost of the decision and not on a generic score. |
| Handle accessory for discontinued model | Lifecycle flags and inventory-aware filtering. |

**Deliberately not doing**

- Popularity of the pair: favours blockbuster items.
- Raw price difference: misleading across categories.

**How the approach is proven**

Prove it offline on Complement HitRate@10 and Compatibility violation rate using time-ordered splits, then online on "Attach rate" with "Average order value" as the guardrail. Watch for: Co-view mistaken for complement and Offline metric blind to compatibility errors.

## Baseline and production design

- **Baseline (build this first):** Item-to-item collaborative filtering on co-views.
- **Production design:** Multi-relation item graph with a GNN producing substitute/complement embeddings, attribute compatibility filter and margin-aware re-ranker.

## Why AI, and why this kind

**Why AI.** Show substitutes on out-of-stock or low-fit items and complements at cart, lifting basket size without cannibalising margin. The evidence that separates good from bad outcomes (Co-purchase lift, Visual-text embedding distance, Attribute compatibility flags) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one similarity score for all" are what teams reach for first, and they fail because substitutes are rarely bought together; mixing them hurts both. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Multi-relation item graph with a GNN producing substitute/complement embeddings, attribute compatibility filter and margin-aware re-ranker.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Co-purchase lift, Visual-text embedding distance, Attribute compatibility flags and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Item-to-item collaborative filtering on co-views | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multi-relation item graph with a GNN producing substitute/complement embeddings, attribute compatibility filter and margin-aware re-ranker | chosen | Meets the 80 ms envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Attach rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Co-view mistaken for complement.
- Evaluation trap: Offline metric blind to compatibility errors.
- Accessory for discontinued model: recommends dead-end items.
- Cannibalisation of high-margin item: substitute-heavy recommendations steal sales from the highest-margin item and erode blended margin.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
