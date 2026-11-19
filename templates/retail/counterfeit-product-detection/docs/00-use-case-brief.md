# Counterfeit Product Detection: use-case brief

> Generated from the blueprint `retail/counterfeit-product-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Counterfeit Product Detection · **Domain:** retail · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find counterfeit listings using images, text, price and seller signals, supporting brand-owner takedowns with strong evidence. The system has to run as a scheduled batch job, inside these limits: Brand-owner evidence packs, Fast takedown of new fakes and Low false takedowns of genuine resellers.

**Why it is hard.** The obvious approach is generic fake classifier, and it fails because generic models don't know a brand's logo detail. The second trap is in "Price": the real signal is price far below authorised-channel floor, while teams usually reach for price alone.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $2.4K a month. A mistake is expensive in the way brand complaints measures it.

**What success looks like.** Offline: Precision and recall per brand and Evidence pack acceptance by brands. Online: Counterfeit listing prevalence and Brand complaints. The launch is judged on "Counterfeit listing prevalence" while "Brand complaints" must not get worse.

## Objective, loss and constraints

**Business objective.** Find counterfeit listings using images, text, price and seller signals, supporting brand-owner takedowns with strong evidence.

**Training objective.** `\mathcal{L}=\mathrm{BCE}+\lambda\,\mathrm{Contrastive}(\text{genuine},\text{fake})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy on whether a listing is counterfeit. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Contrastive} | Contrastive loss: pulls similar items together and pushes dissimilar items apart in embedding space. |
| \text{genuine} | An embedding of a genuine product listing. |
| \text{fake} | An embedding of a counterfeit listing, pushed away from genuine ones. |

**Hard constraints**

- Brand-owner evidence packs
- Fast takedown of new fakes
- Low false takedowns of genuine resellers
- Per-brand models

## The approach in one paragraph

Start with keyword and price-threshold rules per brand. Then earn the move to per-brand fine-grained vision models and multimodal classifier with seller risk features, evidence pack generator and brand feedback loop, and only if it beats the baseline on Precision and recall per brand and Evidence pack acceptance by brands after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Logo and tag fidelity | Fine-grained logo similarity to brand references. Visual authenticity. Guard against: reference set curated by brand. |
| Add Price-to-MSRP ratio | Price divided by MSRP floor. Economic signal. Guard against: mSRP as-of. |
| Add Seller risk and authorised flag | Authorisation status and history. Contextual. Guard against: brand-provided lists. |
| Run it as one pipeline | Listing ingestion (catalogue stream), Brand matcher (text and logo model), Fine-grained authenticity model (ViT per brand), Seller risk features (graph store) and Takedown scorer (GBDT), with Brand liaison review and Brand feedback off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy on whether a listing is counterfeit, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new fake variant evades model | Fast active-learning loop using brand confirmations. |

**Deliberately not doing**

- Listing language: uninformative.
- Image resolution: seller-device.

**How the approach is proven**

Prove it offline on Precision and recall per brand and Evidence pack acceptance by brands using time-ordered splits, then online on "Counterfeit listing prevalence" with "Brand complaints" as the guardrail. Watch for: Fakes in training from easy known sellers and Brand references differ from real packaging.

## Baseline and production design

- **Baseline (build this first):** Keyword and price-threshold rules per brand.
- **Production design:** Per-brand fine-grained vision models and multimodal classifier with seller risk features, evidence pack generator and brand feedback loop.

## Why AI, and why this kind

**Why AI.** Find counterfeit listings using images, text, price and seller signals, supporting brand-owner takedowns with strong evidence. The evidence that separates good from bad outcomes (Logo and tag fidelity, Price-to-MSRP ratio, Seller risk and authorised flag) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "generic fake classifier" are what teams reach for first, and they fail because generic models don't know a brand's logo detail. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Per-brand fine-grained vision models and multimodal classifier with seller risk features, evidence pack generator and brand feedback loop.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Logo and tag fidelity, Price-to-MSRP ratio, Seller risk and authorised flag and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword and price-threshold rules per brand | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Per-brand fine-grained vision models and multimodal classifier with seller risk features, evidence pack generator and brand feedback loop | chosen | Meets the run-window envelope at $0.540 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Counterfeit listing prevalence) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Fakes in training from easy known sellers.
- Evaluation trap: Brand references differ from real packaging.
- New fake variant evades model: recall collapses.
- Parallel-import genuine goods: genuine grey-market goods are flagged as fakes and wrongly taken down.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
