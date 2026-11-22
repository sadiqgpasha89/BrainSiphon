# Healthcare Compliance Control Effectiveness Prediction: use-case brief

> Generated from the blueprint `healthcare/healthcare-compliance-control-effectiveness-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Compliance Control Effectiveness Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify controls with a rising likelihood of failure using overdue tests, exceptions, incidents and evidence quality, and give risk owners a ranked queue with the contributing signals and a recommended next test. The system has to run as a scheduled batch job, inside these limits: Compliance and risk owners validate ratings and remediation and the score never changes a control rating itself, Deterministic rules for overdue tests and open exceptions run first and Every score shows the contributing signals.

**Why it is hard.** The obvious approach is model score for known failures, and it fails because a known failure needs no prediction. The second trap is in "Outcome": the real signal is control failure within a horizon with censoring, while teams usually reach for current rating.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way test effort focused on at-risk controls measures it.

**What success looks like.** Offline: Concordance index and time-dependent AUC at 90 and 180 days, Precision at the review capacity and Calibration of failure probabilities. Online: Failures caught before an audit finding, Test effort focused on at-risk controls and Time from risk rise to owner action. The launch is judged on "Failures caught before an audit finding" while "Test effort focused on at-risk controls" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify controls with a rising likelihood of failure using overdue tests, exceptions, incidents and evidence quality, and give risk owners a ranked queue with the contributing signals and a recommended next test.

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

- Compliance and risk owners validate ratings and remediation and the score never changes a control rating itself
- Deterministic rules for overdue tests and open exceptions run first
- Every score shows the contributing signals
- Calibrated probabilities with confidence
- Scores 25K controls weekly
- No individual is scored

## The approach in one paragraph

Start with annual control rating by self-assessment. Then earn the move to deterministic control rules plus a discrete-time survival and gradient-boosted model over test, exception, incident and evidence features, with signal explanations and a next-test recommender, and only if it beats the baseline on Concordance index and time-dependent AUC at 90 and 180 days and Precision at the review capacity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Days overdue for testing | Days past the planned test date. A direct risk signal. Guard against: test schedule. |
| Add Recent exception rate | Exceptions and waivers per period for the control. Trend toward failure. Guard against: earlier periods. |
| Add Evidence staleness | Age of the latest accepted evidence. Weak evidence predicts failure. Guard against: at scoring. |
| Run it as one pipeline | Control and event intake (GRC extracts), Control rules (deterministic checks), Failure risk model (discrete-time survival), Signal explainer (feature attribution), Next-test scheduler (capacity-aware ranking) and Risk owner validation (human), with Outcome and audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new control | Category prior and a low-confidence flag. |

**Deliberately not doing**

- Control description wording: not risk.
- Owner tenure: not a control factor.
- Control identifier: label.

**How the approach is proven**

Prove it offline on Concordance index and time-dependent AUC at 90 and 180 days, Precision at the review capacity and Calibration of failure probabilities using time-ordered splits, then online on "Failures caught before an audit finding" with "Test effort focused on at-risk controls" as the guardrail. Watch for: Predicting failures that rules already show, Training on current ratings and Scoring individuals.

## Baseline and production design

- **Baseline (build this first):** Annual control rating by self-assessment.
- **Production design:** Deterministic control rules plus a discrete-time survival and gradient-boosted model over test, exception, incident and evidence features, with signal explanations and a next-test recommender.

## Why AI, and why this kind

**Why AI.** Identify controls with a rising likelihood of failure using overdue tests, exceptions, incidents and evidence quality, and give risk owners a ranked queue with the contributing signals and a recommended next test. The evidence that separates good from bad outcomes (Days overdue for testing, Recent exception rate, Evidence staleness) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model score for known failures" are what teams reach for first, and they fail because A known failure needs no prediction. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Deterministic control rules plus a discrete-time survival and gradient-boosted model over test, exception, incident and evidence features, with signal explanations and a next-test recommender.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Days overdue for testing, Recent exception rate, Evidence staleness and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Annual control rating by self-assessment | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Deterministic control rules plus a discrete-time survival and gradient-boosted model over test, exception, incident and evidence features, with signal explanations and a next-test recommender | chosen | Meets the run-window envelope at $0.180 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Failures caught before an audit finding) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Predicting failures that rules already show.
- Evaluation trap: Training on current ratings.
- New control: no history.
- Control redesigned: history no longer applies.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
