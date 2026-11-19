# Pronunciation & Speaking Assessment: use-case brief

> Generated from the blueprint `edtech/pronunciation-assessment-speech` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Pronunciation & Speaking Assessment · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Assess spoken language for pronunciation, fluency and prosody with phoneme-level feedback for learners across accents. The system has to run interactively, within a few seconds, inside these limits: Accent fairness, Noisy environments and Low latency feedback.

**Why it is hard.** The obvious approach is native-accent matching, and it fails because penalises legitimate accents. The second trap is in "Granularity": the real signal is phoneme-level feedback with confidence, while teams usually reach for overall score only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $24.7K a month. A mistake is expensive in the way learner retention measures it.

**What success looks like.** Offline: Correlation with human raters by accent group and Phoneme error detection F1. Online: Speaking improvement per month and Learner retention. The launch is judged on "Speaking improvement per month" while "Learner retention" must not get worse.

## Objective, loss and constraints

**Business objective.** Assess spoken language for pronunciation, fluency and prosody with phoneme-level feedback for learners across accents.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{CTC}}+\lambda\,\mathrm{GOP\ regression}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{CTC}} | Connectionist temporal classification loss: aligns the audio to the phonemes without needing frame-by-frame labels. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GOP\ regression} | Loss for predicting the goodness-of-pronunciation score of each phoneme. |

**Hard constraints**

- Accent fairness
- Noisy environments
- Low latency feedback
- Child speech

## The approach in one paragraph

Start with aSR word-error rate vs target text. Then earn the move to self-supervised speech encoder with phoneme recognition and GOP scoring, calibrated against human raters across accent groups, and only if it beats the baseline on Correlation with human raters by accent group and Phoneme error detection F1 after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Goodness-of-pronunciation per phoneme | GOP scores. Specific errors. Guard against: aligner quality. |
| Add Fluency features | Pause patterns, speech rate. Fluency. Guard against: segmentation. |
| Add Prosody contour match | Pitch and stress patterns. Naturalness. Guard against: normalisation. |
| Run it as one pipeline | Audio capture (app), VAD and noise suppression (front end), Phoneme recogniser (wav2vec 2.0), Pronunciation scorer (GOP model), Learner UI (feedback) and Rater labels (calibration), with Feedback generator off the critical path. |
| Optimise the right thing | The objective weighs connectionist temporal classification loss: aligns the audio to the phonemes without needing frame-by-frame labels, so the model is trained on the cost of the decision and not on a generic score. |
| Handle child speech differs from adult | Age-specific models and calibration. |

**Deliberately not doing**

- Speaker gender: bias.
- Microphone type: channel.

**How the approach is proven**

Prove it offline on Correlation with human raters by accent group and Phoneme error detection F1 using time-ordered splits, then online on "Speaking improvement per month" with "Learner retention" as the guardrail. Watch for: Training mostly on native speakers and Rater disagreement ignored.

## Baseline and production design

- **Baseline (build this first):** ASR word-error rate vs target text.
- **Production design:** Self-supervised speech encoder with phoneme recognition and GOP scoring, calibrated against human raters across accent groups.

## Why AI, and why this kind

**Why AI.** Assess spoken language for pronunciation, fluency and prosody with phoneme-level feedback for learners across accents. The evidence that separates good from bad outcomes (Goodness-of-pronunciation per phoneme, Fluency features, Prosody contour match) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "native-accent matching" are what teams reach for first, and they fail because penalises legitimate accents. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Self-supervised speech encoder with phoneme recognition and GOP scoring, calibrated against human raters across accent groups.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Goodness-of-pronunciation per phoneme, Fluency features, Prosody contour match and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: ASR word-error rate vs target text | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Self-supervised speech encoder with phoneme recognition and GOP scoring, calibrated against human raters across accent groups | chosen | Meets the 2500 ms envelope at $0.274 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Speaking improvement per month) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training mostly on native speakers.
- Evaluation trap: Rater disagreement ignored.
- Child speech differs from adult: models trained on adult speech score children unfairly low on pronunciation.
- Noisy classrooms: recognition errors.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
