# Specialty Coverage Risk Prediction: use-case brief

> Generated from the blueprint `healthcare/specialty-coverage-risk-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Specialty Coverage Risk Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict specialty service gaps caused by demand spikes, leave, vacancies, credential status or schedule fragility, with the likely cause and contingency options for clinical operations to validate. The system has to run as a scheduled batch job, inside these limits: Clinical operations validates contingency actions and the model never changes a schedule or contacts a physician, Minimum coverage rules are deterministic and the model estimates the chance of a breach and Each risk shows its cause and evidence.

**Why it is hard.** The obvious approach is model-only risk, and it fails because a known shortfall needs no prediction. The second trap is in "Cause": the real signal is demand, leave, vacancy, credential or fragility cause shown, while teams usually reach for single risk score.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way locum and overtime spend measures it.

**What success looks like.** Offline: PR-AUC and precision at the review capacity, Lead time of correct gap warnings and Calibration of gap probabilities. Online: Gaps avoided or mitigated, Locum and overtime spend and Hours of uncovered service. The launch is judged on "Gaps avoided or mitigated" while "Locum and overtime spend" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict specialty service gaps caused by demand spikes, leave, vacancies, credential status or schedule fragility, with the likely cause and contingency options for clinical operations to validate.

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

- Clinical operations validates contingency actions and the model never changes a schedule or contacts a physician
- Minimum coverage rules are deterministic and the model estimates the chance of a breach
- Each risk shows its cause and evidence
- Scores 3K specialty-site-week combinations daily
- Physician-level detail is restricted

## The approach in one paragraph

Start with coverage gaps are discovered by the scheduling office as they appear. Then earn the move to a deterministic minimum-coverage check plus a calibrated gradient-boosted model of future gap probability by specialty, site and week, with a cause classifier and a contingency option list, and only if it beats the baseline on PR-AUC and precision at the review capacity and Lead time of correct gap warnings after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Coverage depth | Qualified physicians available per slot beyond the minimum. Fragility measure. Guard against: roster snapshot. |
| Add Demand-to-capacity ratio | Forecast demand against available capacity. Spike risk. Guard against: forecast snapshot. |
| Add Credential and privilege expiry | Upcoming expirations of those who cover. Hidden supply loss. Guard against: credential records. |
| Run it as one pipeline | Roster, leave and demand intake (warehouse extracts), Minimum coverage rules (deterministic checks), Gap risk model (gradient boosting with calibration), Cause classifier (rules and attribution), Contingency option builder (rules) and Clinical operations validation (human), with Outcome and audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle rare specialty with few gaps | Specialty-group prior and a low-confidence flag. |

**Deliberately not doing**

- Specialty name: label.
- Roster file format: artefact.
- Physician seniority: not a driver.

**How the approach is proven**

Prove it offline on PR-AUC and precision at the review capacity, Lead time of correct gap warnings and Calibration of gap probabilities using time-ordered splits, then online on "Gaps avoided or mitigated" with "Locum and overtime spend" as the guardrail. Watch for: Predicting shortfalls that rules show, Random splits and Contacting physicians from a score.

## Baseline and production design

- **Baseline (build this first):** Coverage gaps are discovered by the scheduling office as they appear.
- **Production design:** A deterministic minimum-coverage check plus a calibrated gradient-boosted model of future gap probability by specialty, site and week, with a cause classifier and a contingency option list.

## Why AI, and why this kind

**Why AI.** Predict specialty service gaps caused by demand spikes, leave, vacancies, credential status or schedule fragility, with the likely cause and contingency options for clinical operations to validate. The evidence that separates good from bad outcomes (Coverage depth, Demand-to-capacity ratio, Credential and privilege expiry) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model-only risk" are what teams reach for first, and they fail because A known shortfall needs no prediction. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A deterministic minimum-coverage check plus a calibrated gradient-boosted model of future gap probability by specialty, site and week, with a cause classifier and a contingency option list.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Coverage depth, Demand-to-capacity ratio, Credential and privilege expiry and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Coverage gaps are discovered by the scheduling office as they appear | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A deterministic minimum-coverage check plus a calibrated gradient-boosted model of future gap probability by specialty, site and week, with a cause classifier and a contingency option list | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Gaps avoided or mitigated) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Predicting shortfalls that rules show.
- Evaluation trap: Random splits.
- Rare specialty with few gaps: the model has little data.
- Late leave request: risk jumps.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
