# Product Matching & Deduplication: use-case brief

> Generated from the blueprint `retail/product-matching-and-deduplication` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Product Matching & Deduplication · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify identical products across sellers and sources to merge listings, power price comparison and avoid catalogue bloat. The system has to run as a scheduled batch job, inside these limits: Billions of candidate pairs, Precision above 99% for merges and GTIN not always present.

**Why it is hard.** The obvious approach is all-pairs comparison, and it fails because n-squared cannot scale to 200M items. The second trap is in "Identity": the real signal is hard identifiers (GTIN, MPN) trump fuzzy similarity, while teams usually reach for text similarity alone.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 1 at peak, at an estimated $1.9K a month. A mistake is expensive in the way wrong-merge incident count measures it.

**What success looks like.** Offline: Pairwise precision at 99% target and Cluster purity. Online: Duplicate rate in catalogue and Wrong-merge incident count. The launch is judged on "Duplicate rate in catalogue" while "Wrong-merge incident count" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify identical products across sellers and sources to merge listings, power price comparison and avoid catalogue bloat.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{TransitiveClosurePenalty}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{TransitiveClosurePenalty} | Penalty when matches are not consistent: if A matches B and B matches C, A should match C. |

**Hard constraints**

- Billions of candidate pairs
- Precision above 99% for merges
- GTIN not always present
- Explainable merges

## The approach in one paragraph

Start with exact match on GTIN with title fuzzy match fallback. Then earn the move to siamese multimodal encoder with ANN blocking, GBDT pair classifier with attribute conflict features and clustering with transitivity checks, and only if it beats the baseline on Pairwise precision at 99% target and Cluster purity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around GTIN or MPN agreement | Exact or normalised identifier match. Strongest evidence. Guard against: validate check digits. |
| Add Attribute conflict flags | Mismatch in size, colour, pack count. Variant separation. Guard against: parsed attributes only. |
| Add Image embedding similarity | Multimodal similarity. Visual identity. Guard against: normalise backgrounds. |
| Run it as one pipeline | Listing ingestion (catalogue feed), Blocking (ANN and key buckets), Pair scorer (GBDT on embeddings), Attribute conflict checker (parsers) and Cluster builder (correlation clustering), with Merge review and Merge audit off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle bundle vs single item | Pack-quantity extraction as hard constraint. |

**Deliberately not doing**

- Seller name: irrelevant to product identity.
- Listing date: arbitrary.

**How the approach is proven**

Prove it offline on Pairwise precision at 99% target and Cluster purity using time-ordered splits, then online on "Duplicate rate in catalogue" with "Wrong-merge incident count" as the guardrail. Watch for: Positive pairs mined from GTIN only and Test pairs from easy categories.

## Baseline and production design

- **Baseline (build this first):** Exact match on GTIN with title fuzzy match fallback.
- **Production design:** Siamese multimodal encoder with ANN blocking, GBDT pair classifier with attribute conflict features and clustering with transitivity checks.

## Why AI, and why this kind

**Why AI.** Identify identical products across sellers and sources to merge listings, power price comparison and avoid catalogue bloat. The evidence that separates good from bad outcomes (GTIN or MPN agreement, Attribute conflict flags, Image embedding similarity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "all-pairs comparison" are what teams reach for first, and they fail because N-squared cannot scale to 200M items. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Siamese multimodal encoder with ANN blocking, GBDT pair classifier with attribute conflict features and clustering with transitivity checks.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among GTIN or MPN agreement, Attribute conflict flags, Image embedding similarity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Exact match on GTIN with title fuzzy match fallback | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Siamese multimodal encoder with ANN blocking, GBDT pair classifier with attribute conflict features and clustering with transitivity checks | chosen | Meets the run-window envelope at $1.04 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Duplicate rate in catalogue) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Positive pairs mined from GTIN only.
- Evaluation trap: Test pairs from easy categories.
- Bundle vs single item: false merge of different pack sizes.
- Counterfeit listings copy genuine product data: merge corrupts trusted listing.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
