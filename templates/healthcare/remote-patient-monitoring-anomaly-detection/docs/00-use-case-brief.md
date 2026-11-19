# Remote Patient Monitoring Anomaly Detection: use-case brief

> Generated from the blueprint `healthcare/remote-patient-monitoring-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Remote Patient Monitoring Anomaly Detection · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect clinically meaningful changes in home-monitoring data (weight, BP, glucose, SpO2) and escalate to care teams with minimal noise. The system has to run in under 100 milliseconds, inside these limits: Personal baselines, Missing and irregular measurements and Care-team capacity.

**Why it is hard.** The obvious approach is population thresholds, and it fails because normal differs widely between patients. The second trap is in "Missingness": the real signal is non-adherence as a signal handled separately, while teams usually reach for imputing and ignoring gaps.

**Scale and stakes.** At 10 million users this is about 72.0M model-touching events a day, 833 requests per second on average and 5.0K at peak, at an estimated $4.5K a month. A mistake is expensive in the way alert response time measures it.

**What success looks like.** Offline: Event detection lead time and Alerts per patient-month. Online: Avoided admissions and Alert response time. The launch is judged on "Avoided admissions" while "Alert response time" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect clinically meaningful changes in home-monitoring data (weight, BP, glucose, SpO2) and escalate to care teams with minimal noise.

**Training objective.** `\mathcal{L}=\sum_t\left[\log\sigma_t+\frac{(x_t-\mu_t)^2}{2\sigma_t^2}\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \sigma_t | Standard deviation: the model's predicted spread, or uncertainty, around its mean prediction. (one value per time step or token t) |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |
| x_t | The input features describing one example (what the model sees). (one value per time step or token t) |
| \mu_t | The model's predicted mean (expected value) of the outcome. (one value per time step or token t) |

**Hard constraints**

- Personal baselines
- Missing and irregular measurements
- Care-team capacity
- Patient-friendly alerts

## The approach in one paragraph

Start with fixed clinical thresholds per vital. Then earn the move to bayesian state-space per patient with robust updates, condition-specific rules layered on top and care-team tiered queue, and only if it beats the baseline on Event detection lead time and Alerts per patient-month after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Deviation from personal baseline | Robust z-score over 14 days. Change. Guard against: window excludes current reading. |
| Add Trend slope over 3 days | Weight gain slope for heart-failure patients. Decompensation. Guard against: measurement timing adjustment. |
| Add Measurement gap duration | Days since last reading. Engagement. Guard against: distinguish device failure. |
| Run it as one pipeline | Device data (IoT gateway), Validation (plausibility checks), Patient baseline model (Kalman filter), Condition rules (clinical logic) and Nurse outreach (human), with Care-team queue and Outcome feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle faulty scale readings | Plausibility and repeat-measure prompts. |

**Deliberately not doing**

- Single outlier reading: measurement error.
- Day of week: none.

**How the approach is proven**

Prove it offline on Event detection lead time and Alerts per patient-month using time-ordered splits, then online on "Avoided admissions" with "Alert response time" as the guardrail. Watch for: Alerts judged only by acted-upon ones and Retrospective data from engaged patients only.

## Baseline and production design

- **Baseline (build this first):** Fixed clinical thresholds per vital.
- **Production design:** Bayesian state-space per patient with robust updates, condition-specific rules layered on top and care-team tiered queue.

## Why AI, and why this kind

**Why AI.** Detect clinically meaningful changes in home-monitoring data (weight, BP, glucose, SpO2) and escalate to care teams with minimal noise. The evidence that separates good from bad outcomes (Deviation from personal baseline, Trend slope over 3 days, Measurement gap duration) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "population thresholds" are what teams reach for first, and they fail because normal differs widely between patients. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Bayesian state-space per patient with robust updates, condition-specific rules layered on top and care-team tiered queue.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Deviation from personal baseline, Trend slope over 3 days, Measurement gap duration and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed clinical thresholds per vital | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Bayesian state-space per patient with robust updates, condition-specific rules layered on top and care-team tiered queue | chosen | Meets the 80 ms envelope at $0.0021 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Avoided admissions) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Alerts judged only by acted-upon ones.
- Evaluation trap: Retrospective data from engaged patients only.
- Faulty scale readings: false weight-gain alert.
- Care-team capacity drops: fewer nurses are available so the alert queue grows and urgent alerts wait.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
