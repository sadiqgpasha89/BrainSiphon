# Ad Quality Score & Landing-Page Experience: use-case brief

> Generated from the blueprint `adtech/landing-page-quality-score` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ad Quality Score & Landing-Page Experience · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Score expected landing-page experience and ad quality to rank and price ads, protecting users from deceptive or slow pages. The system has to run in under 100 milliseconds, inside these limits: Page scores cached and refreshed, Crawler politeness and Advertiser appeals.

**Why it is hard.** The obvious approach is cTR as quality, and it fails because cTR rewards clickbait. The second trap is in "Freshness": the real signal is refresh scores on page change, while teams usually reach for one-time score.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $74.1K a month. A mistake is expensive in the way revenue per search measures it.

**What success looks like.** Offline: AUC on policy-labelled pages and Rank correlation with satisfaction. Online: User complaint rate and Revenue per search. The launch is judged on "User complaint rate" while "Revenue per search" must not get worse.

## Objective, loss and constraints

**Business objective.** Score expected landing-page experience and ad quality to rank and price ads, protecting users from deceptive or slow pages.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{RankLoss} | Ranking loss: penalises placing a less relevant item above a more relevant one. |

**Hard constraints**

- Page scores cached and refreshed
- Crawler politeness
- Advertiser appeals
- Transparent policy

## The approach in one paragraph

Start with rule checks on load time and policy keywords. Then earn the move to multimodal page model (text plus screenshot) combined with field user signals into a calibrated quality score refreshed on change detection, and only if it beats the baseline on AUC on policy-labelled pages and Rank correlation with satisfaction after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Page load time and layout shift | Core Web Vitals. UX. Guard against: lab vs field. |
| Add Content relevance to ad | Semantic match. Relevance. Guard against: embeddings. |
| Add Post-click return rate | Share returning to results quickly. Dissatisfaction. Guard against: window. |
| Run it as one pipeline | Landing page crawler (headless browsers), Content and screenshot features (extractor), Quality model (multimodal GBDT), Field-signal merger (analytics), Score store (key-value), Auction consumer (ranker) and Advertiser appeals (human). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle page changes content after approval | Change detection and periodic re-crawl with cloaking checks. |

**Deliberately not doing**

- Domain age: weak.
- Ad ID: none.

**How the approach is proven**

Prove it offline on AUC on policy-labelled pages and Rank correlation with satisfaction using time-ordered splits, then online on "User complaint rate" with "Revenue per search" as the guardrail. Watch for: Labels reflect only reported pages and Crawler view differs from user view.

## Baseline and production design

- **Baseline (build this first):** Rule checks on load time and policy keywords.
- **Production design:** Multimodal page model (text plus screenshot) combined with field user signals into a calibrated quality score refreshed on change detection.

## Why AI, and why this kind

**Why AI.** Score expected landing-page experience and ad quality to rank and price ads, protecting users from deceptive or slow pages. The evidence that separates good from bad outcomes (Page load time and layout shift, Content relevance to ad, Post-click return rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "CTR as quality" are what teams reach for first, and they fail because CTR rewards clickbait. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Multimodal page model (text plus screenshot) combined with field user signals into a calibrated quality score refreshed on change detection.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Page load time and layout shift, Content relevance to ad, Post-click return rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule checks on load time and policy keywords | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multimodal page model (text plus screenshot) combined with field user signals into a calibrated quality score refreshed on change detection | chosen | Meets the 80 ms envelope at $0.082 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (User complaint rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels reflect only reported pages.
- Evaluation trap: Crawler view differs from user view.
- Page changes content after approval: bait-and-switch.
- Crawler blocked by advertiser: the landing page cannot be crawled so no quality score exists for ranking.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
