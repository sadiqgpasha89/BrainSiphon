# Healthcare Audit Readiness Prediction: use-case brief

> Generated from the blueprint `healthcare/healthcare-audit-readiness-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Audit Readiness Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate readiness for a defined audit or accreditation scope and identify the unresolved gaps before the audit date, with a transparent score that is never presented as a certification. The system has to run as a scheduled batch job, inside these limits: The audit or compliance leader signs off readiness and the score is never a certification or a prediction of an audit result, Transparent weighted rules are the base and the model only estimates the chance of unresolved gaps and Each score shows its blockers and the evidence behind them.

**Why it is hard.** The obvious approach is opaque model output, and it fails because leaders must see and own the weights. The second trap is in "Blockers": the real signal is items that would fail the criterion listed first, while teams usually reach for average readiness.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way gaps closed before the audit date measures it.

**What success looks like.** Offline: Rank correlation of readiness with realised audit findings, Calibration of gap-closure probabilities and Blocker recall on mock audits. Online: Findings at audit versus the forecast, Gaps closed before the audit date and Preparation effort per scope. The launch is judged on "Findings at audit versus the forecast" while "Gaps closed before the audit date" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate readiness for a defined audit or accreditation scope and identify the unresolved gaps before the audit date, with a transparent score that is never presented as a certification.

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

- The audit or compliance leader signs off readiness and the score is never a certification or a prediction of an audit result
- Transparent weighted rules are the base and the model only estimates the chance of unresolved gaps
- Each score shows its blockers and the evidence behind them
- Confidence is stated
- Refreshes daily for 20 scopes in the run-up to audits

## The approach in one paragraph

Start with a readiness checklist reviewed in a monthly meeting. Then earn the move to a transparent weighted readiness score per scope and criterion, a calibrated model for the likelihood that open gaps close by the audit date, a blocker list with evidence links and a sign-off workflow, and only if it beats the baseline on Rank correlation of readiness with realised audit findings and Calibration of gap-closure probabilities after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Criteria completion share | Share of criteria with accepted evidence and passing tests. The core readiness measure. Guard against: status at scoring. |
| Add Open findings by severity and age | Unresolved findings weighted by severity and days open. Direct risk. Guard against: findings tracker. |
| Add Remediation on-time rate | Share of past remediation actions closed on schedule. Predicts whether gaps close. Guard against: earlier periods. |
| Run it as one pipeline | Criteria status calculator (weighted rules), Gap closure model (gradient boosting with calibration), Blocker and evidence gap builder (rules) and Action prioritiser (ranking), with Audit scope and status intake, Audit leader sign-off and Readiness history and audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle criteria change mid-cycle | Criteria version and a restatement. |

**Deliberately not doing**

- Audit team size: not readiness.
- Binder page count: volume.
- Owner seniority: not a factor.

**How the approach is proven**

Prove it offline on Rank correlation of readiness with realised audit findings, Calibration of gap-closure probabilities and Blocker recall on mock audits using time-ordered splits, then online on "Findings at audit versus the forecast" with "Gaps closed before the audit date" as the guardrail. Watch for: Presenting readiness as certification, Using opaque weights and Scoring on stale evidence.

## Baseline and production design

- **Baseline (build this first):** A readiness checklist reviewed in a monthly meeting.
- **Production design:** A transparent weighted readiness score per scope and criterion, a calibrated model for the likelihood that open gaps close by the audit date, a blocker list with evidence links and a sign-off workflow.

## Why AI, and why this kind

**Why AI.** Estimate readiness for a defined audit or accreditation scope and identify the unresolved gaps before the audit date, with a transparent score that is never presented as a certification. The evidence that separates good from bad outcomes (Criteria completion share, Open findings by severity and age, Remediation on-time rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "opaque model output" are what teams reach for first, and they fail because leaders must see and own the weights. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A transparent weighted readiness score per scope and criterion, a calibrated model for the likelihood that open gaps close by the audit date, a blocker list with evidence links and a sign-off workflow.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Criteria completion share, Open findings by severity and age, Remediation on-time rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A readiness checklist reviewed in a monthly meeting | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A transparent weighted readiness score per scope and criterion, a calibrated model for the likelihood that open gaps close by the audit date, a blocker list with evidence links and a sign-off workflow | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Findings at audit versus the forecast) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Presenting readiness as certification.
- Evaluation trap: Using opaque weights.
- Criteria change mid-cycle: scores are not comparable.
- Evidence uploaded late: readiness jumps.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
