# Genomic Variant Pathogenicity Classification: use-case brief

> Generated from the blueprint `healthcare/genomic-variant-pathogenicity-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Genomic Variant Pathogenicity Classification · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify variants of uncertain significance with calibrated evidence under ACMG guidelines to speed diagnostic reporting. The system has to run as a scheduled batch job, inside these limits: Clinical-grade reproducibility, ACMG evidence mapping and Ancestry-aware allele frequencies.

**Why it is hard.** The obvious approach is global allele frequency only, and it fails because variants common in one ancestry are mislabelled rare. The second trap is in "Circularity": the real signal is separate training sets from evidence used in prediction, while teams usually reach for using ClinVar labels with ClinVar-derived features.

**Scale and stakes.** At 10 million users this is about 150 model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.9K a month. A mistake is expensive in the way time to report measures it.

**What success looks like.** Offline: Calibration against expert classifications and AUROC by gene. Online: VUS rate and Time to report. The launch is judged on "VUS rate" while "Time to report" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify variants of uncertain significance with calibrated evidence under ACMG guidelines to speed diagnostic reporting.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{EvidenceCalibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{EvidenceCalibration} | Penalty when predicted pathogenicity probabilities do not match the strength of clinical evidence categories. |

**Hard constraints**

- Clinical-grade reproducibility
- ACMG evidence mapping
- Ancestry-aware allele frequencies
- Curator sign-off

## The approach in one paragraph

Start with aCMG rule-based classification. Then earn the move to calibrated ensemble of conservation, structure and population features mapped to ACMG evidence strength, with curator workflow, and only if it beats the baseline on Calibration against expert classifications and AUROC by gene after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Population allele frequency | GnomAD frequency by ancestry. Rarity evidence. Guard against: frequency database version. |
| Add Conservation and structure scores | Evolutionary conservation, AlphaFold-based features. Functional impact. Guard against: tool version. |
| Add Gene-level constraint | LOEUF or missense constraint. Gene tolerance. Guard against: version. |
| Run it as one pipeline | VCF intake (pipeline), Annotation (VEP), Feature store (versioned annotations), Pathogenicity model (calibrated ensemble), ACMG evidence mapper (rules) and ClinVar submission (feedback), with Curator review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle database version update changes frequencies | Versioned annotations and reclassification alerts. |

**Deliberately not doing**

- Variant rsID text: identifier.
- Submitter name: label provenance.

**How the approach is proven**

Prove it offline on Calibration against expert classifications and AUROC by gene using time-ordered splits, then online on "VUS rate" with "Time to report" as the guardrail. Watch for: Gene-level leakage between train and test and Circular training labels.

## Baseline and production design

- **Baseline (build this first):** ACMG rule-based classification.
- **Production design:** Calibrated ensemble of conservation, structure and population features mapped to ACMG evidence strength, with curator workflow.

## Why AI, and why this kind

**Why AI.** Classify variants of uncertain significance with calibrated evidence under ACMG guidelines to speed diagnostic reporting. The evidence that separates good from bad outcomes (Population allele frequency, Conservation and structure scores, Gene-level constraint) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "global allele frequency only" are what teams reach for first, and they fail because variants common in one ancestry are mislabelled rare. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Calibrated ensemble of conservation, structure and population features mapped to ACMG evidence strength, with curator workflow.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Population allele frequency, Conservation and structure scores, Gene-level constraint and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: ACMG rule-based classification | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Calibrated ensemble of conservation, structure and population features mapped to ACMG evidence strength, with curator workflow | chosen | Meets the run-window envelope at $411.51 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (VUS rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Gene-level leakage between train and test.
- Evaluation trap: Circular training labels.
- Database version update changes frequencies: reclassification of reported variants.
- Under-represented ancestry: inflated pathogenic calls.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
