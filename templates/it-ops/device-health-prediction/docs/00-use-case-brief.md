# Device Health Prediction: use-case brief

> Generated from the blueprint `it-ops/device-health-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Device Health Prediction · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict laptop and workstation problems such as battery, disk and boot failures from device telemetry so the service desk fixes them before employees lose work, using device-level data only. The system has to run as a scheduled batch job, inside these limits: Device-level telemetry only with no content or browsing, Employee notified before any action and Calibrated risk scores.

**Why it is hard.** The obvious approach is tickets raised, and it fails because many users never raise tickets. The second trap is in "Scope": the real signal is hardware and system health, while teams usually reach for application content and web use.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way time without a device measures it.

**What success looks like.** Offline: Calibration, Recall of failures and Lead time. Online: Unplanned device failures, Time without a device and Employee satisfaction. The launch is judged on "Unplanned device failures" while "Time without a device" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict laptop and workstation problems such as battery, disk and boot failures from device telemetry so the service desk fixes them before employees lose work, using device-level data only.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Device-level telemetry only with no content or browsing
- Employee notified before any action
- Calibrated risk scores
- Weekly scoring of 100K devices
- Service desk schedules repairs

## The approach in one paragraph

Start with reactive repair when employees raise tickets, because it is the current practice. Then earn the move to a scoring model on device health counters that offers repairs to employees ahead of failure and feeds lifecycle planning, and only if it beats the baseline on Calibration and Recall of failures after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Battery and disk health | Capacity and error counters. Core. Guard against: from device agents. |
| Add Boot and crash frequency | Boot time and crash counts. Core. Guard against: from device logs. |
| Add Device age and model | Purchase date and model. Prior. Guard against: from asset records. |
| Run it as one pipeline | Device telemetry (management agent), Feature build (batch), Failure model (gradient boosting), Calibration (isotonic fit), Employee notice (chat), Repair task (ITSM) and Outcome tracking (monthly). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new model | Vendor priors. |

**Deliberately not doing**

- Employee name: personal data.
- Browsing data: privacy-invasive.
- Serial number: an identifier.

**How the approach is proven**

Prove it offline on Calibration, Recall of failures and Lead time using time-ordered splits, then online on "Unplanned device failures" with "Time without a device" as the guardrail. Watch for: Content monitoring, Forced replacement and Tickets as labels.

## Baseline and production design

- **Baseline (build this first):** Reactive repair when employees raise tickets, because it is the current practice.
- **Production design:** A scoring model on device health counters that offers repairs to employees ahead of failure and feeds lifecycle planning.

## Why AI, and why this kind

**Why AI.** Predict laptop and workstation problems such as battery, disk and boot failures from device telemetry so the service desk fixes them before employees lose work, using device-level data only. The evidence that separates good from bad outcomes (Battery and disk health, Boot and crash frequency, Device age and model) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "tickets raised" are what teams reach for first, and they fail because many users never raise tickets. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A scoring model on device health counters that offers repairs to employees ahead of failure and feeds lifecycle planning.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Battery and disk health, Boot and crash frequency, Device age and model and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Reactive repair when employees raise tickets, because it is the current practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A scoring model on device health counters that offers repairs to employees ahead of failure and feeds lifecycle planning | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unplanned device failures) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Content monitoring.
- Evaluation trap: Forced replacement.
- New model: there is no history.
- Remote devices: telemetry arrives late.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
