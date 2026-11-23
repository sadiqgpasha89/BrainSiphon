# Structural Health Monitoring: use-case brief

> Generated from the blueprint `engineering/structural-health-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Structural Health Monitoring · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect abnormal structural behaviour from strain, vibration, tilt and temperature sensors on bridges and buildings and alert engineers with context, separating environmental effects from real change. The system has to run interactively, within a few seconds, inside these limits: Alerts reviewed by a structural engineer, Temperature and load effects removed before alerting and Detection within 10 minutes.

**Why it is hard.** The obvious approach is a fixed limit, and it fails because daily and seasonal effects dominate readings. The second trap is in "Label": the real signal is inspections and confirmed damage, while teams usually reach for alarm counts.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $5.1K a month. A mistake is expensive in the way inspection cost measures it.

**What success looks like.** Offline: Detection of seeded damage in models, False alert rate and Compensation accuracy. Online: Damage found early, Inspection cost and False alarm callouts. The launch is judged on "Damage found early" while "Inspection cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect abnormal structural behaviour from strain, vibration, tilt and temperature sensors on bridges and buildings and alert engineers with context, separating environmental effects from real change.

**Training objective.** `\mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \\|x\\| | Norm: the length of a vector. The squared norm of a difference is the sum of squared errors. |
| x | The input features describing one example (what the model sees). |
| \mathrm{Dec} | The decoder: the network part that rebuilds the input from its compressed code. |
| \mathrm{Enc} | The encoder: the network part that compresses the input into a short code. |

**Hard constraints**

- Alerts reviewed by a structural engineer
- Temperature and load effects removed before alerting
- Detection within 10 minutes
- Sensor health checked daily
- 5K sensors per structure group

## The approach in one paragraph

Start with periodic inspections and threshold alarms on a few sensors, because they are the standard practice. Then earn the move to a monitoring pipeline that compensates environmental effects, tracks modal and strain trends and raises ranked alerts with sensor health checks for engineer review, and only if it beats the baseline on Detection of seeded damage in models and False alert rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Strain and displacement | Measured response. Core. Guard against: from sensors. |
| Add Modal frequencies | Natural frequency shifts. Core. Guard against: from vibration data. |
| Add Temperature and load | Environmental drivers. Compensation. Guard against: from weather and traffic data. |
| Run it as one pipeline | Sensor stream (site gateways), Quality and drift checks (rules), Environmental compensation (regression), Anomaly detection (model), Engineer alert (operations console) and Inspection trigger (asset management), with Baseline review off the critical path. |
| Optimise the right thing | The objective weighs norm: the length of a vector. The squared norm of a difference is the sum of squared errors, so the model is trained on the cost of the decision and not on a generic score. |
| Handle sensor failure | Redundant sensors and health alerts. |

**Deliberately not doing**

- Sensor id: an identifier.
- Installer name: personal data.
- Cable colour: irrelevant.

**How the approach is proven**

Prove it offline on Detection of seeded damage in models, False alert rate and Compensation accuracy using time-ordered splits, then online on "Damage found early" with "Inspection cost" as the guardrail. Watch for: Fixed limits, Alarm counts as truth and Safety declared by the model.

## Baseline and production design

- **Baseline (build this first):** Periodic inspections and threshold alarms on a few sensors, because they are the standard practice.
- **Production design:** A monitoring pipeline that compensates environmental effects, tracks modal and strain trends and raises ranked alerts with sensor health checks for engineer review.

## Why AI, and why this kind

**Why AI.** Detect abnormal structural behaviour from strain, vibration, tilt and temperature sensors on bridges and buildings and alert engineers with context, separating environmental effects from real change. The evidence that separates good from bad outcomes (Strain and displacement, Modal frequencies, Temperature and load) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A fixed limit" are what teams reach for first, and they fail because daily and seasonal effects dominate readings. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A monitoring pipeline that compensates environmental effects, tracks modal and strain trends and raises ranked alerts with sensor health checks for engineer review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Strain and displacement, Modal frequencies, Temperature and load and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Periodic inspections and threshold alarms on a few sensors, because they are the standard practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A monitoring pipeline that compensates environmental effects, tracks modal and strain trends and raises ranked alerts with sensor health checks for engineer review | chosen | Meets the 2500 ms envelope at $0.0057 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Damage found early) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Fixed limits.
- Evaluation trap: Alarm counts as truth.
- Sensor failure: a gauge drifts or fails.
- Extreme event: an earthquake or flood changes behaviour.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
