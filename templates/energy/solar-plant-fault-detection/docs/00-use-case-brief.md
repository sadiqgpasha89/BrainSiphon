# Solar Plant Fault Detection: use-case brief

> Generated from the blueprint `energy/solar-plant-fault-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Solar Plant Fault Detection · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find underperforming strings, inverters and panels in solar plants from power data and thermal imagery and rank the lost energy to schedule repairs. The system has to run as a scheduled batch job, inside these limits: Loss estimate in kWh per fault, Cleaning and electrical faults separated and Technician confirms before parts are ordered.

**Why it is hard.** The obvious approach is nameplate, and it fails because weather changes output. The second trap is in "Cause": the real signal is soiling, shading or electrical, while teams usually reach for a loss number.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 3.3K at peak, at an estimated $27.2K a month. A mistake is expensive in the way time to repair measures it.

**What success looks like.** Offline: Fault detection recall, Loss estimate error and Cause classification accuracy. Online: Recovered energy, Time to repair and Cleaning cost per kWh recovered. The launch is judged on "Recovered energy" while "Time to repair" must not get worse.

## Objective, loss and constraints

**Business objective.** Find underperforming strings, inverters and panels in solar plants from power data and thermal imagery and rank the lost energy to schedule repairs.

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

- Loss estimate in kWh per fault
- Cleaning and electrical faults separated
- Technician confirms before parts are ordered
- Daily run for 1K plants

## The approach in one paragraph

Start with compare each inverter's output against the plant average, because it is a common check. Then earn the move to a performance model per string with fault classification and drone image defect detection, a lost-energy ranking and cleaning and repair plans, and only if it beats the baseline on Fault detection recall and Loss estimate error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Power ratio against model | Measured over expected power. Core signal. Guard against: by string. |
| Add Inverter and string faults | Alarm and current mismatch. Electrical fault. Guard against: from inverters. |
| Add Thermal hot spots | Panel temperature outliers. Panel defect. Guard against: from drone images. |
| Run it as one pipeline | Plant and weather data (SCADA and weather), Expected power model (regression), Fault classifier (model), Thermal image analysis (vision model), Loss ranking (rules), Work plan (field system) and Outcome tracking (monthly). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle curtailment | Curtailment flags. |

**Deliberately not doing**

- Plant name: an identifier.
- Technician name: irrelevant.
- Report format: an artefact.

**How the approach is proven**

Prove it offline on Fault detection recall, Loss estimate error and Cause classification accuracy using time-ordered splits, then online on "Recovered energy" with "Time to repair" as the guardrail. Watch for: Nameplate baselines, Plant average comparisons only and Counting faults not losses.

## Baseline and production design

- **Baseline (build this first):** Compare each inverter's output against the plant average, because it is a common check.
- **Production design:** A performance model per string with fault classification and drone image defect detection, a lost-energy ranking and cleaning and repair plans.

## Why AI, and why this kind

**Why AI.** Find underperforming strings, inverters and panels in solar plants from power data and thermal imagery and rank the lost energy to schedule repairs. The evidence that separates good from bad outcomes (Power ratio against model, Inverter and string faults, Thermal hot spots) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "nameplate" are what teams reach for first, and they fail because weather changes output. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A performance model per string with fault classification and drone image defect detection, a lost-energy ranking and cleaning and repair plans.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Power ratio against model, Inverter and string faults, Thermal hot spots and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Compare each inverter's output against the plant average, because it is a common check | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A performance model per string with fault classification and drone image defect detection, a lost-energy ranking and cleaning and repair plans | chosen | Meets the run-window envelope at $0.0032 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Recovered energy) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Nameplate baselines.
- Evaluation trap: Plant average comparisons only.
- Curtailment: output is limited by the grid.
- Snow or shade: production drops for known reasons.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
