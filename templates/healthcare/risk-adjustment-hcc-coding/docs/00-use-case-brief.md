# Risk Adjustment & HCC Capture: use-case brief

> Generated from the blueprint `healthcare/risk-adjustment-hcc-coding` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Risk Adjustment & HCC Capture · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify undocumented but clinically supported chronic conditions to ensure accurate risk adjustment, within compliance rules. The system has to run as a scheduled batch job, inside these limits: Audit and compliance (RADV), Clinician attestation required and No upcoding.

**Why it is hard.** The obvious approach is pattern guessing, and it fails because unsupported codes cause audit penalties. The second trap is in "Compliance": the real signal is suspect conditions routed to clinicians for assessment, while teams usually reach for auto-coding conditions.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.9K a month. A mistake is expensive in the way rADV audit findings measures it.

**What success looks like.** Offline: Precision of supported suggestions and Audit pass rate in samples. Online: Accurate HCC capture and RADV audit findings. The launch is judged on "Accurate HCC capture" while "RADV audit findings" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify undocumented but clinically supported chronic conditions to ensure accurate risk adjustment, within compliance rules.

**Training objective.** `\mathcal{L}=\sum_c\mathrm{BCE}(y_c,p_c)+\lambda\,\mathrm{ComplianceRisk}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_c | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y_c | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per channel or segment c) |
| p_c | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per channel or segment c) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ComplianceRisk} | Penalty for coding conditions that the record does not support, which would create audit risk. |

**Hard constraints**

- Audit and compliance (RADV)
- Clinician attestation required
- No upcoding
- Documentation evidence

## The approach in one paragraph

Start with prior-year diagnosis recapture lists. Then earn the move to evidence-linked suspecting model producing clinician prompts with chart citations and compliance audit trail, and only if it beats the baseline on Precision of supported suggestions and Audit pass rate in samples after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Medication-diagnosis mismatch | Medication implying undocumented condition. Gap finding. Guard against: medication dates. |
| Add Lab-based condition evidence | E.g. HbA1c patterns. Support. Guard against: labs before encounter. |
| Add Prior-year HCC recapture status | Chronic conditions to reassess. Completeness. Guard against: previous year documentation. |
| Run it as one pipeline | Claims and EHR data (lake), Evidence extractor (NLP and rules), Suspect model (GBDT), Prompt generator (chart citations) and Documentation capture (EHR), with Clinician assessment and Compliance audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle coding guideline changes | Versioned rule sets and compliance regression suite. |

**Deliberately not doing**

- Provider productivity: none.
- Encounter count: none.

**How the approach is proven**

Prove it offline on Precision of supported suggestions and Audit pass rate in samples using time-ordered splits, then online on "Accurate HCC capture" with "RADV audit findings" as the guardrail. Watch for: Success measured by revenue rather than correctness and Positive labels from prior unaudited coding.

## Baseline and production design

- **Baseline (build this first):** Prior-year diagnosis recapture lists.
- **Production design:** Evidence-linked suspecting model producing clinician prompts with chart citations and compliance audit trail.

## Why AI, and why this kind

**Why AI.** Identify undocumented but clinically supported chronic conditions to ensure accurate risk adjustment, within compliance rules. The evidence that separates good from bad outcomes (Medication-diagnosis mismatch, Lab-based condition evidence, Prior-year HCC recapture status) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "pattern guessing" are what teams reach for first, and they fail because unsupported codes cause audit penalties. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Evidence-linked suspecting model producing clinician prompts with chart citations and compliance audit trail.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Medication-diagnosis mismatch, Lab-based condition evidence, Prior-year HCC recapture status and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Prior-year diagnosis recapture lists | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Evidence-linked suspecting model producing clinician prompts with chart citations and compliance audit trail | chosen | Meets the run-window envelope at $0.424 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Accurate HCC capture) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Success measured by revenue rather than correctness.
- Evaluation trap: Positive labels from prior unaudited coding.
- Coding guideline changes: previously valid suggestions now non-compliant.
- Overzealous suggestions: clinician alert fatigue.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
