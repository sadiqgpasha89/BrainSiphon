# Duplicate Listing Detection Across Portals: use-case brief

> Generated from the blueprint `real-estate/duplicate-listing-detection-across-portals` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Duplicate Listing Detection Across Portals · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify the same property listed by several agents and portals so search shows one entry and statistics count it once. The system has to run as a scheduled batch job, inside these limits: A false merge is treated as worse than a missed duplicate, Every merged listing keeps links to its source portals and Runs daily across all feeds in a fixed window.

**Why it is hard.** The obvious approach is text similarity of descriptions, and it fails because agents rewrite descriptions for each portal, so the same home reads very differently. The second trap is in "Merge": the real signal is a conservative merge that needs agreement of several independent signals, while teams usually reach for an aggressive merge on a single strong signal.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $3.8K a month. A mistake is expensive in the way complaints measures it.

**What success looks like.** Offline: Pair F1 and Cluster purity. Online: Duplicate rate in search and Complaints. The launch is judged on "Duplicate rate in search" while "Complaints" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify the same property listed by several agents and portals so search shows one entry and statistics count it once.

**Training objective.** `\mathcal{L}=\mathrm{Contrastive}(z_i,z_j)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Contrastive} | Contrastive loss: pulls similar items together and pushes dissimilar items apart in embedding space. |
| z_i | The embedding of listing i (z_j for listing j); pairs of the same property are pulled close together. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |

**Hard constraints**

- A false merge is treated as worse than a missed duplicate
- Every merged listing keeps links to its source portals
- Runs daily across all feeds in a fixed window
- Each match comes with the evidence that supports it

## The approach in one paragraph

Start with exact match on normalised address and price, because it is simple. Then earn the move to blocking, pairwise matching with address, image and attribute features, and graph clustering with merge constraints, and only if it beats the baseline on Pair F1 and Cluster purity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Address match | Normalised and geocoded address equality with unit number retained. The strongest single identity signal. Guard against: formats differ between portals, so normalise before comparing. |
| Add Image hash similarity | Smallest perceptual-hash distance between any pair of photos across two listings. The same photos are reused across portals. Guard against: re-edited and cropped images change the hash, so back it with an embedding match. |
| Add Price and size agreement | Relative difference in asking price and in floor area against a tolerance. Supports an identity match. Guard against: prices change between portals within days, so use a tolerance not equality. |
| Run it as one pipeline | Listing feeds (portal ingestion), Blocking (geo and address keys), Pair features (similarity functions), Match model (gradient boosting), Cluster builder (graph components) and Canonical store (database), with Merge review off the critical path. |
| Optimise the right thing | The objective weighs contrastive loss: pulls similar items together and pushes dissimilar items apart in embedding space, so the model is trained on the cost of the decision and not on a generic score. |
| Handle two units same address | Include the unit number and floor in the identity key and merge only on unit-level evidence. |

**Deliberately not doing**

- Listing ID: An arbitrary key assigned by each portal that cannot match across portals.
- Description order: Sentence order varies with templates and has no bearing on identity.
- Photo count: Differs between portals because of upload limits and not between homes.

**How the approach is proven**

Prove it offline on Pair F1 and Cluster purity using time-ordered splits, then online on "Duplicate rate in search" with "Complaints" as the guardrail. Watch for: Labelled pairs are easy cases chosen by reviewers, so the test overstates accuracy on hard pairs and The same agents and addresses in train and test leak identity information.

## Baseline and production design

- **Baseline (build this first):** Exact match on normalised address and price, because it is simple.
- **Production design:** Blocking, pairwise matching with address, image and attribute features, and graph clustering with merge constraints.

## Why AI, and why this kind

**Why AI.** Identify the same property listed by several agents and portals so search shows one entry and statistics count it once. The evidence that separates good from bad outcomes (Address match, Image hash similarity, Price and size agreement) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "text similarity of descriptions" are what teams reach for first, and they fail because agents rewrite descriptions for each portal, so the same home reads very differently. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Blocking, pairwise matching with address, image and attribute features, and graph clustering with merge constraints.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Address match, Image hash similarity, Price and size agreement and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Exact match on normalised address and price, because it is simple | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Blocking, pairwise matching with address, image and attribute features, and graph clustering with merge constraints | chosen | Meets the run-window envelope at $0.042 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Duplicate rate in search) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labelled pairs are easy cases chosen by reviewers, so the test overstates accuracy on hard pairs.
- Evaluation trap: The same agents and addresses in train and test leak identity information.
- Two units same address: several apartments share one address and are merged into one listing.
- Re-listed property: a property is withdrawn and re-listed some weeks later and is treated as new.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
