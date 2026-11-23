# Multilingual Call Interpretation Assist: use-case brief

> Generated from the blueprint `public-safety/multilingual-call-interpretation-assist` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Multilingual Call Interpretation Assist · **Domain:** public-safety · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Provide live transcription and translation hints for calls in other languages while a human interpreter is connected, so key facts reach the call taker sooner. The system has to run in under 100 milliseconds, inside these limits: A qualified interpreter is joined for every call in another language, Machine translation is shown only as a hint and Addresses and numbers displayed in the original script.

**Why it is hard.** The obvious approach is a replacement for interpreters, and it fails because mistranslation can cost lives. The second trap is in "Test": the real signal is real emergency speech in each language, while teams usually reach for studio audio.

**Scale and stakes.** At 10 million users this is about 60.0M model-touching events a day, 694 requests per second on average and 4.2K at peak, at an estimated $49.8K a month. A mistake is expensive in the way interpreter wait time measures it.

**What success looks like.** Offline: Digit and address accuracy, Translation hint quality and Language identification accuracy. Online: Time to key facts, Interpreter wait time and Mistranslation incidents. The launch is judged on "Time to key facts" while "Interpreter wait time" must not get worse.

## Objective, loss and constraints

**Business objective.** Provide live transcription and translation hints for calls in other languages while a human interpreter is connected, so key facts reach the call taker sooner.

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

- A qualified interpreter is joined for every call in another language
- Machine translation is shown only as a hint
- Addresses and numbers displayed in the original script
- Latency under 2 s
- 30 languages

## The approach in one paragraph

Start with a telephone interpreter service connected to the call, because it is the current approach. Then earn the move to a language identification and ASR pipeline that shows source text and a labelled translation hint with confidence, connects the interpreter immediately and logs both, and only if it beats the baseline on Digit and address accuracy and Translation hint quality after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Language identification confidence | Confidence in the language. Routing. Guard against: from the classifier. |
| Add Number and address confidence | Confidence in digits and places. Critical. Guard against: from the ASR. |
| Add Translation quality estimate | Estimated translation quality. Hint reliability. Guard against: from the quality model. |
| Run it as one pipeline | Audio stream (telephony), Language identification (classifier), Speech recognition (ASR), Translation hint (MT model), Confidence labelling (rules) and Interpreter connection (telephony), with Quality review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle dialect | Confidence flags and interpreter only. |

**Deliberately not doing**

- Caller name: personal data.
- Carrier: irrelevant.
- Call length: weak link.

**How the approach is proven**

Prove it offline on Digit and address accuracy, Translation hint quality and Language identification accuracy using time-ordered splits, then online on "Time to key facts" with "Interpreter wait time" as the guardrail. Watch for: Replacing interpreters, Studio-audio testing and Unlabelled machine translation.

## Baseline and production design

- **Baseline (build this first):** A telephone interpreter service connected to the call, because it is the current approach.
- **Production design:** A language identification and ASR pipeline that shows source text and a labelled translation hint with confidence, connects the interpreter immediately and logs both.

## Why AI, and why this kind

**Why AI.** Provide live transcription and translation hints for calls in other languages while a human interpreter is connected, so key facts reach the call taker sooner. The evidence that separates good from bad outcomes (Language identification confidence, Number and address confidence, Translation quality estimate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A replacement for interpreters" are what teams reach for first, and they fail because mistranslation can cost lives. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A language identification and ASR pipeline that shows source text and a labelled translation hint with confidence, connects the interpreter immediately and logs both.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Language identification confidence, Number and address confidence, Translation quality estimate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A telephone interpreter service connected to the call, because it is the current approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A language identification and ASR pipeline that shows source text and a labelled translation hint with confidence, connects the interpreter immediately and logs both | chosen | Meets the 80 ms envelope at $0.028 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to key facts) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Replacing interpreters.
- Evaluation trap: Studio-audio testing.
- Dialect: the speech recogniser fails on the dialect.
- Code switching: the caller changes language.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
