# Hearing Record Transcription and Summary Assistant: use-case brief

> Generated from the blueprint `public-safety/hearing-record-transcription-summary` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Hearing Record Transcription and Summary Assistant · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Produce draft transcripts and summaries of recorded hearings for court staff to check, with every summary line linked to the time in the recording. The system has to run as a scheduled batch job, inside these limits: The official record remains the certified transcript, Drafts labelled as machine-generated and Every summary line links to a timestamp.

**Why it is hard.** The obvious approach is the official record, and it fails because certified records have legal weight. The second trap is in "Evidence": the real signal is timestamp links, while teams usually reach for a free summary.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 69 at peak, at an estimated $9.7K a month. A mistake is expensive in the way staff correction time measures it.

**What success looks like.** Offline: Word error rate by condition, Summary faithfulness and Timestamp accuracy. Online: Time to a draft, Staff correction time and Errors found in summaries. The launch is judged on "Time to a draft" while "Staff correction time" must not get worse.

## Objective, loss and constraints

**Business objective.** Produce draft transcripts and summaries of recorded hearings for court staff to check, with every summary line linked to the time in the recording.

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

- The official record remains the certified transcript
- Drafts labelled as machine-generated
- Every summary line links to a timestamp
- Staff verify before use in decisions
- 100K hours per year

## The approach in one paragraph

Start with human stenographers and recorders producing transcripts, because they produce the official record. Then earn the move to a transcription and summarisation pipeline for draft use with role-labelled turns, timestamp-linked summaries and a review interface for court staff, and only if it beats the baseline on Word error rate by condition and Summary faithfulness after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around ASR confidence | Confidence per segment. Reliability. Guard against: from ASR. |
| Add Speaker role turns | Judge, counsel or witness turns. Navigation. Guard against: from diarisation by role. |
| Add Legal term lexicon match | Recognition of legal terms. Accuracy. Guard against: from glossaries. |
| Run it as one pipeline | Recording intake (court recording system), Speech recognition (ASR), Role labelling (diarisation), Summary draft (LLM with timestamps), Distribution as draft (case system) and Quality sampling (monthly), with Staff review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle overlapping speech | Confidence flags and playback links. |

**Deliberately not doing**

- Party name: personal data.
- Courtroom name: an identifier.
- File name: an artefact.

**How the approach is proven**

Prove it offline on Word error rate by condition, Summary faithfulness and Timestamp accuracy using time-ordered splits, then online on "Time to a draft" with "Staff correction time" as the guardrail. Watch for: Treating drafts as official, Summaries with no timestamps and One accuracy number.

## Baseline and production design

- **Baseline (build this first):** Human stenographers and recorders producing transcripts, because they produce the official record.
- **Production design:** A transcription and summarisation pipeline for draft use with role-labelled turns, timestamp-linked summaries and a review interface for court staff.

## Why AI, and why this kind

**Why AI.** Produce draft transcripts and summaries of recorded hearings for court staff to check, with every summary line linked to the time in the recording. The evidence that separates good from bad outcomes (ASR confidence, Speaker role turns, Legal term lexicon match) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the official record" are what teams reach for first, and they fail because certified records have legal weight. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A transcription and summarisation pipeline for draft use with role-labelled turns, timestamp-linked summaries and a review interface for court staff.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among ASR confidence, Speaker role turns, Legal term lexicon match and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Human stenographers and recorders producing transcripts, because they produce the official record | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A transcription and summarisation pipeline for draft use with role-labelled turns, timestamp-linked summaries and a review interface for court staff | chosen | Meets the run-window envelope at $0.054 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to a draft) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating drafts as official.
- Evaluation trap: Summaries with no timestamps.
- Overlapping speech: text is garbled.
- Interpreted testimony: two languages appear.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
