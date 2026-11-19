# Visual Search & Shop-the-Look: use-case brief

> Generated from the blueprint `retail/visual-search-shop-the-look` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Visual Search & Shop-the-Look · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Let shoppers photograph or upload an image and retrieve visually matching sellable items, including per-garment matches in a scene. The system has to run in under 100 milliseconds, inside these limits: 100 ms end-to-end including detection, Index of 200M images and Safe-content filtering.

**Why it is hard.** The obvious approach is catalogue-only contrastive training, and it fails because studio photos look nothing like phone photos. The second trap is in "Granularity": the real signal is detect and crop each garment before embedding, while teams usually reach for whole-image embedding.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $28.5K a month. A mistake is expensive in the way search sessions per user measures it.

**What success looks like.** Offline: Recall@10 on user-photo query set and Attribute accuracy of top results. Online: Visual search conversion and Search sessions per user. The launch is judged on "Visual search conversion" while "Search sessions per user" must not get worse.

## Objective, loss and constraints

**Business objective.** Let shoppers photograph or upload an image and retrieve visually matching sellable items, including per-garment matches in a scene.

**Training objective.** `\mathcal{L}=\mathrm{Triplet}(f(a),f(p),f(n))+\lambda\,\mathcal{L}_{\text{det}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Triplet} | Triplet loss: requires an anchor to be closer to a matching example than to a non-matching one by a margin. |
| f | The embedding network: f(a), f(p), f(n) are the embeddings of anchor, positive and negative images. |
| a | The anchor: the query image. |
| p | The positive: an image of the same or a matching product. |
| n | The negative: an image of a different product. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathcal{L}_{\text{det}} | Detection loss: how well items in the image are found and boxed. |

**Hard constraints**

- 100 ms end-to-end including detection
- Index of 200M images
- Safe-content filtering
- Mobile bandwidth

## The approach in one paragraph

Start with whole-image CNN embeddings with ANN retrieval. Then earn the move to detector plus metric-learning embeddings (ViT) with domain-adapted pairs, HNSW/IVF-PQ index sharded across nodes, attribute re-rank, and only if it beats the baseline on Recall@10 on user-photo query set and Attribute accuracy of top results after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Garment crop embedding | Embedding of detected item crops. Per-item matching. Guard against: crop quality gates. |
| Add Attribute classifier agreement | Colour, pattern and category predictions. Re-ranking filter. Guard against: taxonomy aligned with catalogue. |
| Add Availability and size in stock | Live inventory signal. Business viability. Guard against: real-time inventory join. |
| Run it as one pipeline | Image upload (mobile SDK), Detector and cropper (YOLO on GPU), Embedding model (ViT on GPU), ANN search (sharded IVF-PQ), Attribute re-ranker (lightweight model), Inventory filter (stock service) and Interaction logs (analytics). |
| Optimise the right thing | The objective weighs triplet loss: requires an anchor to be closer to a matching example than to a non-matching one by a margin, so the model is trained on the cost of the decision and not on a generic score. |
| Handle index refresh lags new arrivals | Streaming index updates with delta shards. |

**Deliberately not doing**

- Image EXIF: irrelevant and privacy-sensitive.
- Background texture: distracts embeddings.

**How the approach is proven**

Prove it offline on Recall@10 on user-photo query set and Attribute accuracy of top results using time-ordered splits, then online on "Visual search conversion" with "Search sessions per user" as the guardrail. Watch for: Query set built from catalogue crops and Embedding drift after retrain unnoticed.

## Baseline and production design

- **Baseline (build this first):** Whole-image CNN embeddings with ANN retrieval.
- **Production design:** Detector plus metric-learning embeddings (ViT) with domain-adapted pairs, HNSW/IVF-PQ index sharded across nodes, attribute re-rank.

## Why AI, and why this kind

**Why AI.** Let shoppers photograph or upload an image and retrieve visually matching sellable items, including per-garment matches in a scene. The evidence that separates good from bad outcomes (Garment crop embedding, Attribute classifier agreement, Availability and size in stock) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "catalogue-only contrastive training" are what teams reach for first, and they fail because studio photos look nothing like phone photos. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Detector plus metric-learning embeddings (ViT) with domain-adapted pairs, HNSW/IVF-PQ index sharded across nodes, attribute re-rank.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Garment crop embedding, Attribute classifier agreement, Availability and size in stock and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Whole-image CNN embeddings with ANN retrieval | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Detector plus metric-learning embeddings (ViT) with domain-adapted pairs, HNSW/IVF-PQ index sharded across nodes, attribute re-rank | chosen | Meets the 80 ms envelope at $0.317 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Visual search conversion) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Query set built from catalogue crops.
- Evaluation trap: Embedding drift after retrain unnoticed.
- Index refresh lags new arrivals: new products not findable.
- Adult or unsafe uploaded image: unsafe user uploads are embedded and surfaced, creating policy and brand risk.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
