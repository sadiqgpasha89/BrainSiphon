# Contact-Centre Call Summarisation & Wrap-up: use-case brief

> Generated from the blueprint `telecom/contact-centre-call-summarisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Contact-Centre Call Summarisation & Wrap-up · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Produce an accurate summary, reason code and next action for each care contact so agents spend less time on wrap-up and records are consistent. The system has to run interactively, within a few seconds, inside these limits: Summary generated from the transcript and customer record only, Agent reviews and edits before saving and No storage of payment card details.

**Why it is hard.** The obvious approach is a fluent invention, and it fails because invented promises create liabilities. The second trap is in "Structure": the real signal is fixed fields for reason, resolution and follow-up, while teams usually reach for a free paragraph.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $13.4K a month. A mistake is expensive in the way consistency of reason codes measures it.

**What success looks like.** Offline: Faithfulness against agent-reviewed summaries, Field accuracy and Edit rate by agents. Online: After-call work time, Consistency of reason codes and Follow-up commitments missed. The launch is judged on "After-call work time" while "Consistency of reason codes" must not get worse.

## Objective, loss and constraints

**Business objective.** Produce an accurate summary, reason code and next action for each care contact so agents spend less time on wrap-up and records are consistent.

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

- Summary generated from the transcript and customer record only
- Agent reviews and edits before saving
- No storage of payment card details
- Summary ready within 5 s of call end

## The approach in one paragraph

Start with a template that fills customer and product fields and leaves the notes to the agent, because it shows how much time summarisation saves. Then earn the move to aSR with redaction, a summariser that fills fixed fields with cited transcript spans, a commitment extractor and an agent review step that records edits for training, and only if it beats the baseline on Faithfulness against agent-reviewed summaries and Field accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Transcript coverage | Share of audio transcribed with confidence. Quality gate. Guard against: low confidence needs review. |
| Add Reason code agreement | Agreement between predicted and agent-coded reasons. Training signal. Guard against: use corrected codes. |
| Add Commitment detection | Promises such as callbacks made in the call. Follow-up tasks. Guard against: verify with the agent. |
| Run it as one pipeline | Audio transcription (ASR service), Redaction (pattern and model redaction), Summary and fields (LLM with schema), Commitment extraction (LLM) and Save to CRM (CRM API), with Agent review and Edit feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle accent and noise | Show confidence and require review below a threshold. |

**Deliberately not doing**

- Call length: not quality.
- Agent name: irrelevant.
- Background noise level: an audio artefact.

**How the approach is proven**

Prove it offline on Faithfulness against agent-reviewed summaries, Field accuracy and Edit rate by agents using time-ordered splits, then online on "After-call work time" with "Consistency of reason codes" as the guardrail. Watch for: Scoring on fluency, Skipping redaction and Using summaries to score agents.

## Baseline and production design

- **Baseline (build this first):** A template that fills customer and product fields and leaves the notes to the agent, because it shows how much time summarisation saves.
- **Production design:** ASR with redaction, a summariser that fills fixed fields with cited transcript spans, a commitment extractor and an agent review step that records edits for training.

## Why AI, and why this kind

**Why AI.** Produce an accurate summary, reason code and next action for each care contact so agents spend less time on wrap-up and records are consistent. The evidence that separates good from bad outcomes (Transcript coverage, Reason code agreement, Commitment detection) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A fluent invention" are what teams reach for first, and they fail because invented promises create liabilities. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: ASR with redaction, a summariser that fills fixed fields with cited transcript spans, a commitment extractor and an agent review step that records edits for training.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Transcript coverage, Reason code agreement, Commitment detection and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A template that fills customer and product fields and leaves the notes to the agent, because it shows how much time summarisation saves | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| ASR with redaction, a summariser that fills fixed fields with cited transcript spans, a commitment extractor and an agent review step that records edits for training | chosen | Meets the 2500 ms envelope at $0.148 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (After-call work time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Scoring on fluency.
- Evaluation trap: Skipping redaction.
- Accent and noise: transcript errors.
- Multiple topics: one call with several issues.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
