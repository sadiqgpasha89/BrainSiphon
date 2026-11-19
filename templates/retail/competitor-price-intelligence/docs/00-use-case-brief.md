# Competitor Price Intelligence & Matching: use-case brief

> Generated from the blueprint `retail/competitor-price-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Competitor Price Intelligence & Matching · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Continuously match own SKUs to competitor listings and track prices and availability reliably for pricing teams. The system has to run as a scheduled batch job, inside these limits: Legal scraping boundaries, Match precision above 98% and Daily refresh for 5M SKUs.

**Why it is hard.** The obvious approach is title similarity, and it fails because different pack sizes have near-identical titles. The second trap is in "Freshness": the real signal is observation timestamp and availability state, while teams usually reach for last seen price.

**Scale and stakes.** At 10 million users this is about 5.0M model-touching events a day, 58 requests per second on average and 58 at peak, at an estimated $2.5K a month. A mistake is expensive in the way pricing action accuracy measures it.

**What success looks like.** Offline: Match precision and recall and Extraction field accuracy. Online: Price-index coverage and Pricing action accuracy. The launch is judged on "Price-index coverage" while "Pricing action accuracy" must not get worse.

## Objective, loss and constraints

**Business objective.** Continuously match own SKUs to competitor listings and track prices and availability reliably for pricing teams.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{AttributeConflict}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{AttributeConflict} | Penalty when matched products disagree on key attributes such as size or pack count. |

**Hard constraints**

- Legal scraping boundaries
- Match precision above 98%
- Daily refresh for 5M SKUs
- Handle variants and bundles

## The approach in one paragraph

Start with exact match on GTIN with manual spreadsheets. Then earn the move to crawl and structured extraction, multimodal pair matching with attribute conflict checks, confidence-gated price index, and only if it beats the baseline on Match precision and recall and Extraction field accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Match confidence | Calibrated pair probability. Gating. Guard against: per-category calibration. |
| Add Availability state | In-stock, backorder, out-of-stock. Price validity. Guard against: parse structured data. |
| Add Unit price normalisation | Price per unit/weight. Comparability. Guard against: unit extraction accuracy. |
| Run it as one pipeline | Crawler fleet (headless browsers), Extraction (schema and LLM fallback), Candidate matcher (ANN), Pair classifier (GBDT), Price index builder (validity filters) and Price feed (pricing engine), with Pricing analyst review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle competitor changes page layout | Extraction health monitors and LLM fallback. |

**Deliberately not doing**

- Page layout features: scraper artefact.
- Competitor logo: none.

**How the approach is proven**

Prove it offline on Match precision and recall and Extraction field accuracy using time-ordered splits, then online on "Price-index coverage" with "Pricing action accuracy" as the guardrail. Watch for: Precision measured on GTIN-matched easy pairs and Stale prices counted as fresh.

## Baseline and production design

- **Baseline (build this first):** Exact match on GTIN with manual spreadsheets.
- **Production design:** Crawl and structured extraction, multimodal pair matching with attribute conflict checks, confidence-gated price index.

## Why AI, and why this kind

**Why AI.** Continuously match own SKUs to competitor listings and track prices and availability reliably for pricing teams. The evidence that separates good from bad outcomes (Match confidence, Availability state, Unit price normalisation) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "title similarity" are what teams reach for first, and they fail because different pack sizes have near-identical titles. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Crawl and structured extraction, multimodal pair matching with attribute conflict checks, confidence-gated price index.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Match confidence, Availability state, Unit price normalisation and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Exact match on GTIN with manual spreadsheets | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Crawl and structured extraction, multimodal pair matching with attribute conflict checks, confidence-gated price index | chosen | Meets the run-window envelope at $0.017 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Price-index coverage) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Precision measured on GTIN-matched easy pairs.
- Evaluation trap: Stale prices counted as fresh.
- Competitor changes page layout: extractor returns nulls.
- Dynamic competitor pricing by user location: inconsistent observations.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
