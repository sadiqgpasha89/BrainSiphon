# Mortgage Underwriting Document Automation: use-case brief

> Generated from the blueprint `bfsi/mortgage-underwriting-document-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Mortgage Underwriting Document Automation · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify, extract and cross-check the documents in a mortgage file (payslips, bank statements, tax returns, ID, valuation) so underwriters review exceptions instead of retyping fields. The system has to run interactively, within a few seconds, inside these limits: Every extracted field links to its source page and box, Income and identity fields never auto-accepted below the audit-agreed confidence and Applicant data stays inside the bank tenancy.

**Why it is hard.** The obvious approach is extracting every printed field on the page, and it fails because wide extraction raises error surface while the decision uses ten fields. The second trap is in "Consistency": the real signal is cross-document checks: payslip net pay against the bank statement credit, while teams usually reach for judging each document alone.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $13.9K a month. A mistake is expensive in the way straight-through documents with no manual correction measures it.

**What success looks like.** Offline: Field-level exact match per field type and Document classification macro-F1. Online: Underwriter minutes per file and Straight-through documents with no manual correction. The launch is judged on "Underwriter minutes per file" while "Straight-through documents with no manual correction" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify, extract and cross-check the documents in a mortgage file (payslips, bank statements, tax returns, ID, valuation) so underwriters review exceptions instead of retyping fields.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{det}}+\mathcal{L}_{\text{CTC}}+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{det}} | Detection loss: how well objects are found and their boxes placed. |
| \mathcal{L}_{\text{CTC}} | Connectionist temporal classification loss: aligns a signal such as audio or a line image with its text without frame-by-frame labels. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |

**Hard constraints**

- Every extracted field links to its source page and box
- Income and identity fields never auto-accepted below the audit-agreed confidence
- Applicant data stays inside the bank tenancy
- Decision turnaround under 2 minutes per document pack

## The approach in one paragraph

Start with template-based OCR with regex validation and a manual queue for failures, because it is auditable and sets the cost floor. Then earn the move to layout-aware transformer for classification and extraction with calibrated field confidence, plus deterministic cross-document reconciliation rules and an underwriter exception queue, and only if it beats the baseline on Field-level exact match per field type and Document classification macro-F1 after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Net pay to statement credit match | Absolute difference between payslip net pay and matched salary credit within 3 days of pay date. Genuine income reconciles, edited documents rarely do. Guard against: matching window must use document dates, not upload dates. |
| Add Document tamper score | Font, compression and metadata inconsistency score per page. Edited PDFs carry editing artefacts. Guard against: scanner and phone-camera files must not be scored against born-digital files. |
| Add Field confidence margin | Gap between top and second extraction hypothesis per field. Low margin predicts needed review. Guard against: margin must come from a calibrated model, not raw softmax. |
| Run it as one pipeline | Broker upload API (API gateway with virus scan), Document classifier (layout transformer), Field extractor (LayoutLM-style model on GPU), Cross-document reconciler (rules engine) and Tamper checker (image forensic model), with Underwriter review queue and Extraction audit log off the critical path. |
| Optimise the right thing | The objective weighs detection loss: how well objects are found and their boxes placed, so the model is trained on the cost of the decision and not on a generic score. |
| Handle phone photo of a payslip | De-skew and glare detection with a re-upload request when quality is below the threshold. |

**Deliberately not doing**

- Page count of the pack: depends on the applicant's scanner and not on credit quality.
- File name: set by the broker and changes between submissions.
- Postcode of the applicant: proxy risk in a document task, adds nothing to extraction.

**How the approach is proven**

Prove it offline on Field-level exact match per field type and Document classification macro-F1 using time-ordered splits, then online on "Underwriter minutes per file" with "Straight-through documents with no manual correction" as the guardrail. Watch for: Test files from the same broker as training inflate extraction accuracy and Synthetic payslips are cleaner than real phone photos.

## Baseline and production design

- **Baseline (build this first):** Template-based OCR with regex validation and a manual queue for failures, because it is auditable and sets the cost floor.
- **Production design:** Layout-aware transformer for classification and extraction with calibrated field confidence, plus deterministic cross-document reconciliation rules and an underwriter exception queue.

## Why AI, and why this kind

**Why AI.** Classify, extract and cross-check the documents in a mortgage file (payslips, bank statements, tax returns, ID, valuation) so underwriters review exceptions instead of retyping fields. The evidence that separates good from bad outcomes (Net pay to statement credit match, Document tamper score, Field confidence margin) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "extracting every printed field on the page" are what teams reach for first, and they fail because wide extraction raises error surface while the decision uses ten fields. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Layout-aware transformer for classification and extraction with calibrated field confidence, plus deterministic cross-document reconciliation rules and an underwriter exception queue.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Net pay to statement credit match, Document tamper score, Field confidence margin and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Template-based OCR with regex validation and a manual queue for failures, because it is auditable and sets the cost floor | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Layout-aware transformer for classification and extraction with calibrated field confidence, plus deterministic cross-document reconciliation rules and an underwriter exception queue | chosen | Meets the 2500 ms envelope at $3.10 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Underwriter minutes per file) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test files from the same broker as training inflate extraction accuracy.
- Evaluation trap: Synthetic payslips are cleaner than real phone photos.
- Phone photo of a payslip: skew, glare and shadows break the field boxes.
- Multi-employer applicant: income lines from two payslips are summed or overwritten.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
