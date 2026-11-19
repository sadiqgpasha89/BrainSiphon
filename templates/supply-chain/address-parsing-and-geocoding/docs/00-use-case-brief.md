# Address Parsing & Geocoding: use-case brief

> Generated from the blueprint `supply-chain/address-parsing-and-geocoding` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Address Parsing & Geocoding · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Convert messy free-text addresses into structured, geocoded locations with confidence for routing and delivery. The system has to run in under 100 milliseconds, inside these limits: Multi-script addresses, 30 ms and Landmark-based addressing.

**Why it is hard.** The obvious approach is direct string to coordinates, and it fails because components allow validation and fallback. The second trap is in "Confidence": the real signal is geocode confidence and area uncertainty, while teams usually reach for single coordinate.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $12.3K a month. A mistake is expensive in the way time spent searching for the address measures it.

**What success looks like.** Offline: Component F1 and Geocode error percentile distances. Online: Failed delivery due to address and Time spent searching for the address. The launch is judged on "Failed delivery due to address" while "Time spent searching for the address" must not get worse.

## Objective, loss and constraints

**Business objective.** Convert messy free-text addresses into structured, geocoded locations with confidence for routing and delivery.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{BIO}}+\lambda\,\mathrm{Haversine}(\hat x,x)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{BIO}} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Haversine} | Haversine distance: the great-circle distance between two latitude and longitude points. |
| \hat{x} | The reconstruction of the input x produced by the decoder. |
| x | The input features describing one example (what the model sees). |

**Hard constraints**

- Multi-script addresses
- 30 ms
- Landmark-based addressing
- Privacy

## The approach in one paragraph

Start with regex address parser and commercial geocoder. Then earn the move to transformer tagger with gazetteer retrieval, delivery-trace-informed geocoding corrections and uncertainty polygons, and only if it beats the baseline on Component F1 and Geocode error percentile distances after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Component tags | Locality, street, landmark. Structure. Guard against: tagging. |
| Add Gazetteer match score | Fuzzy match to locality database. Disambiguation. Guard against: database version. |
| Add Delivery-trace correction | GPS where drivers actually stopped. Ground truth. Guard against: outlier filter. |
| Run it as one pipeline | Address input (checkout), Normaliser (transliteration), Tagger (transformer), Gazetteer matcher (ANN), Geocode refiner (trace model) and Confidence policy (rules), with Correction feedback off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new development absent from gazetteer | Trace learning and landmark text support. |

**Deliberately not doing**

- Order time: none.
- Customer name: none.

**How the approach is proven**

Prove it offline on Component F1 and Geocode error percentile distances using time-ordered splits, then online on "Failed delivery due to address" with "Time spent searching for the address" as the guardrail. Watch for: Test set with clean addresses and Using geocoder output as labels.

## Baseline and production design

- **Baseline (build this first):** Regex address parser and commercial geocoder.
- **Production design:** Transformer tagger with gazetteer retrieval, delivery-trace-informed geocoding corrections and uncertainty polygons.

## Why AI, and why this kind

**Why AI.** Convert messy free-text addresses into structured, geocoded locations with confidence for routing and delivery. The evidence that separates good from bad outcomes (Component tags, Gazetteer match score, Delivery-trace correction) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "direct string to coordinates" are what teams reach for first, and they fail because components allow validation and fallback. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Transformer tagger with gazetteer retrieval, delivery-trace-informed geocoding corrections and uncertainty polygons.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Component tags, Gazetteer match score, Delivery-trace correction and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Regex address parser and commercial geocoder | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Transformer tagger with gazetteer retrieval, delivery-trace-informed geocoding corrections and uncertainty polygons | chosen | Meets the 80 ms envelope at $0.068 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Failed delivery due to address) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test set with clean addresses.
- Evaluation trap: Using geocoder output as labels.
- New development absent from gazetteer: new housing areas are missing from the gazetteer so geocodes land on the wrong centroid.
- Duplicate locality names: mismatched region.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
