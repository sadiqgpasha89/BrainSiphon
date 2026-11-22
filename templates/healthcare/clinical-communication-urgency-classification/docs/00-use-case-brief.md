# Clinical Communication Urgency Classification: use-case brief

> Generated from the blueprint `healthcare/clinical-communication-urgency-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Communication Urgency Classification · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify incoming clinical and operational messages by urgency and the response pathway they need, so the right queue sees them first, while deterministic emergency rules and existing escalation protocols stay in force. The system has to run interactively, within a few seconds, inside these limits: This is not an emergency triage tool and urgent messages follow the existing escalation protocols whatever the model says, Deterministic emergency keywords and rules run first and the model can only raise urgency never lower it below the rules and Conservative thresholds and an abstain route send uncertain messages to a person.

**Why it is hard.** The obvious approach is model-only urgency, and it fails because a missed emergency keyword is not acceptable. The second trap is in "Direction": the real signal is the model may raise urgency but not lower it below the rules, while teams usually reach for symmetric adjustment.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $12.4K a month. A mistake is expensive in the way urgent messages escalated late measures it.

**What success looks like.** Offline: Recall of urgent messages at a fixed precision, reported separately for each urgency class, Under-triage rate against clinician review and Calibration and abstention coverage. Online: Time to first response for urgent messages, Urgent messages escalated late and Share of suggestions corrected by recipients. The launch is judged on "Time to first response for urgent messages" while "Urgent messages escalated late" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify incoming clinical and operational messages by urgency and the response pathway they need, so the right queue sees them first, while deterministic emergency rules and existing escalation protocols stay in force.

**Training objective.** `\mathcal{L}=-\sum_c w_c\,y_c\log \hat p_c`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_c | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_c | A weight that scales how much a particular example, class or term counts in the loss. (one value per channel or segment c) |
| y_c | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per channel or segment c) |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \hat{p}_c | The model's estimated probability, after calibration where one is applied. (one value per channel or segment c) |

**Hard constraints**

- This is not an emergency triage tool and urgent messages follow the existing escalation protocols whatever the model says
- Deterministic emergency keywords and rules run first and the model can only raise urgency never lower it below the rules
- Conservative thresholds and an abstain route send uncertain messages to a person
- Every suggestion shows its rationale and the recipient can change the label
- The model never hides or delays a message
- Handles 2M messages per day within 300 ms

## The approach in one paragraph

Start with messages are read in arrival order and recipients judge urgency themselves. Then earn the move to deterministic emergency rules first, then a fine-tuned transformer classifier with calibrated probabilities, an abstain band and a rationale panel, integrated beside the inbox without reordering or hiding any message, and only if it beats the baseline on Recall of urgent messages at a fixed precision, reported separately for each urgency class and Under-triage rate against clinician review after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Urgency cue terms and phrases | Clinical and operational language that signals urgency in context. Core text signal. Guard against: message text. |
| Add Sender role and channel | Who sent it and through which channel. Context for urgency. Guard against: directory as at send time. |
| Add Recipient context | On-call status and current queue depth. Sets the response pathway. Guard against: roster snapshot. |
| Run it as one pipeline | Message intake (messaging platform events), Emergency rule layer (deterministic keyword and pattern rules), Urgency classifier (transformer), Threshold and abstain gate (calibrated thresholds), Suggestion display with rationale (inbox integration) and Recipient confirmation or correction (human), with Correction feedback and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle abbreviations and slang | Local lexicon and abstention. |

**Deliberately not doing**

- Message length: not urgency.
- Sender seniority alone: not clinical urgency.
- Time of day alone: confounded with staffing.

**How the approach is proven**

Prove it offline on Recall of urgent messages at a fixed precision, reported separately for each urgency class, Under-triage rate against clinician review and Calibration and abstention coverage using time-ordered splits, then online on "Time to first response for urgent messages" with "Urgent messages escalated late" as the guardrail. Watch for: Training on arrival-order labels, Letting the model lower urgency and Hiding low-urgency messages.

## Baseline and production design

- **Baseline (build this first):** Messages are read in arrival order and recipients judge urgency themselves.
- **Production design:** Deterministic emergency rules first, then a fine-tuned transformer classifier with calibrated probabilities, an abstain band and a rationale panel, integrated beside the inbox without reordering or hiding any message.

## Why AI, and why this kind

**Why AI.** Classify incoming clinical and operational messages by urgency and the response pathway they need, so the right queue sees them first, while deterministic emergency rules and existing escalation protocols stay in force. The evidence that separates good from bad outcomes (Urgency cue terms and phrases, Sender role and channel, Recipient context) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model-only urgency" are what teams reach for first, and they fail because A missed emergency keyword is not acceptable. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Deterministic emergency rules first, then a fine-tuned transformer classifier with calibrated probabilities, an abstain band and a rationale panel, integrated beside the inbox without reordering or hiding any message.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Urgency cue terms and phrases, Sender role and channel, Recipient context and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Messages are read in arrival order and recipients judge urgency themselves | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Deterministic emergency rules first, then a fine-tuned transformer classifier with calibrated probabilities, an abstain band and a rationale panel, integrated beside the inbox without reordering or hiding any message | chosen | Meets the 2500 ms envelope at $6.91 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to first response for urgent messages) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on arrival-order labels.
- Evaluation trap: Letting the model lower urgency.
- Abbreviations and slang: the classifier misreads.
- Negation such as no chest pain: a keyword rule over-fires.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
