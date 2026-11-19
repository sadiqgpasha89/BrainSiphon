# Marketplace Seller Fraud Detection: use-case brief

> Generated from the blueprint `retail/seller-fraud-marketplace-onboarding` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Marketplace Seller Fraud Detection · **Domain:** retail · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect fraudulent or high-risk sellers at registration and early lifecycle to stop scams, counterfeits and non-delivery. The system has to run interactively, within a few seconds, inside these limits: Onboarding SLA hours not days, Legal KYB requirements and Appeals.

**Why it is hard.** The obvious approach is static onboarding data only, and it fails because fraud sellers behave differently after approval. The second trap is in "Network": the real signal is shared identity and payout links to banned sellers, while teams usually reach for single-seller review.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 2 at peak, at an estimated $12.2K a month. A mistake is expensive in the way genuine seller approval time measures it.

**What success looks like.** Offline: PR-AUC and early detection lead time and Precision at review capacity. Online: Buyer harm per GMV and Genuine seller approval time. The launch is judged on "Buyer harm per GMV" while "Genuine seller approval time" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect fraudulent or high-risk sellers at registration and early lifecycle to stop scams, counterfeits and non-delivery.

**Training objective.** `\mathcal{L}=\mathrm{FL}(p,y)+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Onboarding SLA hours not days
- Legal KYB requirements
- Appeals
- Sellers in 100 countries

## The approach in one paragraph

Start with kYB checks with manual review rules. Then earn the move to two-stage: onboarding risk GBDT with graph features, then post-approval monitoring with sequence models and automatic limits, and only if it beats the baseline on PR-AUC and early detection lead time and Precision at review capacity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Payout-account sharing | Sellers sharing bank accounts or wallets. Re-registration. Guard against: hashed identifiers. |
| Add Listing-category velocity | New listings per day and category switching. Scam setup pattern. Guard against: time-window before alert. |
| Add Early order defect rate | Non-delivery, mismatch complaints in first 20 orders. Direct harm. Guard against: use matured outcomes. |
| Run it as one pipeline | Seller registration (onboarding API), KYB and sanctions checks (vendor APIs), Entity graph (identity links), Risk model (GBDT), Limit policy (listing and payout caps) and Early outcomes (complaints and chargebacks), with T&S review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle legitimate agency managing many sellers | Business relationship registry. |

**Deliberately not doing**

- Business name text length: arbitrary.
- Registration hour: bot artefact only.

**How the approach is proven**

Prove it offline on PR-AUC and early detection lead time and Precision at review capacity using time-ordered splits, then online on "Buyer harm per GMV" with "Genuine seller approval time" as the guardrail. Watch for: Outcomes only observed for approved sellers and Network features built using post-ban links.

## Baseline and production design

- **Baseline (build this first):** KYB checks with manual review rules.
- **Production design:** Two-stage: onboarding risk GBDT with graph features, then post-approval monitoring with sequence models and automatic limits.

## Why AI, and why this kind

**Why AI.** Detect fraudulent or high-risk sellers at registration and early lifecycle to stop scams, counterfeits and non-delivery. The evidence that separates good from bad outcomes (Payout-account sharing, Listing-category velocity, Early order defect rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "static onboarding data only" are what teams reach for first, and they fail because fraud sellers behave differently after approval. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Two-stage: onboarding risk GBDT with graph features, then post-approval monitoring with sequence models and automatic limits.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Payout-account sharing, Listing-category velocity, Early order defect rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: KYB checks with manual review rules | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Two-stage: onboarding risk GBDT with graph features, then post-approval monitoring with sequence models and automatic limits | chosen | Meets the 2500 ms envelope at $13.58 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Buyer harm per GMV) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Outcomes only observed for approved sellers.
- Evaluation trap: Network features built using post-ban links.
- Legitimate agency managing many sellers: flagged as linked network.
- Fast-growing genuine sellers: limits throttle growth.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
