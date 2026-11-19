# Lookalike Audience Modelling: use-case brief

> Generated from the blueprint `adtech/audience-lookalike-modeling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Lookalike Audience Modelling · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find users who resemble a seed audience at scale for acquisition campaigns, with privacy-safe features. The system has to run as a scheduled batch job, inside these limits: Privacy and consent, Seed size variation and Daily refresh for 1B users.

**Why it is hard.** The obvious approach is treat all seed users equally, and it fails because low-value seeds teach the model to find low-value users. The second trap is in "Objective": the real signal is optimise for downstream conversion not seed similarity, while teams usually reach for similarity to seeds alone.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way reach at target CPA measures it.

**What success looks like.** Offline: Lift in conversion rate vs random and Calibration of audience scores. Online: Cost per acquisition by audience size and Reach at target CPA. The launch is judged on "Cost per acquisition by audience size" while "Reach at target CPA" must not get worse.

## Objective, loss and constraints

**Business objective.** Find users who resemble a seed audience at scale for acquisition campaigns, with privacy-safe features.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{seed vs non-seed})+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{seed vs non-seed} | The label: 1 if a user belongs to the advertiser's seed audience of known good customers, 0 if not. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Privacy and consent
- Seed size variation
- Daily refresh for 1B users
- Avoid sensitive attributes

## The approach in one paragraph

Start with rule-based demographic and interest segments. Then earn the move to two-tower user embeddings with seed-weighted positive-unlabeled learning and a conversion-calibrated ranking head, and only if it beats the baseline on Lift in conversion rate vs random and Calibration of audience scores after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around User embedding similarity | Cosine to seed centroid or cluster mix. Similarity. Guard against: embedding drift. |
| Add Engagement recency | Days since last activity. Reach quality. Guard against: window. |
| Add Seed conversion propensity | Model-based seed value. Weighting. Guard against: matured. |
| Run it as one pipeline | User features (feature store), Seed ingestion (advertiser upload), Seed quality filter (rules), PU learning model (GBDT or two-tower), Audience scorer (batch) and Audience export (DSP), with Performance feedback off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle tiny seed list (<1,000) | Minimum-size handling and broad-prior blending. |

**Deliberately not doing**

- Raw user ID: none.
- Sensitive attribute proxies: policy risk.

**How the approach is proven**

Prove it offline on Lift in conversion rate vs random and Calibration of audience scores using time-ordered splits, then online on "Cost per acquisition by audience size" with "Reach at target CPA" as the guardrail. Watch for: Positive-unlabeled bias ignored and Evaluation only on seed-similar metrics.

## Baseline and production design

- **Baseline (build this first):** Rule-based demographic and interest segments.
- **Production design:** Two-tower user embeddings with seed-weighted positive-unlabeled learning and a conversion-calibrated ranking head.

## Why AI, and why this kind

**Why AI.** Find users who resemble a seed audience at scale for acquisition campaigns, with privacy-safe features. The evidence that separates good from bad outcomes (User embedding similarity, Engagement recency, Seed conversion propensity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "treat all seed users equally" are what teams reach for first, and they fail because low-value seeds teach the model to find low-value users. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Two-tower user embeddings with seed-weighted positive-unlabeled learning and a conversion-calibrated ranking head.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among User embedding similarity, Engagement recency, Seed conversion propensity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based demographic and interest segments | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Two-tower user embeddings with seed-weighted positive-unlabeled learning and a conversion-calibrated ranking head | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cost per acquisition by audience size) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Positive-unlabeled bias ignored.
- Evaluation trap: Evaluation only on seed-similar metrics.
- Tiny seed list (<1,000): model overfits and returns narrow audience.
- Seed includes bots or test users: audience is polluted.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
