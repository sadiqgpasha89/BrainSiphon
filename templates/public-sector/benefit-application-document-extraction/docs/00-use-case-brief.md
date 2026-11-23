# Benefit Application Document Extraction: use-case brief

> Generated from the blueprint `public-sector/benefit-application-document-extraction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Benefit Application Document Extraction · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Extract fields from payslips, bank statements, leases and IDs submitted with benefit applications so caseworkers review structured data rather than retyping. The system has to run as a scheduled batch job, inside these limits: Every extracted value links to its place in the image, Caseworker confirms values before use and Low-confidence fields flagged.

**Why it is hard.** The obvious approach is oCR text only, and it fails because oCR can misread digits. The second trap is in "Safety": the real signal is human confirmation, while teams usually reach for auto-fill with no check.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $2.0K a month. A mistake is expensive in the way errors found after processing measures it.

**What success looks like.** Offline: Field accuracy by document type, Calibration and Confirmation edit rate. Online: Data entry time, Errors found after processing and Time to decision. The launch is judged on "Data entry time" while "Errors found after processing" must not get worse.

## Objective, loss and constraints

**Business objective.** Extract fields from payslips, bank statements, leases and IDs submitted with benefit applications so caseworkers review structured data rather than retyping.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Every extracted value links to its place in the image
- Caseworker confirms values before use
- Low-confidence fields flagged
- Documents deleted per retention rules
- 5M documents per year

## The approach in one paragraph

Start with manual typing of documents into the case system, because it is the current process. Then earn the move to a document understanding model with field-level confidence, cross-field checks, a confirmation screen with the source highlight and strict retention, and only if it beats the baseline on Field accuracy by document type and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Field confidence | Confidence per extracted value. Review priority. Guard against: calibrated. |
| Add Document type | The classified document type. Template choice. Guard against: from the classifier. |
| Add Cross-field consistency | Totals and dates agreeing. Error check. Guard against: rules. |
| Run it as one pipeline | Document intake (portal and scanning), Type classification (model), Field extraction (document model), Consistency checks (rules), Caseworker confirmation (case system) and Retention enforcement (storage policy), with Accuracy review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle handwritten forms | Lower confidence and manual entry. |

**Deliberately not doing**

- Applicant name: irrelevant for extraction quality.
- Scan device: an artefact.
- File name: an artefact.

**How the approach is proven**

Prove it offline on Field accuracy by document type, Calibration and Confirmation edit rate using time-ordered splits, then online on "Data entry time" with "Errors found after processing" as the guardrail. Watch for: Auto-fill with no confirmation, Long document retention and OCR-only evaluation.

## Baseline and production design

- **Baseline (build this first):** Manual typing of documents into the case system, because it is the current process.
- **Production design:** A document understanding model with field-level confidence, cross-field checks, a confirmation screen with the source highlight and strict retention.

## Why AI, and why this kind

**Why AI.** Extract fields from payslips, bank statements, leases and IDs submitted with benefit applications so caseworkers review structured data rather than retyping. The evidence that separates good from bad outcomes (Field confidence, Document type, Cross-field consistency) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "OCR text only" are what teams reach for first, and they fail because OCR can misread digits. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A document understanding model with field-level confidence, cross-field checks, a confirmation screen with the source highlight and strict retention.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Field confidence, Document type, Cross-field consistency and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual typing of documents into the case system, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A document understanding model with field-level confidence, cross-field checks, a confirmation screen with the source highlight and strict retention | chosen | Meets the run-window envelope at $0.045 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Data entry time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Auto-fill with no confirmation.
- Evaluation trap: Long document retention.
- Handwritten forms: the model is less accurate.
- Foreign documents: the template is unknown.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
