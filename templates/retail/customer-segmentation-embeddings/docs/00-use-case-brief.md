# Behavioural Customer Segmentation with Embeddings: use-case brief

> Generated from the blueprint `retail/customer-segmentation-embeddings` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Behavioural Customer Segmentation with Embeddings · **Domain:** retail · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Learn actionable behavioural segments from purchase and browse sequences that marketing, merchandising and CRM can all use. The system has to run as a scheduled batch job, inside these limits: Stable segments month to month, Interpretable profiles and Privacy-safe aggregates.

**Why it is hard.** The obvious approach is segments by silhouette score, and it fails because pretty clusters may not predict any behaviour difference. The second trap is in "Stability": the real signal is soft assignments with persistence constraints, while teams usually reach for re-clustering from scratch monthly.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way use of segments by teams measures it.

**What success looks like.** Offline: Differential response (lift) between segments and Stability (adjusted Rand) month to month. Online: Campaign lift by segment and Use of segments by teams. The launch is judged on "Campaign lift by segment" while "Use of segments by teams" must not get worse.

## Objective, loss and constraints

**Business objective.** Learn actionable behavioural segments from purchase and browse sequences that marketing, merchandising and CRM can all use.

**Training objective.** `\mathcal{L}=\mathrm{InfoNCE}(z_u,z_u^+)+\lambda\,\mathrm{KMeans}(z)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{InfoNCE} | Contrastive loss that pulls true matching pairs together and pushes non-matching pairs apart. |
| z_u | The learned embedding of a customer: z_u for customer u and z_u+ for a similar view of the same customer. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{KMeans} | Clustering penalty that pulls each embedding towards its cluster centre so segments are compact. |

**Hard constraints**

- Stable segments month to month
- Interpretable profiles
- Privacy-safe aggregates
- Cheap to operate

## The approach in one paragraph

Start with rFM quantile segmentation. Then earn the move to self-supervised sequence encoder plus constrained clustering with stability regularisation and automated segment profiling, and only if it beats the baseline on Differential response (lift) between segments and Stability (adjusted Rand) month to month after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Sequence embedding of purchases | Transformer over order sequences. Behavioural similarity. Guard against: fixed observation window. |
| Add Price-tier mix | Share of basket by price tier. Value orientation. Guard against: normalise by category. |
| Add Channel and device mix | Online, store, app proportions. Engagement mode. Guard against: consent-aware. |
| Run it as one pipeline | Event history (lakehouse), Sequence encoder (transformer), Constrained clustering (KMeans with stability), Segment profiler (summary stats), Segment API (CDP), Marketing activation (campaign tool) and Response tracking (analytics). |
| Optimise the right thing | The objective weighs contrastive loss that pulls true matching pairs together and pushes non-matching pairs apart, so the model is trained on the cost of the decision and not on a generic score. |
| Handle segment drift after new product launch | Alignment of new clusters to old via optimal transport. |

**Deliberately not doing**

- Raw demographic fields: sparse and risky for fairness.
- Account creation month: cohort artefact.

**How the approach is proven**

Prove it offline on Differential response (lift) between segments and Stability (adjusted Rand) month to month using time-ordered splits, then online on "Campaign lift by segment" with "Use of segments by teams" as the guardrail. Watch for: Evaluating clusters only on internal metrics and No test of actionable difference.

## Baseline and production design

- **Baseline (build this first):** RFM quantile segmentation.
- **Production design:** Self-supervised sequence encoder plus constrained clustering with stability regularisation and automated segment profiling.

## Why AI, and why this kind

**Why AI.** Learn actionable behavioural segments from purchase and browse sequences that marketing, merchandising and CRM can all use. The evidence that separates good from bad outcomes (Sequence embedding of purchases, Price-tier mix, Channel and device mix) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "segments by silhouette score" are what teams reach for first, and they fail because pretty clusters may not predict any behaviour difference. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Self-supervised sequence encoder plus constrained clustering with stability regularisation and automated segment profiling.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Sequence embedding of purchases, Price-tier mix, Channel and device mix and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: RFM quantile segmentation | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Self-supervised sequence encoder plus constrained clustering with stability regularisation and automated segment profiling | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Campaign lift by segment) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating clusters only on internal metrics.
- Evaluation trap: No test of actionable difference.
- Segment drift after new product launch: segment assignments shift after launch so campaigns and reports silently break.
- Small segments get noisy: unstable estimates.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
