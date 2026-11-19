# Automated Valuation Model (AVM): use-case brief

> Generated from the blueprint `real-estate/automated-valuation-model` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Automated Valuation Model (AVM) · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate the market value of a home from its attributes, location, nearby sales and photos, with a confidence range, for lenders, portals and owners. The system has to run interactively, within a few seconds, inside these limits: Median error under 6% with a published confidence score, Valuation must not use protected attributes or their proxies and Explainable comparable set for every value.

**Why it is hard.** The obvious approach is listing price or assessed value, and it fails because listing prices are aspirations and assessed values lag the market by years. The second trap is in "Local": the real signal is micro-market effects such as school zone, street and view, while teams usually reach for city-level averages.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $12.3K a month. A mistake is expensive in the way value disputes raised by lenders measures it.

**What success looks like.** Offline: Median absolute percentage error by market and Share of values within 10% of the sale price. Online: Appraisal orders avoided and Value disputes raised by lenders. The launch is judged on "Appraisal orders avoided" while "Value disputes raised by lenders" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate the market value of a home from its attributes, location, nearby sales and photos, with a confidence range, for lenders, portals and owners.

**Training objective.** `\mathcal{L}=\mathrm{Huber}(\log\hat{y}-\log y)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.1},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Pinball} | Pinball (quantile) loss: penalises under- and over-prediction asymmetrically so the output is a chosen quantile, such as the 90th percentile, rather than the average. |
| \hat{q}_{0.1} | The model's predicted value at the chosen quantile. |

**Hard constraints**

- Median error under 6% with a published confidence score
- Valuation must not use protected attributes or their proxies
- Explainable comparable set for every value
- Re-valuation of a whole market overnight

## The approach in one paragraph

Start with hedonic regression on size, rooms, location and age per market, because appraisers recognise it and it gives instant explanations. Then earn the move to gradient boosting with spatial features and a photo-condition embedding, quantile heads for the range and a comparables retriever to justify each value, and only if it beats the baseline on Median absolute percentage error by market and Share of values within 10% of the sale price after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Comparable sale density | Count and recency of sales within 0.5 km and 90 days. Thin markets give wide errors. Guard against: only sales that closed before the valuation date. |
| Add Price per square metre by micro-area | Trailing median adjusted for size and type. Anchors the local level. Guard against: neighbourhood boundaries must be stable. |
| Add Condition score from photos | Vision model grade of kitchen, bathroom and exterior. Captures the unrecorded. Guard against: listing photos are staged and flattering. |
| Run it as one pipeline | Property record lookup (parcel and listing database), Geospatial features (PostGIS and H3 cells), Comparable retriever (nearest sales index), Photo condition model (vision model on GPU), Value model (gradient boosting with quantiles), Confidence calibrator (isotonic per market) and Valuation log (lakehouse). |
| Optimise the right thing | The objective weighs huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training, so the model is trained on the cost of the decision and not on a generic score. |
| Handle thin market | Widen the range and show the lower confidence score instead of a falsely precise value. |

**Deliberately not doing**

- Listing description adjectives: marketing language with little extra signal.
- Days since the listing photo upload: portal behaviour, not value.
- Owner name: no causal link and a privacy risk.

**How the approach is proven**

Prove it offline on Median absolute percentage error by market and Share of values within 10% of the sale price using time-ordered splits, then online on "Appraisal orders avoided" with "Value disputes raised by lenders" as the guardrail. Watch for: Training on sales after the valuation date leaks the trend and Random split lets the same street sit in train and test.

## Baseline and production design

- **Baseline (build this first):** Hedonic regression on size, rooms, location and age per market, because appraisers recognise it and it gives instant explanations.
- **Production design:** Gradient boosting with spatial features and a photo-condition embedding, quantile heads for the range and a comparables retriever to justify each value.

## Why AI, and why this kind

**Why AI.** Estimate the market value of a home from its attributes, location, nearby sales and photos, with a confidence range, for lenders, portals and owners. The evidence that separates good from bad outcomes (Comparable sale density, Price per square metre by micro-area, Condition score from photos) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "listing price or assessed value" are what teams reach for first, and they fail because listing prices are aspirations and assessed values lag the market by years. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Gradient boosting with spatial features and a photo-condition embedding, quantile heads for the range and a comparables retriever to justify each value.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Comparable sale density, Price per square metre by micro-area, Condition score from photos and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Hedonic regression on size, rooms, location and age per market, because appraisers recognise it and it gives instant explanations | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting with spatial features and a photo-condition embedding, quantile heads for the range and a comparables retriever to justify each value | chosen | Meets the 2500 ms envelope at $2.73 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Appraisal orders avoided) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on sales after the valuation date leaks the trend.
- Evaluation trap: Random split lets the same street sit in train and test.
- Thin market: few sales within the radius.
- Unique property: castle, houseboat or large plot.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
