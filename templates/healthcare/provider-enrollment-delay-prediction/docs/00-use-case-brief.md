# Provider Enrollment Delay Prediction: use-case brief

> Generated from the blueprint `healthcare/provider-enrollment-delay-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Enrollment Delay Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict payer enrollment and roster delays that affect network participation, scheduling and reimbursement, and tell enrollment specialists the likely bottleneck and next best follow-up. The system has to run as a scheduled batch job, inside these limits: Predictions are segmented by payer and process type, Specialists validate payer status and the model never states a guarantee of participation or reimbursement and Time-to-event labels keep censoring for open applications.

**Why it is hard.** The obvious approach is days from the first draft, and it fails because the clock starts at completeness not at the first form. The second trap is in "Segmentation": the real signal is models or features per payer and process, while teams usually reach for one pooled average.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way providers scheduled before enrollment completes measures it.

**What success looks like.** Offline: Concordance index and time-dependent AUC at 30 and 60 days, Date-range coverage and Bottleneck top-1 accuracy. Online: Days from submission to effective date, Providers scheduled before enrollment completes and Follow-ups that unblock a case. The launch is judged on "Days from submission to effective date" while "Providers scheduled before enrollment completes" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict payer enrollment and roster delays that affect network participation, scheduling and reimbursement, and tell enrollment specialists the likely bottleneck and next best follow-up.

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

- Predictions are segmented by payer and process type
- Specialists validate payer status and the model never states a guarantee of participation or reimbursement
- Time-to-event labels keep censoring for open applications
- Predicts a date range and not a point date
- Scores 120K active applications nightly
- Scheduling effects require human approval

## The approach in one paragraph

Start with median historical turnaround by payer. Then earn the move to discrete-time survival model with payer-specific baselines and gradient-boosted classification of stalls, a stage-level bottleneck classifier and a next-action recommender governed by enrollment playbooks, and only if it beats the baseline on Concordance index and time-dependent AUC at 30 and 60 days and Date-range coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Completeness at submission | Share of required items present on submission. Incomplete submissions are the leading cause of delay. Guard against: as of the submission event. |
| Add Payer SLA position | Days elapsed against the payer's stated turnaround. Shows whether the payer is late. Guard against: use payer SLA table versions. |
| Add Stage dwell time | Time spent in the current stage relative to the payer median. Stalls are predictive. Guard against: computed from event time. |
| Run it as one pipeline | Enrollment and status intake (EDI and portal extracts), Stage and event normaliser (workflow events), Delay risk model (survival model per payer), Bottleneck classifier (gradient boosting) and Follow-up recommender (playbook rules), with Enrollment specialist review and Outcome and audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle payer changes process | Change-point test and a switch to a recent window. |

**Deliberately not doing**

- Provider reputation: irrelevant to administrative processing.
- Payer contact name: personal and unstable.
- Final status code: contains the outcome.

**How the approach is proven**

Prove it offline on Concordance index and time-dependent AUC at 30 and 60 days, Date-range coverage and Bottleneck top-1 accuracy using time-ordered splits, then online on "Days from submission to effective date" with "Providers scheduled before enrollment completes" as the guardrail. Watch for: Starting the clock before the file is complete, Using final status as a feature and Pooling all payers into one model.

## Baseline and production design

- **Baseline (build this first):** Median historical turnaround by payer.
- **Production design:** Discrete-time survival model with payer-specific baselines and gradient-boosted classification of stalls, a stage-level bottleneck classifier and a next-action recommender governed by enrollment playbooks.

## Why AI, and why this kind

**Why AI.** Predict payer enrollment and roster delays that affect network participation, scheduling and reimbursement, and tell enrollment specialists the likely bottleneck and next best follow-up. The evidence that separates good from bad outcomes (Completeness at submission, Payer SLA position, Stage dwell time) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "days from the first draft" are what teams reach for first, and they fail because the clock starts at completeness not at the first form. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Discrete-time survival model with payer-specific baselines and gradient-boosted classification of stalls, a stage-level bottleneck classifier and a next-action recommender governed by enrollment playbooks.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Completeness at submission, Payer SLA position, Stage dwell time and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Median historical turnaround by payer | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Discrete-time survival model with payer-specific baselines and gradient-boosted classification of stalls, a stage-level bottleneck classifier and a next-action recommender governed by enrollment playbooks | chosen | Meets the run-window envelope at $0.180 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Days from submission to effective date) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Starting the clock before the file is complete.
- Evaluation trap: Using final status as a feature.
- Payer changes process: historic turnaround no longer applies.
- Application withdrawn: censoring looks like completion.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
