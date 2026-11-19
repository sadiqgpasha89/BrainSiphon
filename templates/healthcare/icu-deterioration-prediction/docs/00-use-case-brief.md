# ICU & Ward Deterioration Prediction: use-case brief

> Generated from the blueprint `healthcare/icu-deterioration-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** ICU & Ward Deterioration Prediction · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict cardiac arrest, ICU transfer or death within 12 hours for ward patients so rapid-response teams can intervene early. The system has to run in under 100 milliseconds, inside these limits: Hourly refresh, Interpretable risk drivers and Low false-alarm load.

**Why it is hard.** The obvious approach is single binary event within admission, and it fails because clinicians need timing to decide on action. The second trap is in "Context": the real signal is care-goal and DNR status aware outcomes, while teams usually reach for death anywhere counted equally.

**Scale and stakes.** At 10 million users this is about 36.0M model-touching events a day, 417 requests per second on average and 2.5K at peak, at an estimated $5.0K a month. A mistake is expensive in the way cardiac arrests on wards measures it.

**What success looks like.** Offline: AUROC and AUPRC by horizon and Calibration slope by unit. Online: Unplanned ICU transfers and Cardiac arrests on wards. The launch is judged on "Unplanned ICU transfers" while "Cardiac arrests on wards" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict cardiac arrest, ICU transfer or death within 12 hours for ward patients so rapid-response teams can intervene early.

**Training objective.** `\mathcal{L}=\mathrm{FL}(p_t,y_t)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| p_t | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per time step or token t) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Hourly refresh
- Interpretable risk drivers
- Low false-alarm load
- Bedside latency under 1 s

## The approach in one paragraph

Start with nEWS2 score thresholds. Then earn the move to transformer over irregular multivariate time series with time-embeddings, calibrated across horizons and units, and only if it beats the baseline on AUROC and AUPRC by horizon and Calibration slope by unit after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Vital-sign trend z-scores | Deviation of HR, RR, SpO2 from patient baseline. Early instability. Guard against: baseline excludes the prediction window. |
| Add Oxygen support escalation | Change in FiO2 or device level. Respiratory decline. Guard against: charted times. |
| Add Nurse concern flag | Structured concern assessment. Human gestalt. Guard against: present only if recorded before event. |
| Run it as one pipeline | Bedside monitor feed (HL7), Feature windowing (stream processor), Deterioration model (temporal transformer), Calibration layer (per-unit isotonic), Rapid-response alerts (paging) and Outcome registry (labels), with Clinician review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle sensor disconnects during bathing | Missingness-aware model and sensor-status feature. |

**Deliberately not doing**

- Total length of stay so far: proxies for severity but biases late.
- Bed number: location artefact.

**How the approach is proven**

Prove it offline on AUROC and AUPRC by horizon and Calibration slope by unit using time-ordered splits, then online on "Unplanned ICU transfers" with "Cardiac arrests on wards" as the guardrail. Watch for: Retrospective labels include interventions caused by model-driven alerts and Leakage via future-charted vitals.

## Baseline and production design

- **Baseline (build this first):** NEWS2 score thresholds.
- **Production design:** Transformer over irregular multivariate time series with time-embeddings, calibrated across horizons and units.

## Why AI, and why this kind

**Why AI.** Predict cardiac arrest, ICU transfer or death within 12 hours for ward patients so rapid-response teams can intervene early. The evidence that separates good from bad outcomes (Vital-sign trend z-scores, Oxygen support escalation, Nurse concern flag) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single binary event within admission" are what teams reach for first, and they fail because clinicians need timing to decide on action. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Transformer over irregular multivariate time series with time-embeddings, calibrated across horizons and units.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Vital-sign trend z-scores, Oxygen support escalation, Nurse concern flag and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: NEWS2 score thresholds | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Transformer over irregular multivariate time series with time-embeddings, calibrated across horizons and units | chosen | Meets the 80 ms envelope at $0.0046 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unplanned ICU transfers) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Retrospective labels include interventions caused by model-driven alerts.
- Evaluation trap: Leakage via future-charted vitals.
- Sensor disconnects during bathing: vital gaps look like stability.
- Care-limit order changes: model flags patients on comfort care.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
