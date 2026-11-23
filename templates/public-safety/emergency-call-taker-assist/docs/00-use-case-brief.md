# Emergency Call Taker Assist: use-case brief

> Generated from the blueprint `public-safety/emergency-call-taker-assist` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Emergency Call Taker Assist · **Domain:** public-safety · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Listen to emergency calls in real time and show call takers a structured list of what has been said and which questions remain, so critical details are captured faster while the call taker decides every action. The system has to run in under 100 milliseconds, inside these limits: Prompts appear within 2 s of speech, The call taker confirms every field and No automatic dispatch or priority change.

**Why it is hard.** The obvious approach is an automatic classifier that sets priority, and it fails because emergencies need human judgement and accountability. The second trap is in "Label": the real signal is fields confirmed by call takers, while teams usually reach for transcripts alone.

**Scale and stakes.** At 10 million users this is about 60.0M model-touching events a day, 694 requests per second on average and 4.2K at peak, at an estimated $8.31M a month. A mistake is expensive in the way calls with missing key fields measures it.

**What success looks like.** Offline: Entity extraction accuracy on labelled calls, Latency and Prompt usefulness in call taker reviews. Online: Time to capture the address, Calls with missing key fields and Call taker workload. The launch is judged on "Time to capture the address" while "Calls with missing key fields" must not get worse.

## Objective, loss and constraints

**Business objective.** Listen to emergency calls in real time and show call takers a structured list of what has been said and which questions remain, so critical details are captured faster while the call taker decides every action.

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

- Prompts appear within 2 s of speech
- The call taker confirms every field
- No automatic dispatch or priority change
- Handles the top 12 languages
- 5K concurrent calls

## The approach in one paragraph

Start with call takers typing notes while following paper or screen protocols, because it is the current practice. Then earn the move to a streaming transcription and extraction service with a suggested-question panel and field pre-fill that the call taker accepts or edits, with a full log for quality review, and only if it beats the baseline on Entity extraction accuracy on labelled calls and Latency after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Incident type cues | Words and phrases indicating fire, injury or crime. Protocol selection. Guard against: from speech and text. |
| Add Location mentions | Places and landmarks said by the caller. Location prompt. Guard against: from the transcript. |
| Add Missing protocol questions | Required questions not yet asked. Prompt. Guard against: from the protocol. |
| Run it as one pipeline | Call audio stream (telephony), Speech recognition (streaming ASR), Entity and cue extraction (NLP model), Protocol gap check (rules), Suggested prompts (call taker screen) and Call taker confirmation (CAD), with Quality review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle heavy accent | Confidence flags and original audio replay. |

**Deliberately not doing**

- Caller name: personal data.
- Call length: weak link.
- Phone model: irrelevant.

**How the approach is proven**

Prove it offline on Entity extraction accuracy on labelled calls, Latency and Prompt usefulness in call taker reviews using time-ordered splits, then online on "Time to capture the address" with "Calls with missing key fields" as the guardrail. Watch for: Automatic priority setting, Clean-audio testing and Using transcripts as truth.

## Baseline and production design

- **Baseline (build this first):** Call takers typing notes while following paper or screen protocols, because it is the current practice.
- **Production design:** A streaming transcription and extraction service with a suggested-question panel and field pre-fill that the call taker accepts or edits, with a full log for quality review.

## Why AI, and why this kind

**Why AI.** Listen to emergency calls in real time and show call takers a structured list of what has been said and which questions remain, so critical details are captured faster while the call taker decides every action. The evidence that separates good from bad outcomes (Incident type cues, Location mentions, Missing protocol questions) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "an automatic classifier that sets priority" are what teams reach for first, and they fail because emergencies need human judgement and accountability. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A streaming transcription and extraction service with a suggested-question panel and field pre-fill that the call taker accepts or edits, with a full log for quality review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Incident type cues, Location mentions, Missing protocol questions and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Call takers typing notes while following paper or screen protocols, because it is the current practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A streaming transcription and extraction service with a suggested-question panel and field pre-fill that the call taker accepts or edits, with a full log for quality review | chosen | Meets the 80 ms envelope at $4.62 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to capture the address) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Automatic priority setting.
- Evaluation trap: Clean-audio testing.
- Heavy accent: transcription errors appear in key words.
- Caller panic: the story is disordered.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
