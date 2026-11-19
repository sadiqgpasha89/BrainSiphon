# Contextual Targeting & Page Classification: use-case brief

> Generated from the blueprint `adtech/contextual-targeting-page-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Contextual Targeting & Page Classification · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify page and video content into IAB topics and sentiment in real time to target ads without user identifiers. The system has to run in under 100 milliseconds, inside these limits: Classification latency under 50 ms with caching, Multilingual and New pages constantly.

**Why it is hard.** The obvious approach is classify on every ad request, and it fails because per-request classification is too slow and costly. The second trap is in "Granularity": the real signal is page-level and entity-level topics, while teams usually reach for domain-level labels.

**Scale and stakes.** At 10 million users this is about 90.0M model-touching events a day, 1.0K requests per second on average and 6.3K at peak, at an estimated $54.1K a month. A mistake is expensive in the way addressable inventory share measures it.

**What success looks like.** Offline: Macro-F1 on IAB taxonomy and Cache hit rate. Online: Contextual campaign CPA vs behavioural and Addressable inventory share. The launch is judged on "Contextual campaign CPA vs behavioural" while "Addressable inventory share" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify page and video content into IAB topics and sentiment in real time to target ads without user identifiers.

**Training objective.** `\mathcal{L}=\sum_k\mathrm{BCE}(y_k,p_k)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_k | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y_k | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per class or label k) |
| p_k | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per class or label k) |

**Hard constraints**

- Classification latency under 50 ms with caching
- Multilingual
- New pages constantly
- Brand-safety coupling

## The approach in one paragraph

Start with domain-level category lists. Then earn the move to distilled multilingual classifier with page cache keyed by canonical URL, async crawl and refresh, and fallback to URL-based classifier, and only if it beats the baseline on Macro-F1 on IAB taxonomy and Cache hit rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Page text embedding | Text encoder embedding. Topic. Guard against: cleaning. |
| Add Entity and keyword extraction | NER and keyphrases. Targeting keys. Guard against: quality. |
| Add Title and URL tokens | URL path tokens. Cheap early signal. Guard against: regex. |
| Run it as one pipeline | Ad request URL (SSP), Page cache lookup (Redis), Fallback URL classifier (lightweight), Crawler and content extractor (async), Topic classifier (distilled transformer), Segment mapper (taxonomy) and Performance logs (analytics). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle breaking news page not yet crawled | Fallback URL classifier and fast-crawl priority queue. |

**Deliberately not doing**

- Navigation boilerplate: repeated across pages.
- Comment sections: off-topic and risky.

**How the approach is proven**

Prove it offline on Macro-F1 on IAB taxonomy and Cache hit rate using time-ordered splits, then online on "Contextual campaign CPA vs behavioural" with "Addressable inventory share" as the guardrail. Watch for: Evaluating on clean article pages only and Taxonomy version mismatch.

## Baseline and production design

- **Baseline (build this first):** Domain-level category lists.
- **Production design:** Distilled multilingual classifier with page cache keyed by canonical URL, async crawl and refresh, and fallback to URL-based classifier.

## Why AI, and why this kind

**Why AI.** Classify page and video content into IAB topics and sentiment in real time to target ads without user identifiers. The evidence that separates good from bad outcomes (Page text embedding, Entity and keyword extraction, Title and URL tokens) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "classify on every ad request" are what teams reach for first, and they fail because per-request classification is too slow and costly. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Distilled multilingual classifier with page cache keyed by canonical URL, async crawl and refresh, and fallback to URL-based classifier.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Page text embedding, Entity and keyword extraction, Title and URL tokens and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Domain-level category lists | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Distilled multilingual classifier with page cache keyed by canonical URL, async crawl and refresh, and fallback to URL-based classifier | chosen | Meets the 80 ms envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Contextual campaign CPA vs behavioural) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on clean article pages only.
- Evaluation trap: Taxonomy version mismatch.
- Breaking news page not yet crawled: ads shown with no context signal.
- Single-page apps change content without URL change: stale classification.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
