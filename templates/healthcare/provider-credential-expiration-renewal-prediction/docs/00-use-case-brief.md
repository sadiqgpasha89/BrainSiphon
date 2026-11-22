# Provider Credential Expiration & Renewal Prediction: use-case brief

> Generated from the blueprint `healthcare/provider-credential-expiration-renewal-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Credential Expiration & Renewal Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which credential renewals are at risk of missing their deadline and prioritise outreach before a licence, certification or coverage lapses. The system has to run as a scheduled batch job, inside these limits: Deadline rules are deterministic and the model only prioritises outreach, Authorised credentialing staff confirm status and contact providers and A lapse is never inferred from a prediction.

**Why it is hard.** The obvious approach is model estimate of the expiry date, and it fails because expiry is a fact in the record not a prediction. The second trap is in "Risk": the real signal is probability the renewal will not complete before expiry, while teams usually reach for probability the provider is careless.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way renewals closed more than 14 days before expiry measures it.

**What success looks like.** Offline: Concordance index and time-dependent AUC at 30 and 60 days, Calibration by credential type and Precision at the outreach capacity. Online: Credentials lapsed per month, Renewals closed more than 14 days before expiry and Outreach touches per renewal. The launch is judged on "Credentials lapsed per month" while "Renewals closed more than 14 days before expiry" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which credential renewals are at risk of missing their deadline and prioritise outreach before a licence, certification or coverage lapses.

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

- Deadline rules are deterministic and the model only prioritises outreach
- Authorised credentialing staff confirm status and contact providers
- A lapse is never inferred from a prediction
- Outputs show missing evidence and next action for each case
- Scores 600K credentials nightly
- Pseudonymous IDs in the model and no sensitive attributes

## The approach in one paragraph

Start with a report of credentials expiring in the next 90 days sorted by date. Then earn the move to discrete-time survival and gradient-boosted classification of the probability that a renewal closes before expiry, combined with a deterministic deadline calendar, evidence-gap lookup and a prioritised outreach queue, and only if it beats the baseline on Concordance index and time-dependent AUC at 30 and 60 days and Calibration by credential type after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Days to expiry minus expected completion time | Remaining time minus the typical verification turnaround. Directly expresses the buffer. Guard against: use the verification turnaround known at scoring time. |
| Add Missing evidence count | Required documents not yet received. The usual blocker. Guard against: snapshot as of scoring. |
| Add Prior reminder response | Days from reminder to submission in past cycles. Past responsiveness predicts friction. Guard against: strictly earlier cycles. |
| Run it as one pipeline | Credential and expiry intake (credentialing extract), Deadline calendar rules (policy rules), Renewal risk model (discrete-time survival model), Evidence gap lookup (document checklist) and Outreach prioritiser (ranking with capacity), with Credentialing team review and Outcome feedback and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle verification source outage | Source-health feature and a manual escalation path. |

**Deliberately not doing**

- Provider specialty prestige: not a driver of lateness.
- Provider age: protected and irrelevant.
- Employment status alone: confounds process with outcome.

**How the approach is proven**

Prove it offline on Concordance index and time-dependent AUC at 30 and 60 days, Calibration by credential type and Precision at the outreach capacity using time-ordered splits, then online on "Credentials lapsed per month" with "Renewals closed more than 14 days before expiry" as the guardrail. Watch for: Treating open renewals as failures, Using final completion dates as features and Mass reminders with no prioritisation.

## Baseline and production design

- **Baseline (build this first):** A report of credentials expiring in the next 90 days sorted by date.
- **Production design:** Discrete-time survival and gradient-boosted classification of the probability that a renewal closes before expiry, combined with a deterministic deadline calendar, evidence-gap lookup and a prioritised outreach queue.

## Why AI, and why this kind

**Why AI.** Predict which credential renewals are at risk of missing their deadline and prioritise outreach before a licence, certification or coverage lapses. The evidence that separates good from bad outcomes (Days to expiry minus expected completion time, Missing evidence count, Prior reminder response) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model estimate of the expiry date" are what teams reach for first, and they fail because expiry is a fact in the record not a prediction. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Discrete-time survival and gradient-boosted classification of the probability that a renewal closes before expiry, combined with a deterministic deadline calendar, evidence-gap lookup and a prioritised outreach queue.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Days to expiry minus expected completion time, Missing evidence count, Prior reminder response and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A report of credentials expiring in the next 90 days sorted by date | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Discrete-time survival and gradient-boosted classification of the probability that a renewal closes before expiry, combined with a deterministic deadline calendar, evidence-gap lookup and a prioritised outreach queue | chosen | Meets the run-window envelope at $0.180 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Credentials lapsed per month) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating open renewals as failures.
- Evaluation trap: Using final completion dates as features.
- Verification source outage: turnaround spikes.
- Policy change in lead time: the buffer changes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
