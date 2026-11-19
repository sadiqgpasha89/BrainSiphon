# Sponsored Products Ads Ranking: use-case brief

> Generated from the blueprint `retail/sponsored-products-ads-ranking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Sponsored Products Ads Ranking · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rank sponsored listings in marketplace search by expected value to buyer, seller and platform in a second-price style auction. The system has to run in under 100 milliseconds, inside these limits: Calibrated pCTR/pCVR for billing, Relevance floor for ads and Auction latency 30 ms.

**Why it is hard.** The obvious approach is ranking-only AUC, and it fails because billing needs calibrated probabilities. The second trap is in "Relevance": the real signal is relevance gate before auction, while teams usually reach for highest bidder wins.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $13.4K a month. A mistake is expensive in the way advertiser ROAS measures it.

**What success looks like.** Offline: Log-loss and calibration error and Relevance-gated NDCG. Online: Ad revenue per search and Advertiser ROAS. The launch is judged on "Ad revenue per search" while "Advertiser ROAS" must not get worse.

## Objective, loss and constraints

**Business objective.** Rank sponsored listings in marketplace search by expected value to buyer, seller and platform in a second-price style auction.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y_{\text{click}},p)+\mathrm{BCE}(y_{\text{conv}},q)\quad\text{rank by }b\cdot p\cdot q\cdot v`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y_{\text{click}} | The label: 1 if the ad was clicked. |
| p | The predicted click probability. |
| q | The predicted probability of a purchase given a click. |
| b | The advertiser's bid per click. |
| v | The value of a conversion to the advertiser. |

**Hard constraints**

- Calibrated pCTR/pCVR for billing
- Relevance floor for ads
- Auction latency 30 ms
- Advertiser budget pacing

## The approach in one paragraph

Start with rank by bid times historical CTR. Then earn the move to multi-task DCN with calibration layers, relevance gate, quality score and pacing multipliers feeding a generalised second-price auction, and only if it beats the baseline on Log-loss and calibration error and Relevance-gated NDCG after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Query-ad relevance | Cross-encoder relevance score. Eligibility. Guard against: same model as organic. |
| Add Historical ad CTR with shrinkage | Bayesian smoothed CTR. Prior. Guard against: window before auction. |
| Add Budget pacing multiplier | Fraction of budget remaining vs time. Fairness over the day. Guard against: real-time state. |
| Run it as one pipeline | Search request (gateway), Ad candidate retrieval (keyword and embedding), Relevance gate (cross-encoder), pCTR pCVR model (multi-task DCN), Auction and pricing (GSP engine), Pacing controller (budget service) and Impression and click logs (Kafka). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new advertiser with no history | Hierarchical priors and exploration budgets. |

**Deliberately not doing**

- Advertiser name: favouritism risk.
- Bid amount in training: leaks the auction mechanism.

**How the approach is proven**

Prove it offline on Log-loss and calibration error and Relevance-gated NDCG using time-ordered splits, then online on "Ad revenue per search" with "Advertiser ROAS" as the guardrail. Watch for: Click logs shaped by the incumbent auction and Miscalibration by traffic segment.

## Baseline and production design

- **Baseline (build this first):** Rank by bid times historical CTR.
- **Production design:** Multi-task DCN with calibration layers, relevance gate, quality score and pacing multipliers feeding a generalised second-price auction.

## Why AI, and why this kind

**Why AI.** Rank sponsored listings in marketplace search by expected value to buyer, seller and platform in a second-price style auction. The evidence that separates good from bad outcomes (Query-ad relevance, Historical ad CTR with shrinkage, Budget pacing multiplier) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "ranking-only AUC" are what teams reach for first, and they fail because billing needs calibrated probabilities. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Multi-task DCN with calibration layers, relevance gate, quality score and pacing multipliers feeding a generalised second-price auction.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Query-ad relevance, Historical ad CTR with shrinkage, Budget pacing multiplier and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rank by bid times historical CTR | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multi-task DCN with calibration layers, relevance gate, quality score and pacing multipliers feeding a generalised second-price auction | chosen | Meets the 80 ms envelope at $0.015 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Ad revenue per search) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Click logs shaped by the incumbent auction.
- Evaluation trap: Miscalibration by traffic segment.
- New advertiser with no history: cTR estimates unstable.
- Click fraud on ads: bills advertisers wrongly.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
