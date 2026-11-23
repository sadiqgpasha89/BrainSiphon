# Grid OT Network Anomaly Detection: use-case brief

> Generated from the blueprint `energy/grid-ot-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Grid OT Network Anomaly Detection · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect abnormal behaviour in substation and control-network traffic such as unusual commands, new devices and protocol misuse so the security team investigates before it affects operations. The system has to run interactively, within a few seconds, inside these limits: Passive monitoring only with no inline blocking, Baselines per zone and protocol and Alerts include the device and the change.

**Why it is hard.** The obvious approach is a global baseline, and it fails because substations differ widely. The second trap is in "Mode": the real signal is passive detection with analyst response, while teams usually reach for automatic blocking.

**Scale and stakes.** At 10 million users this is about 150.0M model-touching events a day, 1.7K requests per second on average and 10.4K at peak, at an estimated $24.6K a month. A mistake is expensive in the way unknown devices found measures it.

**What success looks like.** Offline: Detection of seeded anomalies, False alarms per site-week and Time to triage. Online: Mean time to detect, Unknown devices found and Incidents in OT zones. The launch is judged on "Mean time to detect" while "Unknown devices found" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect abnormal behaviour in substation and control-network traffic such as unusual commands, new devices and protocol misuse so the security team investigates before it affects operations.

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

- Passive monitoring only with no inline blocking
- Baselines per zone and protocol
- Alerts include the device and the change
- False alarms under 5 per site per week
- 2K sites

## The approach in one paragraph

Start with signature-based intrusion detection and asset inventory reviews, because they are the standard controls. Then earn the move to a passive monitoring system with protocol-aware baselines and graph anomaly detection that adds maintenance context and sends evidence-rich alerts to the OT security team, and only if it beats the baseline on Detection of seeded anomalies and False alarms per site-week after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around New or changed device | Devices not in the inventory. Core signal. Guard against: from passive discovery. |
| Add Command and function code mix | Control commands seen. Misuse. Guard against: from protocol parsing. |
| Add Flow graph change | New communication pairs. Lateral movement. Guard against: from flow data. |
| Run it as one pipeline | Passive capture (network taps), Protocol parsing (OT-aware parser), Baseline model (per-zone model), Graph change detection (graph analytics) and Context enrichment (change calendar and inventory), with Analyst alert and Feedback off the critical path. |
| Optimise the right thing | The objective weighs norm: the length of a vector. The squared norm of a difference is the sum of squared errors, so the model is trained on the cost of the decision and not on a generic score. |
| Handle maintenance work | Change calendar enrichment. |

**Deliberately not doing**

- Device name: an identifier.
- Analyst name: irrelevant.
- Alert wording: an artefact.

**How the approach is proven**

Prove it offline on Detection of seeded anomalies, False alarms per site-week and Time to triage using time-ordered splits, then online on "Mean time to detect" with "Unknown devices found" as the guardrail. Watch for: Inline blocking, Global baselines and Alerts with no context.

## Baseline and production design

- **Baseline (build this first):** Signature-based intrusion detection and asset inventory reviews, because they are the standard controls.
- **Production design:** A passive monitoring system with protocol-aware baselines and graph anomaly detection that adds maintenance context and sends evidence-rich alerts to the OT security team.

## Why AI, and why this kind

**Why AI.** Detect abnormal behaviour in substation and control-network traffic such as unusual commands, new devices and protocol misuse so the security team investigates before it affects operations. The evidence that separates good from bad outcomes (New or changed device, Command and function code mix, Flow graph change) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A global baseline" are what teams reach for first, and they fail because substations differ widely. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A passive monitoring system with protocol-aware baselines and graph anomaly detection that adds maintenance context and sends evidence-rich alerts to the OT security team.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among New or changed device, Command and function code mix, Flow graph change and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Signature-based intrusion detection and asset inventory reviews, because they are the standard controls | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A passive monitoring system with protocol-aware baselines and graph anomaly detection that adds maintenance context and sends evidence-rich alerts to the OT security team | chosen | Meets the 2500 ms envelope at $0.0055 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mean time to detect) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Inline blocking.
- Evaluation trap: Global baselines.
- Maintenance work: legitimate changes trigger alerts.
- New vendor device: the inventory is incomplete.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
