# Dynamic Product Ads & Feed Recommendations: use-case brief

> Generated from the blueprint `adtech/dynamic-product-ads-feed-recs` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dynamic Product Ads & Feed Recommendations · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Select and rank products in dynamic ads from the advertiser catalogue per user to maximise conversions. The system has to run in under 100 milliseconds, inside these limits: Catalogue freshness and stock, Privacy and 30 ms.

**Why it is hard.** The obvious approach is long-term profile only, and it fails because shopping intent is recent. The second trap is in "Availability": the real signal is real-time stock and price sync, while teams usually reach for static feeds.

**Scale and stakes.** At 10 million users this is about 60.0M model-touching events a day, 694 requests per second on average and 4.2K at peak, at an estimated $23.4K a month. A mistake is expensive in the way cost per purchase measures it.

**What success looks like.** Offline: Recall@k of purchased items and CTR and CVR calibration. Online: ROAS and Cost per purchase. The launch is judged on "ROAS" while "Cost per purchase" must not get worse.

## Objective, loss and constraints

**Business objective.** Select and rank products in dynamic ads from the advertiser catalogue per user to maximise conversions.

**Training objective.** `\mathcal{L}=-\sum_{(u,i)}\log\frac{e^{s(u,i)}}{\sum_{j}e^{s(u,j)}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{(u,i)} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |
| e^{s(u,i)} | Euler's number (about 2.718), the base of the exponential function. |

**Hard constraints**

- Catalogue freshness and stock
- Privacy
- 30 ms
- Advertiser brand rules

## The approach in one paragraph

Start with show last-viewed products. Then earn the move to session-based retrieval with ranker and feed-health filters, calibrated to ad auction needs, and only if it beats the baseline on Recall@k of purchased items and CTR and CVR calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Recent item views | Last viewed items. Intent. Guard against: window. |
| Add Product popularity within category | Trending score. Prior. Guard against: time. |
| Add Stock and price status | Feed freshness flags. Validity. Guard against: real-time. |
| Run it as one pipeline | Ad request (DSP), User events (feature store), Candidate retrieval (ANN), Ranker (GBDT), Feed validator (stock and price), Creative renderer (template) and Impression logs (stream). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle catalogue feed delays | Feed freshness SLAs and fallbacks. |

**Deliberately not doing**

- Product description length: none.
- Image size: weak.

**How the approach is proven**

Prove it offline on Recall@k of purchased items and CTR and CVR calibration using time-ordered splits, then online on "ROAS" with "Cost per purchase" as the guardrail. Watch for: Training on retargeted users biased toward high intent and Ignoring feed errors.

## Baseline and production design

- **Baseline (build this first):** Show last-viewed products.
- **Production design:** Session-based retrieval with ranker and feed-health filters, calibrated to ad auction needs.

## Why AI, and why this kind

**Why AI.** Select and rank products in dynamic ads from the advertiser catalogue per user to maximise conversions. The evidence that separates good from bad outcomes (Recent item views, Product popularity within category, Stock and price status) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "long-term profile only" are what teams reach for first, and they fail because shopping intent is recent. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Session-based retrieval with ranker and feed-health filters, calibrated to ad auction needs.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Recent item views, Product popularity within category, Stock and price status and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Show last-viewed products | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Session-based retrieval with ranker and feed-health filters, calibrated to ad auction needs | chosen | Meets the 80 ms envelope at $0.013 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (ROAS) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on retargeted users biased toward high intent.
- Evaluation trap: Ignoring feed errors.
- Catalogue feed delays: wrong prices shown.
- Sensitive product categories: inappropriate retargeting.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
