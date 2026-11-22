# Care-Team Message Routing & Escalation: use-case brief

> Generated from the blueprint `healthcare/care-team-message-routing-escalation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Care-Team Message Routing & Escalation · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend the correct role or team for a message using specialty, location, patient-care relationship, on-call roster and escalation policy, with a fallback route, an acknowledgement timer and a defined escalation chain. The system has to run interactively, within a few seconds, inside these limits: The sender can correct any routing and the platform keeps every acknowledgement and escalation in an audit trail, Deterministic routing rules and the on-call roster decide the recipient and the model only classifies intent and An unacknowledged message follows the approved escalation chain on its timer.

**Why it is hard.** The obvious approach is model chooses the recipient, and it fails because the roster is a fact not a prediction. The second trap is in "Intent": the real signal is classifier labels the request type, while teams usually reach for keyword routing.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $12.4K a month. A mistake is expensive in the way messages reaching the wrong team measures it.

**What success looks like.** Offline: Route accuracy against audited routing decisions, Share of messages needing sender correction and Acknowledgement-time distribution by route. Online: Time to acknowledgement, Messages reaching the wrong team and Escalations triggered. The launch is judged on "Time to acknowledgement" while "Messages reaching the wrong team" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend the correct role or team for a message using specialty, location, patient-care relationship, on-call roster and escalation policy, with a fallback route, an acknowledgement timer and a defined escalation chain.

**Training objective.** `\mathcal{L}=-\sum_i\log p_\theta(y_i\mid x_i)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| x_i | The input features describing one example (what the model sees). (one value per example i) |

**Hard constraints**

- The sender can correct any routing and the platform keeps every acknowledgement and escalation in an audit trail
- Deterministic routing rules and the on-call roster decide the recipient and the model only classifies intent
- An unacknowledged message follows the approved escalation chain on its timer
- The system never drops or silently reroutes a message
- Care-team relationships come from the system of record
- Routes 1.5M messages per day within 300 ms

## The approach in one paragraph

Start with staff look up the right contact in a directory and message them directly. Then earn the move to a rules engine over the live on-call roster and care-team assignments with an NLP intent classifier, context lookup for the patient's care relationships, a fallback and escalation timer, and a correction loop for senders, and only if it beats the baseline on Route accuracy against audited routing decisions and Share of messages needing sender correction after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Intent class | Classified request type such as medication question, result follow-up or logistics. Chooses the policy route. Guard against: message text. |
| Add Care-team relationship | Roles assigned to the patient and the unit. Finds the accountable role. Guard against: assignment records. |
| Add On-call and service hours | Who is on call and whether the service is open. Valid recipient at send time. Guard against: roster snapshot. |
| Run it as one pipeline | Message intake (messaging platform events), Intent classifier (transformer), Context lookup (care-team and roster lookups), Routing rule engine (versioned routing policy) and Sender confirmation or correction (human), with Acknowledgement and escalation timer and Routing outcome and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle roster not yet updated | Roster freshness check and the fallback route. |

**Deliberately not doing**

- Message length: not routing.
- Sender seniority: not a routing factor.
- Channel alone: not intent.

**How the approach is proven**

Prove it offline on Route accuracy against audited routing decisions, Share of messages needing sender correction and Acknowledgement-time distribution by route using time-ordered splits, then online on "Time to acknowledgement" with "Messages reaching the wrong team" as the guardrail. Watch for: Letting the model pick the recipient, Using a stale roster and Skipping the audit trail.

## Baseline and production design

- **Baseline (build this first):** Staff look up the right contact in a directory and message them directly.
- **Production design:** A rules engine over the live on-call roster and care-team assignments with an NLP intent classifier, context lookup for the patient's care relationships, a fallback and escalation timer, and a correction loop for senders.

## Why AI, and why this kind

**Why AI.** Recommend the correct role or team for a message using specialty, location, patient-care relationship, on-call roster and escalation policy, with a fallback route, an acknowledgement timer and a defined escalation chain. The evidence that separates good from bad outcomes (Intent class, Care-team relationship, On-call and service hours) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model chooses the recipient" are what teams reach for first, and they fail because the roster is a fact not a prediction. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A rules engine over the live on-call roster and care-team assignments with an NLP intent classifier, context lookup for the patient's care relationships, a fallback and escalation timer, and a correction loop for senders.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Intent class, Care-team relationship, On-call and service hours and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Staff look up the right contact in a directory and message them directly | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A rules engine over the live on-call roster and care-team assignments with an NLP intent classifier, context lookup for the patient's care relationships, a fallback and escalation timer, and a correction loop for senders | chosen | Meets the 2500 ms envelope at $6.91 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to acknowledgement) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Letting the model pick the recipient.
- Evaluation trap: Using a stale roster.
- Roster not yet updated: the recipient is off duty.
- Patient with several teams: several roles qualify.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
