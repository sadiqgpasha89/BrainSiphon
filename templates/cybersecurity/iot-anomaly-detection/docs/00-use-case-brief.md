# IoT Device Anomaly Detection: use-case brief

> Generated from the blueprint `cybersecurity/iot-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** IoT Device Anomaly Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect compromised or malfunctioning IoT devices from network and telemetry patterns with models light enough for gateways. The system has to run in under 100 milliseconds, inside these limits: Gateway CPU limits, Millions of device types and Intermittent connectivity.

**Why it is hard.** The obvious approach is one global model, and it fails because device behaviours differ completely by type. The second trap is in "Fingerprint": the real signal is passive device identification, while teams usually reach for trust declared device type.

**Scale and stakes.** At 10 million users this is about 4320.0M model-touching events a day, 50.0K requests per second on average and 300.0K at peak, at an estimated $123.6K a month. A mistake is expensive in the way alert noise measures it.

**What success looks like.** Offline: Detection of injected anomalies and False alarms per device-month. Online: Compromised devices quarantined and Alert noise. The launch is judged on "Compromised devices quarantined" while "Alert noise" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect compromised or malfunctioning IoT devices from network and telemetry patterns with models light enough for gateways.

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

- Gateway CPU limits
- Millions of device types
- Intermittent connectivity
- Sparse labels

## The approach in one paragraph

Start with static allow-lists of destinations per device. Then earn the move to per-type lightweight autoencoder or isolation forest at the gateway, with cloud-side fleet-level clustering and fingerprinting, and only if it beats the baseline on Detection of injected anomalies and False alarms per device-month after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Destination set deviation | New endpoints contacted. Compromise. Guard against: device profile. |
| Add Traffic periodicity change | Change in cadence. Malfunction or botnet. Guard against: spectral. |
| Add Firmware version and CVE exposure | Known vulnerabilities. Risk. Guard against: inventory. |
| Run it as one pipeline | Network taps and telemetry (gateway), Device fingerprinting (passive ML), Profile model (per-type), Anomaly scorer (edge model), Quarantine action (NAC), Security operations (human) and Fleet learning (cloud). |
| Optimise the right thing | The objective weighs norm: the length of a vector. The squared norm of a difference is the sum of squared errors, so the model is trained on the cost of the decision and not on a generic score. |
| Handle firmware update changes behaviour | Update-window awareness with profile refresh. |

**Deliberately not doing**

- MAC address: spoofable.
- Signal strength: environment.

**How the approach is proven**

Prove it offline on Detection of injected anomalies and False alarms per device-month using time-ordered splits, then online on "Compromised devices quarantined" with "Alert noise" as the guardrail. Watch for: Injected attacks unlike real botnets and Single vendor test fleet.

## Baseline and production design

- **Baseline (build this first):** Static allow-lists of destinations per device.
- **Production design:** Per-type lightweight autoencoder or isolation forest at the gateway, with cloud-side fleet-level clustering and fingerprinting.

## Why AI, and why this kind

**Why AI.** Detect compromised or malfunctioning IoT devices from network and telemetry patterns with models light enough for gateways. The evidence that separates good from bad outcomes (Destination set deviation, Traffic periodicity change, Firmware version and CVE exposure) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one global model" are what teams reach for first, and they fail because device behaviours differ completely by type. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Per-type lightweight autoencoder or isolation forest at the gateway, with cloud-side fleet-level clustering and fingerprinting.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Destination set deviation, Traffic periodicity change, Firmware version and CVE exposure and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static allow-lists of destinations per device | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Per-type lightweight autoencoder or isolation forest at the gateway, with cloud-side fleet-level clustering and fingerprinting | chosen | Meets the 80 ms envelope at $0.00095 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Compromised devices quarantined) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Injected attacks unlike real botnets.
- Evaluation trap: Single vendor test fleet.
- Firmware update changes behaviour: flagged as anomalous.
- Network outage disconnects devices: missing data looks anomalous.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
