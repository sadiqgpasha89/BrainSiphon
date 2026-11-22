# Staffing Coverage Gap Prediction: use-case brief

> Generated from the blueprint `healthcare/staffing-coverage-gap-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Staffing Coverage Gap Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which upcoming shifts are likely to fall below minimum safe coverage or the required skill mix early enough to act, keeping a forecast risk distinct from a confirmed uncovered shift. The system has to run as a scheduled batch job, inside these limits: Scores every future shift in a 14-day window each night, Coverage is evaluated by a deterministic rule engine and the model only ranks risk and Confirmed uncovered shifts are reported separately from predicted gaps.

**Why it is hard.** The obvious approach is shift that was open at some earlier point, and it fails because most open shifts are filled and a model trained on them cries wolf. The second trap is in "Rules": the real signal is deterministic coverage check against skill mix and credential validity, while teams usually reach for a learned score that decides whether coverage is met.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 69 at peak, at an estimated $1.8K a month. A mistake is expensive in the way share of shifts below minimum at start measures it.

**What success looks like.** Offline: PR-AUC and precision at the alert budget, Calibration error by lead-time band and Median lead time to first correct gap alert. Online: Gaps closed before shift start, Share of shifts below minimum at start and Manager alert-acknowledgement rate. The launch is judged on "Gaps closed before shift start" while "Share of shifts below minimum at start" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which upcoming shifts are likely to fall below minimum safe coverage or the required skill mix early enough to act, keeping a forecast risk distinct from a confirmed uncovered shift.

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

- Scores every future shift in a 14-day window each night
- Coverage is evaluated by a deterministic rule engine and the model only ranks risk
- Confirmed uncovered shifts are reported separately from predicted gaps
- The staffing office confirms every assignment and the system recommends escalation only
- Minimum coverage and skill mix come from versioned policy not from history
- Calibrated probabilities with a stated alert budget per manager

## The approach in one paragraph

Start with rule-only report of shifts currently below minimum plus a trailing fill-rate heuristic. Then earn the move to gradient-boosted discrete-time hazard and classification model for the probability that a shift ends below minimum, with severity bands and time-to-gap, wrapped by a deterministic coverage and escalation rule engine, and only if it beats the baseline on PR-AUC and precision at the alert budget and Calibration error by lead-time band after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Open-shift age and fill hazard | Hours since posting and historical fill rate for that role and shift type. Shifts that stay open past typical fill time rarely fill themselves. Guard against: use posting time and fill time as logged. |
| Add Absence pressure | Notified absences and aggregate sick-call rate for the unit-shift. Absences are the largest source of late gaps. Guard against: count only absences notified before scoring time. |
| Add Eligible float depth | Number of eligible float or cross-trained staff available for the shift. Gaps are survivable when eligible cover exists. Guard against: eligibility must come from verified credentials at that date. |
| Run it as one pipeline | Roster and absence intake (scheduling extract), Coverage rule engine (versioned policy rules), Gap risk model (gradient-boosted hazard model) and Severity and eligible-cover ranker (credential-aware filter), with Escalation policy and alert budget, Staffing office review and Outcome feedback and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle credential lapses between scoring and shift | Re-check eligibility at the moment of recommendation and again at assignment. |

**Deliberately not doing**

- Individual employee reliability scores: punitive in effect and a privacy risk with little signal beyond aggregate absence.
- Manager identity: proxies for unit culture and is not a stable cause.
- Posting channel: reflects process not coverage risk.

**How the approach is proven**

Prove it offline on PR-AUC and precision at the alert budget, Calibration error by lead-time band and Median lead time to first correct gap alert using time-ordered splits, then online on "Gaps closed before shift start" with "Share of shifts below minimum at start" as the guardrail. Watch for: Counting filled shifts as false positives, Scoring only shifts close to start and Using a model score where a rule decides coverage.

## Baseline and production design

- **Baseline (build this first):** Rule-only report of shifts currently below minimum plus a trailing fill-rate heuristic.
- **Production design:** Gradient-boosted discrete-time hazard and classification model for the probability that a shift ends below minimum, with severity bands and time-to-gap, wrapped by a deterministic coverage and escalation rule engine.

## Why AI, and why this kind

**Why AI.** Predict which upcoming shifts are likely to fall below minimum safe coverage or the required skill mix early enough to act, keeping a forecast risk distinct from a confirmed uncovered shift. The evidence that separates good from bad outcomes (Open-shift age and fill hazard, Absence pressure, Eligible float depth) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "shift that was open at some earlier point" are what teams reach for first, and they fail because most open shifts are filled and a model trained on them cries wolf. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient-boosted discrete-time hazard and classification model for the probability that a shift ends below minimum, with severity bands and time-to-gap, wrapped by a deterministic coverage and escalation rule engine.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Open-shift age and fill hazard, Absence pressure, Eligible float depth and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-only report of shifts currently below minimum plus a trailing fill-rate heuristic | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient-boosted discrete-time hazard and classification model for the probability that a shift ends below minimum, with severity bands and time-to-gap, wrapped by a deterministic coverage and escalation rule engine | chosen | Meets the run-window envelope at $0.0098 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Gaps closed before shift start) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Counting filled shifts as false positives.
- Evaluation trap: Scoring only shifts close to start.
- Credential lapses between scoring and shift: a cover option becomes ineligible.
- Mass absence on one day: thousands of shifts spike at once.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
