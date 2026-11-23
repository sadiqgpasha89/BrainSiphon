# Weld and Concrete Defect Inspection: use-case brief

> Generated from the blueprint `engineering/weld-concrete-defect-inspection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Weld and Concrete Defect Inspection · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect defects in weld radiographs, ultrasonic scans and concrete surfaces and rank findings by severity for qualified inspectors to review and decide. The system has to run as a scheduled batch job, inside these limits: Qualified inspector decides acceptance, Defect recall above 98% at the review rate and Findings show images and measurements.

**Why it is hard.** The obvious approach is automated pass marks, and it fails because passes can miss defects. The second trap is in "Cost": the real signal is missing a defect costs more than a recheck, while teams usually reach for equal weights.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.9K a month. A mistake is expensive in the way inspection time measures it.

**What success looks like.** Offline: Defect recall at the review rate, False alert rate and Calibration. Online: Defects found before service, Inspection time and Weld repairs. The launch is judged on "Defects found before service" while "Inspection time" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect defects in weld radiographs, ultrasonic scans and concrete surfaces and rank findings by severity for qualified inspectors to review and decide.

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

- Qualified inspector decides acceptance
- Defect recall above 98% at the review rate
- Findings show images and measurements
- Processing of 10K inspections per year
- Calibrated confidence

## The approach in one paragraph

Start with inspectors reading every image by eye, because it is the standard method. Then earn the move to a detection model that marks candidate defects with measurements, orders the review queue by risk and records inspector decisions for retraining, and only if it beats the baseline on Defect recall at the review rate and False alert rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Defect candidate regions | Cracks, porosity and voids. Core. Guard against: from a vision model. |
| Add Defect size and location | Measurements. Severity. Guard against: from geometry. |
| Add Weld or pour metadata | Process and material. Context. Guard against: from inspection records. |
| Run it as one pipeline | Image acquisition (NDT equipment), Project quality check (rules), Project defect detection (vision model), Severity ranking (model and rules), Decision record (quality system) and Project retraining (quarterly), with Inspector review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle rare defect type | Inspector flag and active learning. |

**Deliberately not doing**

- Inspector name: personal data.
- Scanner brand: weak link.
- File name: an artefact.

**How the approach is proven**

Prove it offline on Defect recall at the review rate, False alert rate and Calibration using time-ordered splits, then online on "Defects found before service" with "Inspection time" as the guardrail. Watch for: Automatic acceptance, Equal error costs and Passes as labels.

## Baseline and production design

- **Baseline (build this first):** Inspectors reading every image by eye, because it is the standard method.
- **Production design:** A detection model that marks candidate defects with measurements, orders the review queue by risk and records inspector decisions for retraining.

## Why AI, and why this kind

**Why AI.** Detect defects in weld radiographs, ultrasonic scans and concrete surfaces and rank findings by severity for qualified inspectors to review and decide. The evidence that separates good from bad outcomes (Defect candidate regions, Defect size and location, Weld or pour metadata) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "automated pass marks" are what teams reach for first, and they fail because passes can miss defects. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A detection model that marks candidate defects with measurements, orders the review queue by risk and records inspector decisions for retraining.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Defect candidate regions, Defect size and location, Weld or pour metadata and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Inspectors reading every image by eye, because it is the standard method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A detection model that marks candidate defects with measurements, orders the review queue by risk and records inspector decisions for retraining | chosen | Meets the run-window envelope at $0.071 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Defects found before service) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Automatic acceptance.
- Evaluation trap: Equal error costs.
- Rare defect type: the type has few examples.
- Complex geometry: access limits the scan.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
