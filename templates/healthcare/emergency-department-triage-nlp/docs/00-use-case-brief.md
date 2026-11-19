# ED Triage Acuity Assistant: use-case brief

> Generated from the blueprint `healthcare/emergency-department-triage-nlp` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** ED Triage Acuity Assistant · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Suggest ESI acuity levels from triage notes, vitals and history to reduce under-triage and variability between nurses. The system has to run interactively, within a few seconds, inside these limits: Asymmetric cost (under-triage is worse), Nurse override always available and Latency under 2 s.

**Why it is hard.** The obvious approach is symmetric loss, and it fails because missing a critical patient is far costlier. The second trap is in "Inputs": the real signal is structured vitals plus chief complaint text, while teams usually reach for free text alone.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $12.2K a month. A mistake is expensive in the way time to treatment for high acuity measures it.

**What success looks like.** Offline: Under-triage rate at fixed over-triage and Weighted kappa. Online: Under-triage events and Time to treatment for high acuity. The launch is judged on "Under-triage events" while "Time to treatment for high acuity" must not get worse.

## Objective, loss and constraints

**Business objective.** Suggest ESI acuity levels from triage notes, vitals and history to reduce under-triage and variability between nurses.

**Training objective.** `\mathcal{L}=\mathrm{OrdinalCE}(y,p)+\lambda\,\mathrm{UnderTriagePenalty}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{OrdinalCE} | Ordinal cross-entropy: cross-entropy that treats classes as ordered, so predicting far from the true grade costs more than predicting next to it. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{UnderTriagePenalty} | Extra penalty for assigning a lower urgency than the patient needs, which is far more dangerous than assigning too high. |

**Hard constraints**

- Asymmetric cost (under-triage is worse)
- Nurse override always available
- Latency under 2 s
- Bias audit

## The approach in one paragraph

Start with manual ESI assignment. Then earn the move to ordinal gradient-boosted model with transformer-encoded complaint text, asymmetric loss and a nurse-facing explanation, and only if it beats the baseline on Under-triage rate at fixed over-triage and Weighted kappa after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Vital-sign abnormality count | Number of out-of-range vitals. Acuity. Guard against: age-adjusted ranges. |
| Add Chief-complaint risk phrases | Embeddings of complaint text. Red-flag symptoms. Guard against: de-identified notes. |
| Add Arrival mode | Ambulance vs walk-in. Acuity prior. Guard against: recorded at arrival. |
| Run it as one pipeline | Triage form (EHR), Text encoder (clinical BERT), Acuity model (ordinal GBDT), Safety rules (red-flag overrides), Nurse display (suggestion UI), Nurse decision (final ESI) and Outcome labels (admission and ICU). |
| Optimise the right thing | The objective weighs ordinal cross-entropy: cross-entropy that treats classes as ordered, so predicting far from the true grade costs more than predicting next to it, so the model is trained on the cost of the decision and not on a generic score. |
| Handle atypical presentation in women or elderly | Subgroup performance monitoring and targeted data. |

**Deliberately not doing**

- Triage nurse ID: personal bias.
- Time to triage: operational.

**How the approach is proven**

Prove it offline on Under-triage rate at fixed over-triage and Weighted kappa using time-ordered splits, then online on "Under-triage events" with "Time to treatment for high acuity" as the guardrail. Watch for: Labels reflect nurse biases and Evaluating agreement not outcome.

## Baseline and production design

- **Baseline (build this first):** Manual ESI assignment.
- **Production design:** Ordinal gradient-boosted model with transformer-encoded complaint text, asymmetric loss and a nurse-facing explanation.

## Why AI, and why this kind

**Why AI.** Suggest ESI acuity levels from triage notes, vitals and history to reduce under-triage and variability between nurses. The evidence that separates good from bad outcomes (Vital-sign abnormality count, Chief-complaint risk phrases, Arrival mode) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "symmetric loss" are what teams reach for first, and they fail because missing a critical patient is far costlier. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Ordinal gradient-boosted model with transformer-encoded complaint text, asymmetric loss and a nurse-facing explanation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Vital-sign abnormality count, Chief-complaint risk phrases, Arrival mode and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual ESI assignment | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Ordinal gradient-boosted model with transformer-encoded complaint text, asymmetric loss and a nurse-facing explanation | chosen | Meets the 2500 ms envelope at $1.36 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Under-triage events) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels reflect nurse biases.
- Evaluation trap: Evaluating agreement not outcome.
- Atypical presentation in women or elderly: atypical symptom descriptions under-triage these patients relative to classic presentations.
- Pandemic symptom surge: distribution shift.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
