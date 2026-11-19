# Plagiarism & AI-Generated Text Detection: use-case brief

> Generated from the blueprint `edtech/ai-text-and-plagiarism-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Plagiarism & AI-Generated Text Detection · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect copied and AI-generated submissions with calibrated confidence and evidence, minimising wrongful accusations. The system has to run interactively, within a few seconds, inside these limits: False accusations are harmful, Non-native writer fairness and Evidence-based process.

**Why it is hard.** The obvious approach is aI-detector score alone, and it fails because detectors have meaningful false positives, especially for non-native writers. The second trap is in "Process": the real signal is use writing-process signals (drafts), while teams usually reach for final text only.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $12.2K a month. A mistake is expensive in the way appeal overturn rate measures it.

**What success looks like.** Offline: Calibration and subgroup FPR and Source recall. Online: Confirmed cases per flagged and Appeal overturn rate. The launch is judged on "Confirmed cases per flagged" while "Appeal overturn rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect copied and AI-generated submissions with calibrated confidence and evidence, minimising wrongful accusations.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- False accusations are harmful
- Non-native writer fairness
- Evidence-based process
- Student appeal

## The approach in one paragraph

Start with text-matching software (Turnitin-style). Then earn the move to source matching with calibrated style-shift and process signals, presented as evidence for human review rather than verdicts, and only if it beats the baseline on Calibration and subgroup FPR and Source recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Source overlap evidence | Matched sources and spans. Plagiarism. Guard against: index coverage. |
| Add Revision-history pattern | Typing and revision events. Authorship process. Guard against: consent. |
| Add Style shift vs student baseline | Stylometric distance from previous work. Anomaly. Guard against: baseline. |
| Run it as one pipeline | Submission (LMS), Source matcher (fingerprint index), Style-shift model (stylometry), Process signals (editor logs), Evidence aggregator (report) and Appeal outcomes (labels), with Instructor review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle non-native writers flagged at higher rates | Subgroup calibration and no-verdict reporting. |

**Deliberately not doing**

- Perplexity alone: unreliable.
- Text length: confound.

**How the approach is proven**

Prove it offline on Calibration and subgroup FPR and Source recall using time-ordered splits, then online on "Confirmed cases per flagged" with "Appeal overturn rate" as the guardrail. Watch for: Training on AI text from older models and Ignoring subgroup effects.

## Baseline and production design

- **Baseline (build this first):** Text-matching software (Turnitin-style).
- **Production design:** Source matching with calibrated style-shift and process signals, presented as evidence for human review rather than verdicts.

## Why AI, and why this kind

**Why AI.** Detect copied and AI-generated submissions with calibrated confidence and evidence, minimising wrongful accusations. The evidence that separates good from bad outcomes (Source overlap evidence, Revision-history pattern, Style shift vs student baseline) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "AI-detector score alone" are what teams reach for first, and they fail because detectors have meaningful false positives, especially for non-native writers. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Source matching with calibrated style-shift and process signals, presented as evidence for human review rather than verdicts.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Source overlap evidence, Revision-history pattern, Style shift vs student baseline and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Text-matching software (Turnitin-style) | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Source matching with calibrated style-shift and process signals, presented as evidence for human review rather than verdicts | chosen | Meets the 2500 ms envelope at $2.72 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Confirmed cases per flagged) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on AI text from older models.
- Evaluation trap: Ignoring subgroup effects.
- Non-native writers flagged at higher rates: unfair accusations.
- Paraphrasing tools evade matching: paraphrasing tools rewrite copied text and recall drops for lexical matching.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
