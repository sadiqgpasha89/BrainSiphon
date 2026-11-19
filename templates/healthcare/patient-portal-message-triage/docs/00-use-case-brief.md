# Patient Portal Message Triage & Drafts: use-case brief

> Generated from the blueprint `healthcare/patient-portal-message-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patient Portal Message Triage & Drafts · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify urgency and route inbound patient messages, drafting safe replies for staff review to cut inbox burden. The system has to run interactively, within a few seconds, inside these limits: Never auto-reply to urgent clinical questions, Staff approval and PHI controls.

**Why it is hard.** The obvious approach is sentiment, and it fails because calm messages can describe emergencies. The second trap is in "Drafts": the real signal is policy- and chart-grounded drafts, while teams usually reach for generic reassurance.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $61.5K a month. A mistake is expensive in the way time to response for urgent messages measures it.

**What success looks like.** Offline: Urgent recall at high precision and Draft acceptance rate. Online: Staff minutes per message and Time to response for urgent messages. The launch is judged on "Staff minutes per message" while "Time to response for urgent messages" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify urgency and route inbound patient messages, drafting safe replies for staff review to cut inbox burden.

**Training objective.** `\mathcal{L}=\mathrm{OrdinalCE}(\text{urgency},p)+\lambda\left(-\sum_t\log p_\theta(y_t\mid y_{<t},x)\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{OrdinalCE} | Ordinal cross-entropy: cross-entropy that treats classes as ordered, so predicting far from the true grade costs more than predicting next to it. |
| \text{urgency} | The urgency level of the patient's message, treated as an ordered grade. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| x | The patient's message. |

**Hard constraints**

- Never auto-reply to urgent clinical questions
- Staff approval
- PHI controls
- Response time SLAs

## The approach in one paragraph

Start with keyword-based inbox rules. Then earn the move to fine-tuned classifier with escalate-on-doubt logic and chart-grounded LLM drafts for administrative intents only, and only if it beats the baseline on Urgent recall at high precision and Draft acceptance rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Red-flag phrase detection | Symptom red-flag matching. Escalation. Guard against: curated list. |
| Add Message-intent class | Refill, appointment, symptom, billing. Routing. Guard against: taxonomy. |
| Add Chart-context relevance | Recent encounters and meds. Draft accuracy. Guard against: retrieval. |
| Run it as one pipeline | Portal message (EHR), Intent and urgency model (clinical encoder), Red-flag rules (overrides), Chart retriever (FHIR) and Draft generator (LLM), with Staff review and Outcome feedback off the critical path. |
| Optimise the right thing | The objective weighs ordinal cross-entropy: cross-entropy that treats classes as ordered, so predicting far from the true grade costs more than predicting next to it, so the model is trained on the cost of the decision and not on a generic score. |
| Handle message contains multiple intents | Multi-label intent detection and split routing. |

**Deliberately not doing**

- Message length: none.
- Time of day: none.

**How the approach is proven**

Prove it offline on Urgent recall at high precision and Draft acceptance rate using time-ordered splits, then online on "Staff minutes per message" with "Time to response for urgent messages" as the guardrail. Watch for: Training labels from inconsistent triage and Not testing the multi-intent cases.

## Baseline and production design

- **Baseline (build this first):** Keyword-based inbox rules.
- **Production design:** Fine-tuned classifier with escalate-on-doubt logic and chart-grounded LLM drafts for administrative intents only.

## Why AI, and why this kind

**Why AI.** Classify urgency and route inbound patient messages, drafting safe replies for staff review to cut inbox burden. The evidence that separates good from bad outcomes (Red-flag phrase detection, Message-intent class, Chart-context relevance) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "sentiment" are what teams reach for first, and they fail because calm messages can describe emergencies. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Fine-tuned classifier with escalate-on-doubt logic and chart-grounded LLM drafts for administrative intents only.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Red-flag phrase detection, Message-intent class, Chart-context relevance and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword-based inbox rules | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Fine-tuned classifier with escalate-on-doubt logic and chart-grounded LLM drafts for administrative intents only | chosen | Meets the 2500 ms envelope at $2.28 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Staff minutes per message) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training labels from inconsistent triage.
- Evaluation trap: Not testing the multi-intent cases.
- Message contains multiple intents: one intent ignored.
- Language and literacy variation: messages in other languages or with low literacy are misclassified and misrouted.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
