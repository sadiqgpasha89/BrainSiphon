# Wearable Arrhythmia Detection (ECG/PPG): use-case brief

> Generated from the blueprint `healthcare/wearable-arrhythmia-detection-ecg` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Wearable Arrhythmia Detection (ECG/PPG) · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect atrial fibrillation and other arrhythmias from wearable signals continuously while limiting false alarms and battery drain. The system has to run in under 100 milliseconds, inside these limits: On-device inference under 1 mW budget, Motion artefacts and Regulatory clearance.

**Why it is hard.** The obvious approach is classifying everything, and it fails because motion corrupts PPG and creates false AF. The second trap is in "Burden": the real signal is episode-level detection with duration criteria, while teams usually reach for window-level accuracy.

**Scale and stakes.** At 10 million users this is about 4320.0M model-touching events a day, 50.0K requests per second on average and 300.0K at peak, at an estimated $123.6K a month. A mistake is expensive in the way alert-induced clinic visits measures it.

**What success looks like.** Offline: Episode sensitivity and PPV and Alerts per user-month. Online: Confirmed AF detection rate and Alert-induced clinic visits. The launch is judged on "Confirmed AF detection rate" while "Alert-induced clinic visits" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect atrial fibrillation and other arrhythmias from wearable signals continuously while limiting false alarms and battery drain.

**Training objective.** `\mathcal{L}=\mathrm{FL}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- On-device inference under 1 mW budget
- Motion artefacts
- Regulatory clearance
- Alert false positives low

## The approach in one paragraph

Start with rR-irregularity threshold algorithm. Then earn the move to quantised 1D CNN with signal-quality gate on-device, with cloud confirmation on a larger model and cardiologist review for flagged episodes, and only if it beats the baseline on Episode sensitivity and PPV and Alerts per user-month after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around RR-interval irregularity | Beat-to-beat interval entropy. AF marker. Guard against: peak detection quality. |
| Add PPG morphology quality | Pulse waveform SQI. Reliability. Guard against: device-specific calibration. |
| Add Activity context | Accelerometer-derived motion level. Artefact control. Guard against: sync with signal. |
| Run it as one pipeline | Sensor sampling (wearable), Signal-quality gate (on-device), Arrhythmia CNN (INT8 on MCU), Episode aggregator (duration rules), Cloud confirmation (larger model) and Outcome labels (ECG patches), with Cardiologist review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle tremor or exercise motion | Activity-aware gating and confirmation window. |

**Deliberately not doing**

- Absolute heart rate: wide benign range.
- Wrist side: device artefact.

**How the approach is proven**

Prove it offline on Episode sensitivity and PPV and Alerts per user-month using time-ordered splits, then online on "Confirmed AF detection rate" with "Alert-induced clinic visits" as the guardrail. Watch for: Test data from clean lab recordings and Window-level splits sharing patients.

## Baseline and production design

- **Baseline (build this first):** RR-irregularity threshold algorithm.
- **Production design:** Quantised 1D CNN with signal-quality gate on-device, with cloud confirmation on a larger model and cardiologist review for flagged episodes.

## Why AI, and why this kind

**Why AI.** Detect atrial fibrillation and other arrhythmias from wearable signals continuously while limiting false alarms and battery drain. The evidence that separates good from bad outcomes (RR-interval irregularity, PPG morphology quality, Activity context) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "classifying everything" are what teams reach for first, and they fail because motion corrupts PPG and creates false AF. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Quantised 1D CNN with signal-quality gate on-device, with cloud confirmation on a larger model and cardiologist review for flagged episodes.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among RR-interval irregularity, PPG morphology quality, Activity context and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: RR-irregularity threshold algorithm | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Quantised 1D CNN with signal-quality gate on-device, with cloud confirmation on a larger model and cardiologist review for flagged episodes | chosen | Meets the 80 ms envelope at $0.00095 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Confirmed AF detection rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test data from clean lab recordings.
- Evaluation trap: Window-level splits sharing patients.
- Tremor or exercise motion: false AF alerts.
- Firmware update changes sampling: model performance drops.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
