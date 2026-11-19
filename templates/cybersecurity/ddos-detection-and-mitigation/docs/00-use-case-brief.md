# DDoS Detection & Mitigation: use-case brief

> Generated from the blueprint `cybersecurity/ddos-detection-and-mitigation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** DDoS Detection & Mitigation · **Domain:** cybersecurity · **Latency tier:** sub-10ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect volumetric and application-layer DDoS within seconds and drive mitigation without dropping legitimate traffic. The system has to run in under 10 milliseconds, inside these limits: Terabit-scale traffic, Mitigation decision in seconds and Collateral damage minimised.

**Why it is hard.** The obvious approach is static thresholds, and it fails because legitimate flash crowds exceed static thresholds. The second trap is in "Mitigation": the real signal is surgical signature extraction for filtering, while teams usually reach for block whole sources or prefixes.

**Scale and stakes.** At 10 million users this is about 30000.0M model-touching events a day, 347.2K requests per second on average and 2.8M at peak, at an estimated $1.02M a month. A mistake is expensive in the way customer impact minutes measures it.

**What success looks like.** Offline: Detection delay at fixed FPR and Collateral drop rate. Online: Time to mitigate and Customer impact minutes. The launch is judged on "Time to mitigate" while "Customer impact minutes" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect volumetric and application-layer DDoS within seconds and drive mitigation without dropping legitimate traffic.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{DetectionDelay}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{DetectionDelay} | Penalty that grows the longer an attack runs before it is detected. |

**Hard constraints**

- Terabit-scale traffic
- Mitigation decision in seconds
- Collateral damage minimised
- Always-on

## The approach in one paragraph

Start with rate thresholds with scrubbing on trigger. Then earn the move to streaming sketches for anomaly detection plus automated signature synthesis from sampled packets, with staged mitigation and rollback, and only if it beats the baseline on Detection delay at fixed FPR and Collateral drop rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Packet-rate deviation per destination | Z-score vs seasonal baseline. Volumetric attack. Guard against: seasonal model. |
| Add Source entropy | Distribution of source IPs. Spoofed or botnet. Guard against: window. |
| Add Header/payload pattern clustering | Dominant patterns in sampled traffic. Filter signature. Guard against: sampling. |
| Run it as one pipeline | Flow and sampled packets (routers), Streaming sketches (in-network), Anomaly detector (seasonal baseline), Signature synthesiser (clustering), Mitigation controller (BGP and ACL), NOC (human) and Attack library (labels). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle flash crowd after a product launch | Event feeds and engagement-aware baselines. |

**Deliberately not doing**

- Source country: spoofed.
- Packet size alone: weak.

**How the approach is proven**

Prove it offline on Detection delay at fixed FPR and Collateral drop rate using time-ordered splits, then online on "Time to mitigate" with "Customer impact minutes" as the guardrail. Watch for: Lab floods unlike real attacks and Mitigation tested at low rates.

## Baseline and production design

- **Baseline (build this first):** Rate thresholds with scrubbing on trigger.
- **Production design:** Streaming sketches for anomaly detection plus automated signature synthesis from sampled packets, with staged mitigation and rollback.

## Why AI, and why this kind

**Why AI.** Detect volumetric and application-layer DDoS within seconds and drive mitigation without dropping legitimate traffic. The evidence that separates good from bad outcomes (Packet-rate deviation per destination, Source entropy, Header/payload pattern clustering) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "static thresholds" are what teams reach for first, and they fail because legitimate flash crowds exceed static thresholds. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Streaming sketches for anomaly detection plus automated signature synthesis from sampled packets, with staged mitigation and rollback.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Packet-rate deviation per destination, Source entropy, Header/payload pattern clustering and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rate thresholds with scrubbing on trigger | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Streaming sketches for anomaly detection plus automated signature synthesis from sampled packets, with staged mitigation and rollback | chosen | Meets the 8 ms envelope at $0.0011 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to mitigate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Lab floods unlike real attacks.
- Evaluation trap: Mitigation tested at low rates.
- Flash crowd after a product launch: detected as DDoS and throttled.
- Mitigation filter blocks legitimate traffic: outage for customers.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
