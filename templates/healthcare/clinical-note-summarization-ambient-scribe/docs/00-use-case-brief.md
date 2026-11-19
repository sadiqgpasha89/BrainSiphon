# Ambient Clinical Scribe & Note Summarisation: use-case brief

> Generated from the blueprint `healthcare/clinical-note-summarization-ambient-scribe` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ambient Clinical Scribe & Note Summarisation · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Transcribe clinic visits and draft SOAP notes and patient instructions for clinician review, returning hours to clinicians each week. The system has to run interactively, within a few seconds, inside these limits: Patient consent recorded, Medical-term ASR accuracy and Clinician edits every note.

**Why it is hard.** The obvious approach is fluent plausible notes, and it fails because unsupported statements enter the legal record. The second trap is in "Diarisation": the real signal is speaker roles (clinician, patient, family), while teams usually reach for single transcript stream.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $103.9K a month. A mistake is expensive in the way clinician satisfaction measures it.

**What success looks like.** Offline: Unsupported-statement rate and Medical entity F1. Online: Documentation time per visit and Clinician satisfaction. The launch is judged on "Documentation time per visit" while "Clinician satisfaction" must not get worse.

## Objective, loss and constraints

**Business objective.** Transcribe clinic visits and draft SOAP notes and patient instructions for clinician review, returning hours to clinicians each week.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{UnsupportedFact}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| x | The transcript of the clinical conversation. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{UnsupportedFact} | Penalty for facts in the note that the conversation does not support. |

**Hard constraints**

- Patient consent recorded
- Medical-term ASR accuracy
- Clinician edits every note
- HIPAA-compliant processing

## The approach in one paragraph

Start with clinician dictation and templates. Then earn the move to streaming medical ASR with diarisation, chunked summarisation with span grounding, structured EHR field extraction and review UI, and only if it beats the baseline on Unsupported-statement rate and Medical entity F1 after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Span-level support | Fraction of note statements linked to transcript. Faithfulness. Guard against: alignment algorithm. |
| Add Medical entity accuracy | Drug names and doses correct. Safety. Guard against: formulary dictionary. |
| Add Clinician edit ratio | Edits per note section. Utility. Guard against: excludes formatting edits. |
| Run it as one pipeline | Audio capture (exam-room device), ASR and diarisation (streaming model), Note drafter (clinical LLM), Grounding checker (span alignment) and EHR writer (FHIR API), with Clinician review and Edit feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle multilingual visit with interpreter | Language ID and interpreter-aware diarisation. |

**Deliberately not doing**

- Small talk: not clinical.
- Note verbosity: burden.

**How the approach is proven**

Prove it offline on Unsupported-statement rate and Medical entity F1 using time-ordered splits, then online on "Documentation time per visit" with "Clinician satisfaction" as the guardrail. Watch for: Judging notes by fluency and Test visits from a single specialty.

## Baseline and production design

- **Baseline (build this first):** Clinician dictation and templates.
- **Production design:** Streaming medical ASR with diarisation, chunked summarisation with span grounding, structured EHR field extraction and review UI.

## Why AI, and why this kind

**Why AI.** Transcribe clinic visits and draft SOAP notes and patient instructions for clinician review, returning hours to clinicians each week. The evidence that separates good from bad outcomes (Span-level support, Medical entity accuracy, Clinician edit ratio) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fluent plausible notes" are what teams reach for first, and they fail because unsupported statements enter the legal record. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Streaming medical ASR with diarisation, chunked summarisation with span grounding, structured EHR field extraction and review UI.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Span-level support, Medical entity accuracy, Clinician edit ratio and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Clinician dictation and templates | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Streaming medical ASR with diarisation, chunked summarisation with span grounding, structured EHR field extraction and review UI | chosen | Meets the 2500 ms envelope at $5.77 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Documentation time per visit) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Judging notes by fluency.
- Evaluation trap: Test visits from a single specialty.
- Multilingual visit with interpreter: transcript mixes languages.
- Patient declines recording midway: consent boundary violated.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
