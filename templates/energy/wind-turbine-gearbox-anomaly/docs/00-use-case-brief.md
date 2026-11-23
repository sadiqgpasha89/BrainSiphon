# Wind Turbine Gearbox Anomaly Detection: use-case brief

> Generated from the blueprint `energy/wind-turbine-gearbox-anomaly` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Wind Turbine Gearbox Anomaly Detection · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect early gearbox and bearing deterioration in wind turbines from SCADA and vibration data so repairs are planned before major component failures. The system has to run interactively, within a few seconds, inside these limits: Baselines per turbine and operating state, False alarms under 1 per turbine per quarter and Alerts include the component and trend.

**Why it is hard.** The obvious approach is a global limit, and it fails because temperature and load vary with wind and season. The second trap is in "Validation": the real signal is replayed past failures with lead time, while teams usually reach for alarm counts.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $4.0K a month. A mistake is expensive in the way crane cost measures it.

**What success looks like.** Offline: Detection lead time on past failures, False alarms per turbine-quarter and Component localisation accuracy. Online: Major component failures, Crane cost and Lost generation. The launch is judged on "Major component failures" while "Crane cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect early gearbox and bearing deterioration in wind turbines from SCADA and vibration data so repairs are planned before major component failures.

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

- Baselines per turbine and operating state
- False alarms under 1 per turbine per quarter
- Alerts include the component and trend
- Weekly run for 8K turbines

## The approach in one paragraph

Start with alarm limits from the turbine manufacturer on temperature and vibration, because they are the default. Then earn the move to a state-conditioned residual model per turbine with trend tests, vibration feature checks and a lead-time estimate feeding crane and parts planning, and only if it beats the baseline on Detection lead time on past failures and False alarms per turbine-quarter after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Gearbox temperature residual | Difference between measured and expected temperature. Wear signal. Guard against: state-conditioned. |
| Add Vibration spectral features | Energy at gear and bearing frequencies. Fault signal. Guard against: from condition monitoring. |
| Add Oil particle and filter data | Particle counts and filter pressure. Debris. Guard against: from sensors. |
| Run it as one pipeline | SCADA and vibration capture (turbine controllers), State segmentation (signal processing), Residual model (normal-behaviour model), Trend test (change detection), Alert and lead time (asset console) and Maintenance planning (work management), with Feedback off the critical path. |
| Optimise the right thing | The objective weighs norm: the length of a vector. The squared norm of a difference is the sum of squared errors, so the model is trained on the cost of the decision and not on a generic score. |
| Handle curtailment | State-aware baselines. |

**Deliberately not doing**

- Turbine name: an identifier.
- Alarm text: vendor wording.
- Maintenance crew name: irrelevant.

**How the approach is proven**

Prove it offline on Detection lead time on past failures, False alarms per turbine-quarter and Component localisation accuracy using time-ordered splits, then online on "Major component failures" with "Crane cost" as the guardrail. Watch for: Global alarm limits, Counting alarms and No replay of past failures.

## Baseline and production design

- **Baseline (build this first):** Alarm limits from the turbine manufacturer on temperature and vibration, because they are the default.
- **Production design:** A state-conditioned residual model per turbine with trend tests, vibration feature checks and a lead-time estimate feeding crane and parts planning.

## Why AI, and why this kind

**Why AI.** Detect early gearbox and bearing deterioration in wind turbines from SCADA and vibration data so repairs are planned before major component failures. The evidence that separates good from bad outcomes (Gearbox temperature residual, Vibration spectral features, Oil particle and filter data) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A global limit" are what teams reach for first, and they fail because temperature and load vary with wind and season. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A state-conditioned residual model per turbine with trend tests, vibration feature checks and a lead-time estimate feeding crane and parts planning.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Gearbox temperature residual, Vibration spectral features, Oil particle and filter data and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Alarm limits from the turbine manufacturer on temperature and vibration, because they are the default | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A state-conditioned residual model per turbine with trend tests, vibration feature checks and a lead-time estimate feeding crane and parts planning | chosen | Meets the 2500 ms envelope at $0.044 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Major component failures) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Global alarm limits.
- Evaluation trap: Counting alarms.
- Curtailment: operating state is unusual for weeks.
- Sensor replacement: the baseline shifts.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
