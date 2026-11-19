# Catalogue Attribute Extraction with LLMs: use-case brief

> Generated from the blueprint `retail/product-catalog-attribute-extraction-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Catalogue Attribute Extraction with LLMs · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Fill and normalise product attributes (size, material, compatibility) from titles, descriptions and images to power search, filters and recommendations. The system has to run as a scheduled batch job, inside these limits: Strict JSON schema output, 200M products and Human audit sampling.

**Why it is hard.** The obvious approach is free-form extraction, and it fails because free text creates unlimited attribute spellings. The second trap is in "Cost": the real signal is distilled small model for the long tail with LLM for hard items, while teams usually reach for one large LLM for everything.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 1 at peak, at an estimated $1.9K a month. A mistake is expensive in the way search conversion in enriched categories measures it.

**What success looks like.** Offline: Attribute-level F1 and Schema violation rate. Online: Filter coverage and Search conversion in enriched categories. The launch is judged on "Filter coverage" while "Search conversion in enriched categories" must not get worse.

## Objective, loss and constraints

**Business objective.** Fill and normalise product attributes (size, material, compatibility) from titles, descriptions and images to power search, filters and recommendations.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{token}}+\lambda\,\mathrm{SchemaViolation}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{token}} | Cross-entropy for labelling each token with the attribute it belongs to. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{SchemaViolation} | Penalty when the extracted values do not fit the catalogue schema (wrong type or an invalid unit). |

**Hard constraints**

- Strict JSON schema output
- 200M products
- Human audit sampling
- Cost per item under a fraction of a cent

## The approach in one paragraph

Start with regex and dictionary extraction. Then earn the move to teacher LLM labels distil to a small seq2seq/VLM model with schema-constrained decoding; low-confidence items go to LLM and human audit, and only if it beats the baseline on Attribute-level F1 and Schema violation rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Extraction confidence calibration | Agreement across self-consistency samples. Routing to review. Guard against: calibrate per attribute. |
| Add Image-text agreement | VLM attribute vs text attribute. Detects errors. Guard against: image quality gating. |
| Add Attribute coverage lift | Search filter coverage after enrichment. Business value. Guard against: compare vs control categories. |
| Run it as one pipeline | Catalogue change feed (CDC), Pre-filter and normaliser (text cleaning), Student extractor (distilled model), Schema validator (taxonomy check) and Catalogue writer (idempotent update), with Escalation LLM and Audit sampling off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for labelling each token with the attribute it belongs to, so the model is trained on the cost of the decision and not on a generic score. |
| Handle seller changes title after approval | Change-triggered re-extraction. |

**Deliberately not doing**

- Marketing adjectives: not attributes.
- Seller keywords: spam.

**How the approach is proven**

Prove it offline on Attribute-level F1 and Schema violation rate using time-ordered splits, then online on "Filter coverage" with "Search conversion in enriched categories" as the guardrail. Watch for: Gold set from easy categories and Evaluating only exact string matches.

## Baseline and production design

- **Baseline (build this first):** Regex and dictionary extraction.
- **Production design:** Teacher LLM labels distil to a small seq2seq/VLM model with schema-constrained decoding; low-confidence items go to LLM and human audit.

## Why AI, and why this kind

**Why AI.** Fill and normalise product attributes (size, material, compatibility) from titles, descriptions and images to power search, filters and recommendations. The evidence that separates good from bad outcomes (Extraction confidence calibration, Image-text agreement, Attribute coverage lift) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free-form extraction" are what teams reach for first, and they fail because free text creates unlimited attribute spellings. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Teacher LLM labels distil to a small seq2seq/VLM model with schema-constrained decoding; low-confidence items go to LLM and human audit.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Extraction confidence calibration, Image-text agreement, Attribute coverage lift and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Regex and dictionary extraction | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Teacher LLM labels distil to a small seq2seq/VLM model with schema-constrained decoding; low-confidence items go to LLM and human audit | chosen | Meets the run-window envelope at $1.04 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Filter coverage) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Gold set from easy categories.
- Evaluation trap: Evaluating only exact string matches.
- Seller changes title after approval: stale attributes.
- New category not in taxonomy: forced into wrong values.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
