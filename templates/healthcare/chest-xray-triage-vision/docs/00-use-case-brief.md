# Chest X-Ray Triage: use-case brief

> Generated from the blueprint `healthcare/chest-xray-triage-vision` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Chest X-Ray Triage · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Prioritise radiology worklists by flagging critical findings (pneumothorax, large effusion) on chest radiographs within seconds of acquisition. The system has to run interactively, within a few seconds, inside these limits: Regulatory clearance as SaMD, Sensitivity above 95% for critical classes and DICOM-native integration.

**Why it is hard.** The obvious approach is balanced test sets, and it fails because balanced sets overstate positive predictive value. The second trap is in "Shortcuts": the real signal is detect confounders such as tubes, markers and portable machines, while teams usually reach for overall AUC.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $28.5K a month. A mistake is expensive in the way missed critical findings measures it.

**What success looks like.** Offline: Sensitivity at fixed specificity per site and Calibration at deployment prevalence. Online: Time to report for critical findings and Missed critical findings. The launch is judged on "Time to report for critical findings" while "Missed critical findings" must not get worse.

## Objective, loss and constraints

**Business objective.** Prioritise radiology worklists by flagging critical findings (pneumothorax, large effusion) on chest radiographs within seconds of acquisition.

**Training objective.** `\mathcal{L}=\sum_k w_k\,\mathrm{BCE}(y_k,p_k)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_k | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_k | A weight that scales how much a particular example, class or term counts in the loss. (one value per class or label k) |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y_k | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per class or label k) |
| p_k | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per class or label k) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Regulatory clearance as SaMD
- Sensitivity above 95% for critical classes
- DICOM-native integration
- Multi-vendor scanners

## The approach in one paragraph

Start with radiologist first-in-first-out reading. Then earn the move to denseNet/ViT multi-label model fine-tuned across multi-site data with test-time calibration, DICOM routing and worklist re-prioritisation, and only if it beats the baseline on Sensitivity at fixed specificity per site and Calibration at deployment prevalence after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Finding probability per class | Multi-label probabilities. Triage priority. Guard against: calibrated per site. |
| Add Image quality score | Positioning and exposure adequacy. Reliability. Guard against: apply before inference. |
| Add Prior comparison change | Difference from prior study. Acute vs chronic. Guard against: prior must be before exam. |
| Run it as one pipeline | DICOM receiver (PACS gateway), Quality gate (view check), Findings model (ViT on GPU), Calibration and thresholds (per-site), Worklist prioritiser (RIS integration) and Radiologist reading (human), with Discrepancy feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new scanner vendor | Site onboarding validation and domain-adaptive calibration. |

**Deliberately not doing**

- Patient age in pixels metadata: shortcut feature.
- Scanner manufacturer: domain artefact.

**How the approach is proven**

Prove it offline on Sensitivity at fixed specificity per site and Calibration at deployment prevalence using time-ordered splits, then online on "Time to report for critical findings" with "Missed critical findings" as the guardrail. Watch for: Single-site training and testing and Labels extracted from reports with NLP errors.

## Baseline and production design

- **Baseline (build this first):** Radiologist first-in-first-out reading.
- **Production design:** DenseNet/ViT multi-label model fine-tuned across multi-site data with test-time calibration, DICOM routing and worklist re-prioritisation.

## Why AI, and why this kind

**Why AI.** Prioritise radiology worklists by flagging critical findings (pneumothorax, large effusion) on chest radiographs within seconds of acquisition. The evidence that separates good from bad outcomes (Finding probability per class, Image quality score, Prior comparison change) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "balanced test sets" are what teams reach for first, and they fail because balanced sets overstate positive predictive value. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: DenseNet/ViT multi-label model fine-tuned across multi-site data with test-time calibration, DICOM routing and worklist re-prioritisation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Finding probability per class, Image quality score, Prior comparison change and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Radiologist first-in-first-out reading | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| DenseNet/ViT multi-label model fine-tuned across multi-site data with test-time calibration, DICOM routing and worklist re-prioritisation | chosen | Meets the 2500 ms envelope at $6.34 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to report for critical findings) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Single-site training and testing.
- Evaluation trap: Labels extracted from reports with NLP errors.
- New scanner vendor: image statistics shift and sensitivity drops.
- Portable bedside films with lines and tubes: false positives on devices.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
