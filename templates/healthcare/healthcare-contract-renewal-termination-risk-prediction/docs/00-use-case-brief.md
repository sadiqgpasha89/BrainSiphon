# Healthcare Contract Renewal & Termination Risk Prediction: use-case brief

> Generated from the blueprint `healthcare/healthcare-contract-renewal-termination-risk-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Renewal & Termination Risk Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Prioritise upcoming renewals and termination windows by value, performance, risk, utilisation and lead time, so owners start review early enough to renegotiate, renew or exit deliberately. The system has to run as a scheduled batch job, inside these limits: Notice dates are deterministic and the model only prioritises review, Legal and procurement owners decide renewal, renegotiation or termination and Outputs show decision deadline, evidence gaps and recommended start date.

**Why it is hard.** The obvious approach is predicted deadline, and it fails because the notice date is a fact in the contract. The second trap is in "Priority": the real signal is value, risk and lead time combined, while teams usually reach for renewal date only.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way savings from renegotiation measures it.

**What success looks like.** Offline: Concordance index and time-dependent AUC for at-risk renewals at 90 and 180 days, Notice-date rule accuracy and Precision at the review capacity. Online: Renewals reviewed before notice deadline, Savings from renegotiation and Contracts renewed by default. The launch is judged on "Renewals reviewed before notice deadline" while "Savings from renegotiation" must not get worse.

## Objective, loss and constraints

**Business objective.** Prioritise upcoming renewals and termination windows by value, performance, risk, utilisation and lead time, so owners start review early enough to renegotiate, renew or exit deliberately.

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

- Notice dates are deterministic and the model only prioritises review
- Legal and procurement owners decide renewal, renegotiation or termination
- Outputs show decision deadline, evidence gaps and recommended start date
- Scores 25K contracts weekly
- No supplier action is triggered by a score
- Contract values and terms come from verified records

## The approach in one paragraph

Start with a report of contracts expiring in the next 180 days. Then earn the move to a rule-based notice calendar with a discrete-time survival and gradient-boosted model that scores the urgency and likelihood of a contentious or at-risk renewal, with evidence gap detection and a recommended start date, and only if it beats the baseline on Concordance index and time-dependent AUC for at-risk renewals at 90 and 180 days and Notice-date rule accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Days to notice deadline minus review lead time | Remaining time before the latest action date less the usual review cycle. The urgency measure. Guard against: rule-computed. |
| Add Spend and criticality | Annual value and clinical or operational criticality. Weights the decision. Guard against: verified records. |
| Add Performance and dispute history | Service-level misses and open disputes. Evidence for renegotiation. Guard against: earlier periods. |
| Run it as one pipeline | Contract and spend intake (contract extracts), Notice calendar rules (deterministic date rules), Renewal risk model (discrete-time survival) and Evidence gap builder (obligation and performance data), with Review scheduler, Owner review and Decision outcome and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle auto-renewal clause | Auto-renewal flag with an earlier alert. |

**Deliberately not doing**

- Contract title text: not risk.
- Account manager identity: not a driver.
- Signing date: explained by dates.

**How the approach is proven**

Prove it offline on Concordance index and time-dependent AUC for at-risk renewals at 90 and 180 days, Notice-date rule accuracy and Precision at the review capacity using time-ordered splits, then online on "Renewals reviewed before notice deadline" with "Savings from renegotiation" as the guardrail. Watch for: Predicting dates that the contract states, Treating open contracts as renewed and Alerting only at the deadline.

## Baseline and production design

- **Baseline (build this first):** A report of contracts expiring in the next 180 days.
- **Production design:** A rule-based notice calendar with a discrete-time survival and gradient-boosted model that scores the urgency and likelihood of a contentious or at-risk renewal, with evidence gap detection and a recommended start date.

## Why AI, and why this kind

**Why AI.** Prioritise upcoming renewals and termination windows by value, performance, risk, utilisation and lead time, so owners start review early enough to renegotiate, renew or exit deliberately. The evidence that separates good from bad outcomes (Days to notice deadline minus review lead time, Spend and criticality, Performance and dispute history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "predicted deadline" are what teams reach for first, and they fail because the notice date is a fact in the contract. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A rule-based notice calendar with a discrete-time survival and gradient-boosted model that scores the urgency and likelihood of a contentious or at-risk renewal, with evidence gap detection and a recommended start date.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Days to notice deadline minus review lead time, Spend and criticality, Performance and dispute history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A report of contracts expiring in the next 180 days | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A rule-based notice calendar with a discrete-time survival and gradient-boosted model that scores the urgency and likelihood of a contentious or at-risk renewal, with evidence gap detection and a recommended start date | chosen | Meets the run-window envelope at $0.180 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Renewals reviewed before notice deadline) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Predicting dates that the contract states.
- Evaluation trap: Treating open contracts as renewed.
- Auto-renewal clause: the contract renews silently.
- Contract merged or novated: the owner changes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
