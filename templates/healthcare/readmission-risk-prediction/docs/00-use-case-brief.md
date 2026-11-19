# 30-Day Readmission Risk Prediction: use-case brief

> Generated from the blueprint `healthcare/readmission-risk-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** 30-Day Readmission Risk Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify discharges at highest risk of 30-day readmission and match them to transitional-care interventions within capacity. The system has to run as a scheduled batch job, inside these limits: Fairness across demographics, Daily scoring at discharge and Explainable factors for care managers.

**Why it is hard.** The obvious approach is fixed demographics driving risk, and it fails because care teams cannot change age or prior history. The second trap is in "Targeting": the real signal is risk and expected benefit of the intervention, while teams usually reach for highest-risk patients only.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.9K a month. A mistake is expensive in the way care-manager time per avoided readmission measures it.

**What success looks like.** Offline: AUROC and calibration and Net benefit at capacity. Online: 30-day readmission rate in treated vs control and Care-manager time per avoided readmission. The launch is judged on "30-day readmission rate in treated vs control" while "Care-manager time per avoided readmission" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify discharges at highest risk of 30-day readmission and match them to transitional-care interventions within capacity.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GroupCalibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GroupCalibration} | Penalty when predicted risk is miscalibrated for some patient groups, even if it is right overall. |

**Hard constraints**

- Fairness across demographics
- Daily scoring at discharge
- Explainable factors for care managers
- Intervention capacity limits

## The approach in one paragraph

Start with lACE index. Then earn the move to gradient-boosted model with note-derived features, post-hoc calibration, plus an uplift layer for intervention assignment, and only if it beats the baseline on AUROC and calibration and Net benefit at capacity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Prior-year admissions | Count of admissions in prior 12 months. Strongest predictor. Guard against: exclude the index stay. |
| Add Discharge summary risk phrases | NLP-extracted unresolved issues. Context in notes. Guard against: only notes signed before discharge. |
| Add Follow-up appointment scheduled | Appointment within 7 days booked. Modifiable factor. Guard against: booked before discharge time. |
| Run it as one pipeline | EHR extract (nightly FHIR), Feature builder (Spark), Note extractor (clinical NLP), Readmission model (LightGBM), Care-manager worklist (prioritiser), Intervention team (human outreach) and Readmission outcomes (claims). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle planned readmissions counted as failures | Exclude planned readmissions per CMS logic. |

**Deliberately not doing**

- Insurance plan code alone: proxy for socioeconomic status with fairness risk.
- Discharge weekday: operational artefact.

**How the approach is proven**

Prove it offline on AUROC and calibration and Net benefit at capacity using time-ordered splits, then online on "30-day readmission rate in treated vs control" with "Care-manager time per avoided readmission" as the guardrail. Watch for: Labels hide admissions at other hospitals and Using discharge-day features recorded after the decision.

## Baseline and production design

- **Baseline (build this first):** LACE index.
- **Production design:** Gradient-boosted model with note-derived features, post-hoc calibration, plus an uplift layer for intervention assignment.

## Why AI, and why this kind

**Why AI.** Identify discharges at highest risk of 30-day readmission and match them to transitional-care interventions within capacity. The evidence that separates good from bad outcomes (Prior-year admissions, Discharge summary risk phrases, Follow-up appointment scheduled) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fixed demographics driving risk" are what teams reach for first, and they fail because care teams cannot change age or prior history. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Gradient-boosted model with note-derived features, post-hoc calibration, plus an uplift layer for intervention assignment.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Prior-year admissions, Discharge summary risk phrases, Follow-up appointment scheduled and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: LACE index | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient-boosted model with note-derived features, post-hoc calibration, plus an uplift layer for intervention assignment | chosen | Meets the run-window envelope at $0.429 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (30-day readmission rate in treated vs control) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels hide admissions at other hospitals.
- Evaluation trap: Using discharge-day features recorded after the decision.
- Planned readmissions counted as failures: model learns wrong risk.
- Patients readmitted elsewhere: missing outcomes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
