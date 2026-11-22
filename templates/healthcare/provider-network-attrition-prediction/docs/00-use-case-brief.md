# Provider Network Attrition Prediction: use-case brief

> Generated from the blueprint `healthcare/provider-network-attrition-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Network Attrition Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict provider or group departures or reduced participation so network teams can plan retention and continuity, with explainable operational drivers and a retention workflow, and no punitive use. The system has to run as a scheduled batch job, inside these limits: No punitive action follows from a score and the output is used only for legitimate network planning and outreach, Fairness and privacy review covers features and groups before launch and on a schedule and Scores are shown with operational drivers and not sensitive attributes.

**Why it is hard.** The obvious approach is binary left flag, and it fails because many providers are still active. The second trap is in "Use": the real signal is retention outreach and continuity planning, while teams usually reach for contract or payment decisions.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way time from risk flag to outreach measures it.

**What success looks like.** Offline: Concordance index and time-dependent AUC at 6 and 12 months, Calibration by provider group and Precision at the outreach capacity. Online: Departures avoided or planned for, Time from risk flag to outreach and Continuity gaps from departures. The launch is judged on "Departures avoided or planned for" while "Time from risk flag to outreach" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict provider or group departures or reduced participation so network teams can plan retention and continuity, with explainable operational drivers and a retention workflow, and no punitive use.

**Training objective.** `\mathcal{L}=-\sum_i w_i\,[\,y_i\log p_i+(1-y_i)\log(1-p_i)\,]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_i | A weight that scales how much a particular example, class or term counts in the loss. (one value per example i) |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_i | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per example i) |

**Hard constraints**

- No punitive action follows from a score and the output is used only for legitimate network planning and outreach
- Fairness and privacy review covers features and groups before launch and on a schedule
- Scores are shown with operational drivers and not sensitive attributes
- Network relations staff validate data before any outreach
- Scores 40K providers and groups monthly
- Licensed external data is used only under licence

## The approach in one paragraph

Start with provider relations reacts when a provider gives notice. Then earn the move to a discrete-time survival model with calibrated risk and operational driver explanations, a network-criticality overlay that prioritises outreach, fairness and privacy review, and a retention task workflow, and only if it beats the baseline on Concordance index and time-dependent AUC at 6 and 12 months and Calibration by provider group after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Contract end proximity | Time to the contract end or renewal date. Strongest timing signal. Guard against: contract records. |
| Add Participation trend | Change in claims volume or panel size. Early sign of reduced participation. Guard against: earlier periods. |
| Add Service issue history | Unresolved issues and escalations. Dissatisfaction signal. Guard against: issue log. |
| Run it as one pipeline | Contract and participation intake (warehouse extracts), Feature builder (point-in-time features), Attrition risk model (discrete-time survival), Criticality overlay (network rules) and Driver explainer (feature attribution), with Network relations review and Outreach outcome and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle merger of provider groups | Group lineage. |

**Deliberately not doing**

- Provider name: label.
- Contract identifier: label.
- Specialty marketing: not signal.

**How the approach is proven**

Prove it offline on Concordance index and time-dependent AUC at 6 and 12 months, Calibration by provider group and Precision at the outreach capacity using time-ordered splits, then online on "Departures avoided or planned for" with "Time from risk flag to outreach" as the guardrail. Watch for: Using the score in payment or contracting decisions, Reviewing only average accuracy and Using unlicensed data.

## Baseline and production design

- **Baseline (build this first):** Provider relations reacts when a provider gives notice.
- **Production design:** A discrete-time survival model with calibrated risk and operational driver explanations, a network-criticality overlay that prioritises outreach, fairness and privacy review, and a retention task workflow.

## Why AI, and why this kind

**Why AI.** Predict provider or group departures or reduced participation so network teams can plan retention and continuity, with explainable operational drivers and a retention workflow, and no punitive use. The evidence that separates good from bad outcomes (Contract end proximity, Participation trend, Service issue history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "binary left flag" are what teams reach for first, and they fail because many providers are still active. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A discrete-time survival model with calibrated risk and operational driver explanations, a network-criticality overlay that prioritises outreach, fairness and privacy review, and a retention task workflow.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Contract end proximity, Participation trend, Service issue history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Provider relations reacts when a provider gives notice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A discrete-time survival model with calibrated risk and operational driver explanations, a network-criticality overlay that prioritises outreach, fairness and privacy review, and a retention task workflow | chosen | Meets the run-window envelope at $0.180 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Departures avoided or planned for) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using the score in payment or contracting decisions.
- Evaluation trap: Reviewing only average accuracy.
- Merger of provider groups: history is split.
- Planned retirement: risk is high but known.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
