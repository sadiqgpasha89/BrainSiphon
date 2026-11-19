# Patient No-Show Prediction & Overbooking: use-case brief

> Generated from the blueprint `healthcare/patient-no-show-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patient No-Show Prediction & Overbooking · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict appointment no-shows to target reminders and apply safe overbooking that raises utilisation without long waits. The system has to run as a scheduled batch job, inside these limits: Equity (do not penalise transport-limited patients), Reminder consent and Daily scheduling.

**Why it is hard.** The obvious approach is punitive double-booking by risk, and it fails because penalising high-risk patients widens disparities. The second trap is in "Calibration": the real signal is calibrated probabilities for overbooking maths, while teams usually reach for rank-only models.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.6K a month. A mistake is expensive in the way patient wait time measures it.

**What success looks like.** Offline: Calibration error and AUC and Utilisation vs wait in simulation. Online: No-show rate and Patient wait time. The launch is judged on "No-show rate" while "Patient wait time" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict appointment no-shows to target reminders and apply safe overbooking that raises utilisation without long waits.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Equity (do not penalise transport-limited patients)
- Reminder consent
- Daily scheduling
- Explainable

## The approach in one paragraph

Start with reminder 24h before every appointment. Then earn the move to calibrated GBDT with SMS/call intervention uplift and a stochastic overbooking optimiser capped by wait-time constraints, and only if it beats the baseline on Calibration error and AUC and Utilisation vs wait in simulation after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Prior no-show history | Rate over last 12 months. Behavioural. Guard against: excludes the appointment. |
| Add Lead time to appointment | Days between booking and visit. Forgetting risk. Guard against: booking date. |
| Add Transport and weather disruption | Forecast and transit indices. Barrier. Guard against: forecast not actual. |
| Run it as one pipeline | Schedule extract (EHR), Feature builder (Spark), No-show model (LightGBM), Uplift reminder selector (T-learner), Overbooking optimiser (stochastic program) and Attendance outcomes (EHR), with Scheduler review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle public transport strike | Event covariates and flexible rescheduling. |

**Deliberately not doing**

- Patient zip code alone: socioeconomic proxy.
- Appointment slot ID: none.

**How the approach is proven**

Prove it offline on Calibration error and AUC and Utilisation vs wait in simulation using time-ordered splits, then online on "No-show rate" with "Patient wait time" as the guardrail. Watch for: Ignoring that reminders change outcomes and Evaluating on rank not calibration.

## Baseline and production design

- **Baseline (build this first):** Reminder 24h before every appointment.
- **Production design:** Calibrated GBDT with SMS/call intervention uplift and a stochastic overbooking optimiser capped by wait-time constraints.

## Why AI, and why this kind

**Why AI.** Predict appointment no-shows to target reminders and apply safe overbooking that raises utilisation without long waits. The evidence that separates good from bad outcomes (Prior no-show history, Lead time to appointment, Transport and weather disruption) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "punitive double-booking by risk" are what teams reach for first, and they fail because penalising high-risk patients widens disparities. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Calibrated GBDT with SMS/call intervention uplift and a stochastic overbooking optimiser capped by wait-time constraints.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Prior no-show history, Lead time to appointment, Transport and weather disruption and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Reminder 24h before every appointment | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Calibrated GBDT with SMS/call intervention uplift and a stochastic overbooking optimiser capped by wait-time constraints | chosen | Meets the run-window envelope at $0.061 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (No-show rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Ignoring that reminders change outcomes.
- Evaluation trap: Evaluating on rank not calibration.
- Public transport strike: a transport disruption causes mass no-shows far outside the modelled distribution.
- Telehealth conversion: physical-visit baselines change.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
