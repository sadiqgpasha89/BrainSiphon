# Lecture Video Segmentation & Summarisation: use-case brief

> Generated from the blueprint `edtech/lecture-video-segmentation-and-summarization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Lecture Video Segmentation & Summarisation · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Segment lectures into topics, generate chapters, summaries and quiz points so learners can navigate and review efficiently. The system has to run interactively, within a few seconds, inside these limits: Long videos (2 hours), ASR noise on technical terms and Faithful summaries.

**Why it is hard.** The obvious approach is fixed-length chunks, and it fails because fixed chunks cut mid-concept. The second trap is in "Faithfulness": the real signal is summaries grounded in transcript spans, while teams usually reach for free summarisation.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $178.1K a month. A mistake is expensive in the way time to find content measures it.

**What success looks like.** Offline: Boundary F1 and Summary faithfulness rate. Online: Chapter navigation usage and Time to find content. The launch is judged on "Chapter navigation usage" while "Time to find content" must not get worse.

## Objective, loss and constraints

**Business objective.** Segment lectures into topics, generate chapters, summaries and quiz points so learners can navigate and review efficiently.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{boundary}}+\lambda\left(-\sum_t\log p_\theta(y_t\mid y_{<t},x)\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{boundary}} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| x | The input features describing one example (what the model sees). |

**Hard constraints**

- Long videos (2 hours)
- ASR noise on technical terms
- Faithful summaries
- Cost per hour of video

## The approach in one paragraph

Start with fixed 5-minute chapters with auto-captions. Then earn the move to domain-adapted ASR, topic segmentation using transcript and slides, map-reduce summarisation with span citations, and only if it beats the baseline on Boundary F1 and Summary faithfulness rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Transcript topic-shift score | Embedding distance between windows. Boundaries. Guard against: aSR quality. |
| Add Slide-change detection | Visual change in slides. Chapter cue. Guard against: frame sampling. |
| Add Term glossary alignment | Domain terms recognised. ASR repair. Guard against: glossary. |
| Run it as one pipeline | Video upload (platform), ASR with glossary biasing (Whisper-class), Slide and scene detector (vision), Segmenter (topic model), Summariser (LLM with citations), Chapter UI (player) and Learner interaction (events). |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle technical terms mis-transcribed | Glossary biasing and post-ASR correction. |

**Deliberately not doing**

- Speaker filler words: noise.
- Video resolution: weak.

**How the approach is proven**

Prove it offline on Boundary F1 and Summary faithfulness rate using time-ordered splits, then online on "Chapter navigation usage" with "Time to find content" as the guardrail. Watch for: Evaluating on clean slides-only talks and Judging summaries by fluency.

## Baseline and production design

- **Baseline (build this first):** Fixed 5-minute chapters with auto-captions.
- **Production design:** Domain-adapted ASR, topic segmentation using transcript and slides, map-reduce summarisation with span citations.

## Why AI, and why this kind

**Why AI.** Segment lectures into topics, generate chapters, summaries and quiz points so learners can navigate and review efficiently. The evidence that separates good from bad outcomes (Transcript topic-shift score, Slide-change detection, Term glossary alignment) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fixed-length chunks" are what teams reach for first, and they fail because fixed chunks cut mid-concept. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Domain-adapted ASR, topic segmentation using transcript and slides, map-reduce summarisation with span citations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Transcript topic-shift score, Slide-change detection, Term glossary alignment and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed 5-minute chapters with auto-captions | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Domain-adapted ASR, topic segmentation using transcript and slides, map-reduce summarisation with span citations | chosen | Meets the 2500 ms envelope at $9.90 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Chapter navigation usage) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on clean slides-only talks.
- Evaluation trap: Judging summaries by fluency.
- Technical terms mis-transcribed: summary introduces wrong terms.
- Lecture with live whiteboard writing: live whiteboard teaching has no slides so chapter boundaries lack visual cues.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
