# ICS/OT Intrusion Detection: use-case brief

> Generated from the blueprint `cybersecurity/ics-ot-intrusion-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** ICS/OT Intrusion Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect malicious commands and process manipulation in industrial control networks using protocol-aware and physics-based models without disrupting operations. The system has to run in under 100 milliseconds, inside these limits: Passive monitoring only, Deterministic protocols (Modbus, DNP3) and Safety-critical.

**Why it is hard.** The obvious approach is iT-style network anomaly only, and it fails because attacks that manipulate setpoints look like normal traffic. The second trap is in "Allow-lists": the real signal is learned communication allow-lists, while teams usually reach for generic signatures.

**Scale and stakes.** At 10 million users this is about 10800.0M model-touching events a day, 125.0K requests per second on average and 750.0K at peak, at an estimated $630.3K a month. A mistake is expensive in the way operator disruption events measures it.

**What success looks like.** Offline: Detection of replayed attack scenarios and False alarms per week. Online: Time to detect OT anomalies and Operator disruption events. The launch is judged on "Time to detect OT anomalies" while "Operator disruption events" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect malicious commands and process manipulation in industrial control networks using protocol-aware and physics-based models without disrupting operations.

**Training objective.** `\mathcal{L}=\|x_t-\hat x_t\|^2+\lambda\,\mathrm{PhysicsResidual}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \\|x\\| | Norm: the length of a vector. The squared norm of a difference is the sum of squared errors. |
| x_t | The sensor reading at time t from the industrial process; the hat is the model's reconstruction of it. |
| \hat{x}_t | The reconstruction of the input x produced by the decoder. (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{PhysicsResidual} | Penalty when predicted readings violate known physical laws of the plant, such as conservation of mass. |

**Hard constraints**

- Passive monitoring only
- Deterministic protocols (Modbus, DNP3)
- Safety-critical
- Very low false positives

## The approach in one paragraph

Start with allow-listing with protocol-aware IDS. Then earn the move to protocol parser plus communication-graph allow-list model and physics-informed residual detectors per process unit, and only if it beats the baseline on Detection of replayed attack scenarios and False alarms per week after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Command-sequence deviation | Unexpected function codes. Unauthorised control. Guard against: protocol parsing. |
| Add Sensor-physics residual | Residual from process model. Spoofed sensors. Guard against: model. |
| Add New communicator | Previously unseen device pair. Lateral movement. Guard against: baseline. |
| Run it as one pipeline | SPAN or tap capture (passive sensors), Protocol dissector (DPI), Communication graph model (allow-list), Process residual model (physics-informed), Alert correlation (rules), OT security operator (human) and Incident labels (feedback). |
| Optimise the right thing | The objective weighs norm: the length of a vector. The squared norm of a difference is the sum of squared errors, so the model is trained on the cost of the decision and not on a generic score. |
| Handle planned maintenance changes setpoints | Maintenance-mode integration with approvals. |

**Deliberately not doing**

- Packet timing jitter: network.
- Vendor banner: none.

**How the approach is proven**

Prove it offline on Detection of replayed attack scenarios and False alarms per week using time-ordered splits, then online on "Time to detect OT anomalies" with "Operator disruption events" as the guardrail. Watch for: Testbed attacks lacking plant realism and Overfitting to one plant.

## Baseline and production design

- **Baseline (build this first):** Allow-listing with protocol-aware IDS.
- **Production design:** Protocol parser plus communication-graph allow-list model and physics-informed residual detectors per process unit.

## Why AI, and why this kind

**Why AI.** Detect malicious commands and process manipulation in industrial control networks using protocol-aware and physics-based models without disrupting operations. The evidence that separates good from bad outcomes (Command-sequence deviation, Sensor-physics residual, New communicator) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "IT-style network anomaly only" are what teams reach for first, and they fail because attacks that manipulate setpoints look like normal traffic. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Protocol parser plus communication-graph allow-list model and physics-informed residual detectors per process unit.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Command-sequence deviation, Sensor-physics residual, New communicator and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Allow-listing with protocol-aware IDS | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Protocol parser plus communication-graph allow-list model and physics-informed residual detectors per process unit | chosen | Meets the 80 ms envelope at $0.0019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to detect OT anomalies) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Testbed attacks lacking plant realism.
- Evaluation trap: Overfitting to one plant.
- Planned maintenance changes setpoints: residual alerts flood.
- Legacy device with proprietary protocol: a proprietary legacy protocol cannot be parsed so the device has no visibility at all.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
