# Audio and Video Evidence Transcription and Search: use-case brief

> Generated from the blueprint `public-safety/audio-video-evidence-transcription-search` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Audio and Video Evidence Transcription and Search · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Transcribe recorded interviews and bodycam audio and make them searchable by time and phrase, with speaker turns marked, so reviewers find relevant moments without watching everything. The system has to run as a scheduled batch job, inside these limits: Originals unchanged with hashes, Transcripts labelled as machine-generated and Reviewer verifies any passage used in a case.

**Why it is hard.** The obvious approach is edited clips as the source, and it fails because courts need originals. The second trap is in "Labels": the real signal is speaker turns without identity, while teams usually reach for voice identification.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 69 at peak, at an estimated $9.7K a month. A mistake is expensive in the way missed relevant moments measures it.

**What success looks like.** Offline: Word error rate by condition, Search recall and Timestamp accuracy. Online: Review time per hour of audio, Missed relevant moments and Transcript corrections. The launch is judged on "Review time per hour of audio" while "Missed relevant moments" must not get worse.

## Objective, loss and constraints

**Business objective.** Transcribe recorded interviews and bodycam audio and make them searchable by time and phrase, with speaker turns marked, so reviewers find relevant moments without watching everything.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)`

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
| x | The input features describing one example (what the model sees). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Originals unchanged with hashes
- Transcripts labelled as machine-generated
- Reviewer verifies any passage used in a case
- No voice identification of individuals
- 50K hours per year

## The approach in one paragraph

Start with staff listening to recordings and typing transcripts, because it is the current method. Then earn the move to a transcription and diarisation pipeline with a searchable index, confidence and original audio linked to each line, and strict labelling as machine output, and only if it beats the baseline on Word error rate by condition and Search recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around ASR confidence | Confidence per segment. Reliability. Guard against: from ASR. |
| Add Speaker turn boundaries | Change of speaker. Navigation. Guard against: from diarisation. |
| Add Keyword and phrase match | Query hits with time. Search. Guard against: from the index. |
| Run it as one pipeline | Recording intake (evidence system), Hashing (integrity service), Speech recognition (ASR), Speaker turn marking (diarisation) and Search index (keyword and vector), with Reviewer playback and Audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle overlapping speech | Confidence flags and manual review. |

**Deliberately not doing**

- Officer name: irrelevant.
- File name: an artefact.
- Device model: an artefact.

**How the approach is proven**

Prove it offline on Word error rate by condition, Search recall and Timestamp accuracy using time-ordered splits, then online on "Review time per hour of audio" with "Missed relevant moments" as the guardrail. Watch for: Voice identification, Single accuracy figures and Treating machine transcripts as evidence.

## Baseline and production design

- **Baseline (build this first):** Staff listening to recordings and typing transcripts, because it is the current method.
- **Production design:** A transcription and diarisation pipeline with a searchable index, confidence and original audio linked to each line, and strict labelling as machine output.

## Why AI, and why this kind

**Why AI.** Transcribe recorded interviews and bodycam audio and make them searchable by time and phrase, with speaker turns marked, so reviewers find relevant moments without watching everything. The evidence that separates good from bad outcomes (ASR confidence, Speaker turn boundaries, Keyword and phrase match) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "edited clips as the source" are what teams reach for first, and they fail because courts need originals. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A transcription and diarisation pipeline with a searchable index, confidence and original audio linked to each line, and strict labelling as machine output.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among ASR confidence, Speaker turn boundaries, Keyword and phrase match and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Staff listening to recordings and typing transcripts, because it is the current method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A transcription and diarisation pipeline with a searchable index, confidence and original audio linked to each line, and strict labelling as machine output | chosen | Meets the run-window envelope at $0.054 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Review time per hour of audio) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Voice identification.
- Evaluation trap: Single accuracy figures.
- Overlapping speech: overlapping words are lost.
- Poor audio: the error rate rises.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
