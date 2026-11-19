# Sleep Staging from Wearables: use-case brief

> Generated from the blueprint `healthcare/sleep-staging-from-wearables` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Sleep Staging from Wearables · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Infer sleep stages and sleep quality metrics from wrist/ring sensors with accuracy near PSG for coaching and clinical screening. The system has to run as a scheduled batch job, inside these limits: Battery-limited sampling, Diversity of users and Privacy.

**Why it is hard.** The obvious approach is self-reported sleep, and it fails because users misjudge sleep latency and wake time. The second trap is in "Context": the real signal is temporal models over the night, while teams usually reach for epoch-wise classifiers.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $5.5K a month. A mistake is expensive in the way clinical referral accuracy measures it.

**What success looks like.** Offline: Cohen's kappa vs PSG and Wake-after-sleep-onset error. Online: Weekly active users and Clinical referral accuracy. The launch is judged on "Weekly active users" while "Clinical referral accuracy" must not get worse.

## Objective, loss and constraints

**Business objective.** Infer sleep stages and sleep quality metrics from wrist/ring sensors with accuracy near PSG for coaching and clinical screening.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{stage}}+\lambda\,\mathrm{TemporalConsistency}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{stage}} | Cross-entropy for classifying each epoch into a sleep stage. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{TemporalConsistency} | Penalty for implausible stage changes between neighbouring epochs. |

**Hard constraints**

- Battery-limited sampling
- Diversity of users
- Privacy
- Clinical validation against PSG

## The approach in one paragraph

Start with actigraphy-based sleep/wake algorithm. Then earn the move to sequence model (transformer/TCN) on HRV and motion with personalisation and PSG-calibrated outputs, and only if it beats the baseline on Cohen's kappa vs PSG and Wake-after-sleep-onset error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Heart-rate variability features | HRV in 30s epochs. Autonomic state. Guard against: artifact handling. |
| Add Movement activity counts | Accelerometer activity. Wake detection. Guard against: sensor placement. |
| Add Circadian time prior | Clock time and personal chronotype. Stage priors. Guard against: timezone. |
| Run it as one pipeline | Sensor streams (wearable), Epoch features (on-device), Sleep-stage model (TCN), Night summary (metrics), Coaching logic (app) and PSG validation (study data), with Clinician export off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for classifying each epoch into a sleep stage, so the model is trained on the cost of the decision and not on a generic score. |
| Handle shift workers with irregular sleep | Personal circadian adaptation. |

**Deliberately not doing**

- Skin temperature absolute: ambient sensitive.
- Step counts during the day: not sleep.

**How the approach is proven**

Prove it offline on Cohen's kappa vs PSG and Wake-after-sleep-onset error using time-ordered splits, then online on "Weekly active users" with "Clinical referral accuracy" as the guardrail. Watch for: Healthy young validation cohort only and Epoch-level splits within the same person.

## Baseline and production design

- **Baseline (build this first):** Actigraphy-based sleep/wake algorithm.
- **Production design:** Sequence model (transformer/TCN) on HRV and motion with personalisation and PSG-calibrated outputs.

## Why AI, and why this kind

**Why AI.** Infer sleep stages and sleep quality metrics from wrist/ring sensors with accuracy near PSG for coaching and clinical screening. The evidence that separates good from bad outcomes (Heart-rate variability features, Movement activity counts, Circadian time prior) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "self-reported sleep" are what teams reach for first, and they fail because users misjudge sleep latency and wake time. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Sequence model (transformer/TCN) on HRV and motion with personalisation and PSG-calibrated outputs.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Heart-rate variability features, Movement activity counts, Circadian time prior and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Actigraphy-based sleep/wake algorithm | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Sequence model (transformer/TCN) on HRV and motion with personalisation and PSG-calibrated outputs | chosen | Meets the run-window envelope at $0.061 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Weekly active users) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Healthy young validation cohort only.
- Evaluation trap: Epoch-level splits within the same person.
- Shift workers with irregular sleep: stage priors wrong.
- Wearable worn loosely: poor sensor contact produces noisy signals and unreliable stage estimates.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
