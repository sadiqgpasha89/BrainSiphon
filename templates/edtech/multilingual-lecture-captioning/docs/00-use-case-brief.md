# Multilingual Lecture Captioning & Translation: use-case brief

> Generated from the blueprint `edtech/multilingual-lecture-captioning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Multilingual Lecture Captioning & Translation · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Provide accurate live and recorded captions and translations for lectures in many languages with technical vocabulary. The system has to run interactively, within a few seconds, inside these limits: Live latency under 3 s, Accessibility standards and Code-switching.

**Why it is hard.** The obvious approach is generic ASR, and it fails because technical terms are rare words. The second trap is in "Latency": the real signal is streaming with revision policy, while teams usually reach for full-file ASR only.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $115.8K a month. A mistake is expensive in the way accessibility compliance measures it.

**What success looks like.** Offline: Word error rate on domain terms and Live latency and flicker rate. Online: Caption accuracy complaints and Accessibility compliance. The launch is judged on "Caption accuracy complaints" while "Accessibility compliance" must not get worse.

## Objective, loss and constraints

**Business objective.** Provide accurate live and recorded captions and translations for lectures in many languages with technical vocabulary.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{CTC}}+\lambda\,\mathcal{L}_{\text{translation}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{CTC}} | Connectionist temporal classification loss: aligns a signal such as audio or a line image with its text without frame-by-frame labels. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathcal{L}_{\text{translation}} | Translation loss: how well the caption is translated into the target language. |

**Hard constraints**

- Live latency under 3 s
- Accessibility standards
- Code-switching
- Domain vocabulary

## The approach in one paragraph

Start with platform auto-captions. Then earn the move to streaming ASR with biasing from slides and glossaries, punctuation and diarisation, and MT with terminology constraints and quality estimation, and only if it beats the baseline on Word error rate on domain terms and Live latency and flicker rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Contextual biasing list | Slide text and glossary. Term accuracy. Guard against: extraction. |
| Add Word confidence | Calibrated confidence. Highlight uncertain. Guard against: calibration. |
| Add Translation quality estimate | QE score. Review routing. Guard against: model. |
| Run it as one pipeline | Audio stream (lecture capture), Streaming ASR (conformer), Contextual biasing (glossary), Punctuation and diarisation (models), MT with terminology (NMT) and Caption display (player), with Correction feedback off the critical path. |
| Optimise the right thing | The objective weighs connectionist temporal classification loss: aligns a signal such as audio or a line image with its text without frame-by-frame labels, so the model is trained on the cost of the decision and not on a generic score. |
| Handle code-switching between two languages | Multilingual models with language ID per segment. |

**Deliberately not doing**

- Speaker volume: channel.
- Room reverberation: channel.

**How the approach is proven**

Prove it offline on Word error rate on domain terms and Live latency and flicker rate using time-ordered splits, then online on "Caption accuracy complaints" with "Accessibility compliance" as the guardrail. Watch for: Test set lacks code-switching and Technical terms excluded from WER.

## Baseline and production design

- **Baseline (build this first):** Platform auto-captions.
- **Production design:** Streaming ASR with biasing from slides and glossaries, punctuation and diarisation, and MT with terminology constraints and quality estimation.

## Why AI, and why this kind

**Why AI.** Provide accurate live and recorded captions and translations for lectures in many languages with technical vocabulary. The evidence that separates good from bad outcomes (Contextual biasing list, Word confidence, Translation quality estimate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "generic ASR" are what teams reach for first, and they fail because technical terms are rare words. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Streaming ASR with biasing from slides and glossaries, punctuation and diarisation, and MT with terminology constraints and quality estimation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Contextual biasing list, Word confidence, Translation quality estimate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Platform auto-captions | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Streaming ASR with biasing from slides and glossaries, punctuation and diarisation, and MT with terminology constraints and quality estimation | chosen | Meets the 2500 ms envelope at $2.57 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Caption accuracy complaints) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test set lacks code-switching.
- Evaluation trap: Technical terms excluded from WER.
- Code-switching between two languages: transcription breaks.
- Names of local people and places: repeated errors.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
