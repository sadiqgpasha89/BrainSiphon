# Financial Document & Invoice Extraction: use-case brief

> Generated from the blueprint `fintech/financial-document-extraction-invoices` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Financial Document & Invoice Extraction · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Extract line items, totals and tax from invoices, receipts and statements with 98% field accuracy and straight-through processing above 70%. The system has to run interactively, within a few seconds, inside these limits: Support 40 languages, Totals must reconcile and Under 5 s per document.

**Why it is hard.** The obvious approach is per-token OCR confidence, and it fails because a confident wrong digit is worse than a low-confidence right one. The second trap is in "Layout": the real signal is layout-aware models using position and structure, while teams usually reach for plain text OCR to LLM.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $19.9K a month. A mistake is expensive in the way posting error rate measures it.

**What success looks like.** Offline: Field-level exact match and Straight-through rate at 99% precision. Online: Cost per processed document and Posting error rate. The launch is judged on "Cost per processed document" while "Posting error rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Extract line items, totals and tax from invoices, receipts and statements with 98% field accuracy and straight-through processing above 70%.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{token}}+\lambda\,\mathrm{ArithmeticConsistency}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{token}} | Cross-entropy on labelling each token with the right field (amount, date, vendor). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ArithmeticConsistency} | Penalty when extracted line items do not add up to the extracted total. |

**Hard constraints**

- Support 40 languages
- Totals must reconcile
- Under 5 s per document
- Audit trail of extractions

## The approach in one paragraph

Start with oCR plus regex templates per vendor. Then earn the move to layoutLMv3 or document-VLM with constrained decoding to a JSON schema, validation rules, and active learning on human corrections, and only if it beats the baseline on Field-level exact match and Straight-through rate at 99% precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Subtotal-tax-total identity | Sum of lines times tax rate versus total. Catches misread digits. Guard against: rounding rules per currency. |
| Add Vendor template memory | Per-vendor field position priors. Repeated layouts extract better. Guard against: template drift when vendors redesign. |
| Add Field confidence margin | Calibrated probability of top candidate versus runner-up. Routes ambiguous fields. Guard against: calibrate per field type. |
| Run it as one pipeline | Upload intake (email and API), Image cleanup (deskew and denoise), Layout extractor (document VLM), Validation engine (arithmetic rules) and ERP posting (idempotent API), with Exception queue and Correction feedback off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy on labelling each token with the right field (amount, date, vendor), so the model is trained on the cost of the decision and not on a generic score. |
| Handle handwritten annotations over printed totals | Detect overwrites and route to human. |

**Deliberately not doing**

- Logo detection: not an extraction target.
- Document colour: irrelevant to fields.

**How the approach is proven**

Prove it offline on Field-level exact match and Straight-through rate at 99% precision using time-ordered splits, then online on "Cost per processed document" with "Posting error rate" as the guardrail. Watch for: Test set from the same vendors as train and STP counted without downstream error audit.

## Baseline and production design

- **Baseline (build this first):** OCR plus regex templates per vendor.
- **Production design:** LayoutLMv3 or document-VLM with constrained decoding to a JSON schema, validation rules, and active learning on human corrections.

## Why AI, and why this kind

**Why AI.** Extract line items, totals and tax from invoices, receipts and statements with 98% field accuracy and straight-through processing above 70%. The evidence that separates good from bad outcomes (Subtotal-tax-total identity, Vendor template memory, Field confidence margin) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "per-token OCR confidence" are what teams reach for first, and they fail because A confident wrong digit is worse than a low-confidence right one. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: LayoutLMv3 or document-VLM with constrained decoding to a JSON schema, validation rules, and active learning on human corrections.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Subtotal-tax-total identity, Vendor template memory, Field confidence margin and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: OCR plus regex templates per vendor | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| LayoutLMv3 or document-VLM with constrained decoding to a JSON schema, validation rules, and active learning on human corrections | chosen | Meets the 2500 ms envelope at $0.443 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cost per processed document) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test set from the same vendors as train.
- Evaluation trap: STP counted without downstream error audit.
- Handwritten annotations over printed totals: totals mis-extracted.
- Multi-currency invoice: wrong tax rule applied.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
