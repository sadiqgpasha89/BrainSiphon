# Corrective Action & CAPA Effectiveness Prediction: use-case brief

> Generated from the blueprint `healthcare/corrective-action-capa-effectiveness-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Corrective Action & CAPA Effectiveness Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate recurrence risk and monitor whether corrective and preventive actions are implemented and effective, flagging overdue or weak actions and evidence gaps for the quality committee. The system has to run as a scheduled batch job, inside these limits: The safety or quality committee approves every CAPA closure, Workflow rules handle overdue and missing-evidence conditions and the model only estimates recurrence risk and No causal claim that an action worked without a suitable design.

**Why it is hard.** The obvious approach is closure of the action, and it fails because a closed action is not an effective action. The second trap is in "Outcome": the real signal is time to recurrence with censoring, while teams usually reach for binary recurred or not.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way actions closed with evidence measures it.

**What success looks like.** Offline: Concordance index and time-dependent AUC at 6 and 12 months, Calibration of recurrence risk and Overdue-action rule precision. Online: Recurrence rate of addressed patterns, Actions closed with evidence and Time from action to effectiveness check. The launch is judged on "Recurrence rate of addressed patterns" while "Actions closed with evidence" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate recurrence risk and monitor whether corrective and preventive actions are implemented and effective, flagging overdue or weak actions and evidence gaps for the quality committee.

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

- The safety or quality committee approves every CAPA closure
- Workflow rules handle overdue and missing-evidence conditions and the model only estimates recurrence risk
- No causal claim that an action worked without a suitable design
- Time-to-recurrence keeps censoring
- Alerts show the evidence gap and owner
- Scores 30K open and closed actions nightly

## The approach in one paragraph

Start with overdue-action report and a manual 90-day check. Then earn the move to rule-based workflow tracking with a discrete-time survival model for time to recurrence of the event pattern, action-strength and evidence features, and a monitoring layer that reports whether recurrence fell relative to a pre-action baseline, and only if it beats the baseline on Concordance index and time-dependent AUC at 6 and 12 months and Calibration of recurrence risk after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Action strength | Classification on an action-strength hierarchy. Stronger system fixes work better. Guard against: from the plan. |
| Add Implementation evidence | Evidence type and date relative to the due date. Shows the action is real. Guard against: as at scoring. |
| Add Pre-action event rate | Events per month before the action. Baseline for recurrence. Guard against: window before the action date. |
| Run it as one pipeline | Action and incident intake (CAPA system extracts), Workflow state rules (overdue and evidence checks), Recurrence risk model (discrete-time survival) and Effectiveness monitor (pre-post comparison), with Quality committee review and Outcome and audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle concurrent changes | Flag overlapping initiatives and avoid effect claims. |

**Deliberately not doing**

- Action text length: style.
- Owner seniority: not a cause of effectiveness.
- Meeting where the action was agreed: context not mechanism.

**How the approach is proven**

Prove it offline on Concordance index and time-dependent AUC at 6 and 12 months, Calibration of recurrence risk and Overdue-action rule precision using time-ordered splits, then online on "Recurrence rate of addressed patterns" with "Actions closed with evidence" as the guardrail. Watch for: Treating closure as effectiveness, Ignoring regression to the mean and Ignoring right-censoring.

## Baseline and production design

- **Baseline (build this first):** Overdue-action report and a manual 90-day check.
- **Production design:** Rule-based workflow tracking with a discrete-time survival model for time to recurrence of the event pattern, action-strength and evidence features, and a monitoring layer that reports whether recurrence fell relative to a pre-action baseline.

## Why AI, and why this kind

**Why AI.** Estimate recurrence risk and monitor whether corrective and preventive actions are implemented and effective, flagging overdue or weak actions and evidence gaps for the quality committee. The evidence that separates good from bad outcomes (Action strength, Implementation evidence, Pre-action event rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "closure of the action" are what teams reach for first, and they fail because A closed action is not an effective action. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Rule-based workflow tracking with a discrete-time survival model for time to recurrence of the event pattern, action-strength and evidence features, and a monitoring layer that reports whether recurrence fell relative to a pre-action baseline.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Action strength, Implementation evidence, Pre-action event rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Overdue-action report and a manual 90-day check | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Rule-based workflow tracking with a discrete-time survival model for time to recurrence of the event pattern, action-strength and evidence features, and a monitoring layer that reports whether recurrence fell relative to a pre-action baseline | chosen | Meets the run-window envelope at $0.180 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Recurrence rate of addressed patterns) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating closure as effectiveness.
- Evaluation trap: Ignoring regression to the mean.
- Concurrent changes: recurrence falls for another reason.
- Low event volume: wide intervals.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
