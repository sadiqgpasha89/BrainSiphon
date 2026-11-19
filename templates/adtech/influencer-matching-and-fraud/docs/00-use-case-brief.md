# Influencer Matching & Fake-Follower Detection: use-case brief

> Generated from the blueprint `adtech/influencer-matching-and-fraud` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Influencer Matching & Fake-Follower Detection · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Match brands to authentic creators with audiences that fit, and detect inflated followings and engagement pods. The system has to run as a scheduled batch job, inside these limits: Audience demographics privacy, Content brand safety and Fraud adaptation.

**Why it is hard.** The obvious approach is follower counts, and it fails because follower counts are purchasable. The second trap is in "Fit": the real signal is audience-brand affinity not just topic match, while teams usually reach for category match.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 1 at peak, at an estimated $1.6K a month. A mistake is expensive in the way campaign ROI measures it.

**What success looks like.** Offline: Fraud detection precision and Match quality NDCG. Online: Cost per engagement on authentic audience and Campaign ROI. The launch is judged on "Cost per engagement on authentic audience" while "Campaign ROI" must not get worse.

## Objective, loss and constraints

**Business objective.** Match brands to authentic creators with audiences that fit, and detect inflated followings and engagement pods.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{fake})+\lambda\,\mathrm{InfoNCE}(\text{brand},\text{creator})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{fake} | The label: 1 if the account has fake followers or engagement, 0 if genuine. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{InfoNCE} | Contrastive loss that pulls true matching pairs together and pushes non-matching pairs apart. |
| \text{brand} | The brand's representation used for matching. |
| \text{creator} | The creator's representation used for matching. |

**Hard constraints**

- Audience demographics privacy
- Content brand safety
- Fraud adaptation
- Disclosure rules

## The approach in one paragraph

Start with rank by follower count and engagement rate. Then earn the move to graph and behavioural fraud model plus audience-affinity matching with brand-safety content checks, and only if it beats the baseline on Fraud detection precision and Match quality NDCG after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Engagement authenticity score | Comment diversity and timing. Fake engagement. Guard against: nLP. |
| Add Follower growth anomalies | Sudden spikes. Bought followers. Guard against: time series. |
| Add Audience affinity embedding | Audience interests vs brand. Fit. Guard against: aggregates. |
| Run it as one pipeline | Creator data (platform APIs), Follower graph features (Spark), Fraud model (GNN plus GBDT), Brand-safety scan (classifier), Matching model (two-tower), Campaign manager (human) and Campaign results (labels). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle engagement pods mimic organic comments | Network-level pod detection. |

**Deliberately not doing**

- Follower count alone: gameable.
- Profile photo: weak.

**How the approach is proven**

Prove it offline on Fraud detection precision and Match quality NDCG using time-ordered splits, then online on "Cost per engagement on authentic audience" with "Campaign ROI" as the guardrail. Watch for: Platform-provided signals manipulated and Labels from small audits.

## Baseline and production design

- **Baseline (build this first):** Rank by follower count and engagement rate.
- **Production design:** Graph and behavioural fraud model plus audience-affinity matching with brand-safety content checks.

## Why AI, and why this kind

**Why AI.** Match brands to authentic creators with audiences that fit, and detect inflated followings and engagement pods. The evidence that separates good from bad outcomes (Engagement authenticity score, Follower growth anomalies, Audience affinity embedding) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "follower counts" are what teams reach for first, and they fail because follower counts are purchasable. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Graph and behavioural fraud model plus audience-affinity matching with brand-safety content checks.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Engagement authenticity score, Follower growth anomalies, Audience affinity embedding and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rank by follower count and engagement rate | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Graph and behavioural fraud model plus audience-affinity matching with brand-safety content checks | chosen | Meets the run-window envelope at $0.902 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cost per engagement on authentic audience) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Platform-provided signals manipulated.
- Evaluation trap: Labels from small audits.
- Engagement pods mimic organic comments: coordinated pods post organic-looking comments so fake engagement passes the checks.
- Creator content changes direction: brand-safety risk.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
