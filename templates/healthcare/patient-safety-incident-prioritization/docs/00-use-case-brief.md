# Patient Safety Incident Prioritization: use-case brief

> Generated from the blueprint `healthcare/patient-safety-incident-prioritization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patient Safety Incident Prioritization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Triage patient-safety incident reports by potential severity, urgency, recurrence and required review pathway, so safety professionals open the highest-risk reports first and mandatory escalations are never delayed. The system has to run as a scheduled batch job, inside these limits: Deterministic escalation rules for sentinel and never events run first and always override the model, Safety professionals determine final severity and reporting obligations and The model suggests priority and routing and states what information is missing.

**Why it is hard.** The obvious approach is a learned threshold, and it fails because a missed sentinel event is unacceptable. The second trap is in "Severity": the real signal is potential severity and actual harm as separate fields, while teams usually reach for one severity number.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.9K a month. A mistake is expensive in the way escalations missed by rules measures it.

**What success looks like.** Offline: Recall for high-severity reports at the review capacity, Macro-F1 by event category and Calibration error and subgroup parity. Online: Time from report to first review for high-severity events, Escalations missed by rules and Reviewer re-prioritisation rate. The launch is judged on "Time from report to first review for high-severity events" while "Escalations missed by rules" must not get worse.

## Objective, loss and constraints

**Business objective.** Triage patient-safety incident reports by potential severity, urgency, recurrence and required review pathway, so safety professionals open the highest-risk reports first and mandatory escalations are never delayed.

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

- Deterministic escalation rules for sentinel and never events run first and always override the model
- Safety professionals determine final severity and reporting obligations
- The model suggests priority and routing and states what information is missing
- Free text is redacted of identifiers before modelling
- Calibrated risk scores with conservative thresholds
- Processes 15K reports per month with a first-pass turnaround under 10 minutes

## The approach in one paragraph

Start with keyword rules on the event category and harm field. Then earn the move to a deterministic escalation rule layer followed by a transformer text classifier and gradient-boosted tabular model combined into a calibrated priority score with routing suggestions, a missing-information prompt and an abstain path, and only if it beats the baseline on Recall for high-severity reports at the review capacity and Macro-F1 by event category after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Narrative risk phrases | Model-extracted harm, equipment, medication and escalation cues. Narrative contains severity signals fields miss. Guard against: redacted text as at report time. |
| Add Event type and location risk | Event category with unit risk profile. Context changes potential severity. Guard against: taxonomy version. |
| Add Recurrence | Similar event count in the same unit or process in the last 90 days. Repeated events signal a system issue. Guard against: count only earlier events. |
| Run it as one pipeline | Severity and routing classifier (transformer with gradient boosting) and Calibration and abstention (conformal thresholds), with Report intake and PHI redaction, Mandatory escalation rules, Safety officer review, Outcome labels and audit and Fairness report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new event type not in the taxonomy | Out-of-vocabulary detector and a manual route. |

**Deliberately not doing**

- Reporter name or role seniority: bias source and unrelated to severity.
- Report length: style rather than risk.
- Submission time of day: process artefact.

**How the approach is proven**

Prove it offline on Recall for high-severity reports at the review capacity, Macro-F1 by event category and Calibration error and subgroup parity using time-ordered splits, then online on "Time from report to first review for high-severity events" with "Escalations missed by rules" as the guardrail. Watch for: Training on reporter-assigned severity, Random split that leaks duplicate reports and Letting the model override a mandatory rule.

## Baseline and production design

- **Baseline (build this first):** Keyword rules on the event category and harm field.
- **Production design:** A deterministic escalation rule layer followed by a transformer text classifier and gradient-boosted tabular model combined into a calibrated priority score with routing suggestions, a missing-information prompt and an abstain path.

## Why AI, and why this kind

**Why AI.** Triage patient-safety incident reports by potential severity, urgency, recurrence and required review pathway, so safety professionals open the highest-risk reports first and mandatory escalations are never delayed. The evidence that separates good from bad outcomes (Narrative risk phrases, Event type and location risk, Recurrence) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A learned threshold" are what teams reach for first, and they fail because A missed sentinel event is unacceptable. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A deterministic escalation rule layer followed by a transformer text classifier and gradient-boosted tabular model combined into a calibrated priority score with routing suggestions, a missing-information prompt and an abstain path.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Narrative risk phrases, Event type and location risk, Recurrence and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword rules on the event category and harm field | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A deterministic escalation rule layer followed by a transformer text classifier and gradient-boosted tabular model combined into a calibrated priority score with routing suggestions, a missing-information prompt and an abstain path | chosen | Meets the run-window envelope at $0.070 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time from report to first review for high-severity events) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on reporter-assigned severity.
- Evaluation trap: Random split that leaks duplicate reports.
- New event type not in the taxonomy: classifier mislabels.
- Report written in another language: text model degrades.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
