# Document Workflow Classification & Extraction: use-case brief

> Generated from the blueprint `saas/document-workflow-classification-extraction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Document Workflow Classification & Extraction · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify and extract fields from uploaded documents (contracts, forms, invoices) to automate customer workflows. The system has to run interactively, within a few seconds, inside these limits: Per-tenant document types, Few-shot onboarding and Confidence and review loop.

**Why it is hard.** The obvious approach is retrain a model per customer, and it fails because per-customer training doesn't scale. The second trap is in "Review": the real signal is human-in-the-loop on low confidence, while teams usually reach for fully automatic.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $15.7K a month. A mistake is expensive in the way correction rate measures it.

**What success looks like.** Offline: Field-level accuracy and Automation rate at target accuracy. Online: Straight-through processing rate and Correction rate. The launch is judged on "Straight-through processing rate" while "Correction rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify and extract fields from uploaded documents (contracts, forms, invoices) to automate customer workflows.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{class}}+\lambda\,\mathrm{CE}_{\text{fields}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{class}} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |

**Hard constraints**

- Per-tenant document types
- Few-shot onboarding
- Confidence and review loop
- Data isolation

## The approach in one paragraph

Start with template-based extraction per document type. Then earn the move to layout-aware document model with few-shot adapters per tenant, validation rules and review UI feeding active learning, and only if it beats the baseline on Field-level accuracy and Automation rate at target accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Field confidence margin | Calibrated per-field confidence. Routing. Guard against: calibration. |
| Add Layout similarity to exemplars | Embedding of page layout. Template match. Guard against: exemplar set. |
| Add Validation rule pass | Business rules on fields. Correctness. Guard against: rule library. |
| Run it as one pipeline | Upload (app), OCR and layout (document AI), Classifier and extractor (LayoutLM with adapters), Validation rules (business logic), Workflow trigger (automation) and Corrections (active learning), with Review UI off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle customer changes their form template | Template-drift detectors and automatic review spikes. |

**Deliberately not doing**

- File name: none.
- Upload time: none.

**How the approach is proven**

Prove it offline on Field-level accuracy and Automation rate at target accuracy using time-ordered splits, then online on "Straight-through processing rate" with "Correction rate" as the guardrail. Watch for: Test documents from the same templates as training and Counting extractions as correct without validation.

## Baseline and production design

- **Baseline (build this first):** Template-based extraction per document type.
- **Production design:** Layout-aware document model with few-shot adapters per tenant, validation rules and review UI feeding active learning.

## Why AI, and why this kind

**Why AI.** Classify and extract fields from uploaded documents (contracts, forms, invoices) to automate customer workflows. The evidence that separates good from bad outcomes (Field confidence margin, Layout similarity to exemplars, Validation rule pass) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "retrain a model per customer" are what teams reach for first, and they fail because per-customer training doesn't scale. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Layout-aware document model with few-shot adapters per tenant, validation rules and review UI feeding active learning.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Field confidence margin, Layout similarity to exemplars, Validation rule pass and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Template-based extraction per document type | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Layout-aware document model with few-shot adapters per tenant, validation rules and review UI feeding active learning | chosen | Meets the 2500 ms envelope at $0.581 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Straight-through processing rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test documents from the same templates as training.
- Evaluation trap: Counting extractions as correct without validation.
- Customer changes their form template: extraction breaks silently.
- Cross-tenant data mixing in adapters: adapters trained on one tenant leak patterns to another, causing a privacy breach.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
