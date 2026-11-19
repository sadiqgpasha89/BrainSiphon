# Behavioural Cohorts & User Segmentation: use-case brief

> Generated from the blueprint `saas/behavioral-cohort-segmentation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Behavioural Cohorts & User Segmentation · **Domain:** saas · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Discover behaviour-based user cohorts that predict retention and expansion to drive lifecycle messaging and product decisions. The system has to run as a scheduled batch job, inside these limits: Stable segments, Explainable definitions and Privacy.

**Why it is hard.** The obvious approach is silhouette score, and it fails because internal metrics don't show business value. The second trap is in "Stability": the real signal is soft assignment and versioning, while teams usually reach for re-cluster weekly.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way segment usage by teams measures it.

**What success looks like.** Offline: Outcome separation (retention lift between segments) and Stability across weeks. Online: Lifecycle campaign lift by segment and Segment usage by teams. The launch is judged on "Lifecycle campaign lift by segment" while "Segment usage by teams" must not get worse.

## Objective, loss and constraints

**Business objective.** Discover behaviour-based user cohorts that predict retention and expansion to drive lifecycle messaging and product decisions.

**Training objective.** `\mathcal{L}=\mathrm{ReconstructionLoss}(z)+\lambda\,\mathrm{ClusterLoss}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{ReconstructionLoss} | How well an autoencoder rebuilds user behaviour from its compressed embedding. |
| z | The compressed embedding of a user's behaviour. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ClusterLoss} | Penalty that pulls embeddings towards their cluster centres so cohorts are distinct. |

**Hard constraints**

- Stable segments
- Explainable definitions
- Privacy
- Usable in marketing tools

## The approach in one paragraph

Start with rFM segments and manual cohorts. Then earn the move to sequence-embedding clustering with outcome-separation validation and automated segment profiling with stable versioned definitions, and only if it beats the baseline on Outcome separation (retention lift between segments) and Stability across weeks after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Feature-usage embedding | Sequence embedding of actions. Behaviour. Guard against: window. |
| Add Frequency and recency profile | Usage cadence. Engagement. Guard against: window. |
| Add Collaboration breadth | Teammates active. Network. Guard against: org graph. |
| Run it as one pipeline | Event data (warehouse), Sequence encoder (transformer), Clustering (constrained KMeans), Segment profiler (summaries), Segment API (CDP), Lifecycle campaigns (marketing tools) and Outcome tracking (analytics). |
| Optimise the right thing | The objective weighs how well an autoencoder rebuilds user behaviour from its compressed embedding, so the model is trained on the cost of the decision and not on a generic score. |
| Handle product redesign changes event semantics | Event-contract versioning and re-mapping. |

**Deliberately not doing**

- Signup date: cohort artefact.
- User ID: none.

**How the approach is proven**

Prove it offline on Outcome separation (retention lift between segments) and Stability across weeks using time-ordered splits, then online on "Lifecycle campaign lift by segment" with "Segment usage by teams" as the guardrail. Watch for: Internal metrics only and No outcome validation.

## Baseline and production design

- **Baseline (build this first):** RFM segments and manual cohorts.
- **Production design:** Sequence-embedding clustering with outcome-separation validation and automated segment profiling with stable versioned definitions.

## Why AI, and why this kind

**Why AI.** Discover behaviour-based user cohorts that predict retention and expansion to drive lifecycle messaging and product decisions. The evidence that separates good from bad outcomes (Feature-usage embedding, Frequency and recency profile, Collaboration breadth) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "silhouette score" are what teams reach for first, and they fail because internal metrics don't show business value. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Sequence-embedding clustering with outcome-separation validation and automated segment profiling with stable versioned definitions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Feature-usage embedding, Frequency and recency profile, Collaboration breadth and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: RFM segments and manual cohorts | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Sequence-embedding clustering with outcome-separation validation and automated segment profiling with stable versioned definitions | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Lifecycle campaign lift by segment) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Internal metrics only.
- Evaluation trap: No outcome validation.
- Product redesign changes event semantics: a product redesign changes what events mean, so existing segments silently break.
- Tiny segments produce noisy conclusions: very small segments produce noisy conclusions that lead to bad decisions.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
