# Ransomware Early Detection: use-case brief

> Generated from the blueprint `cybersecurity/ransomware-early-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ransomware Early Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect mass file encryption within seconds on endpoints and file servers to stop it before significant data is lost. The system has to run in under 100 milliseconds, inside these limits: Detection within 10 seconds, Very low false positives on backup and compression tools and Minimal I/O overhead.

**Why it is hard.** The obvious approach is static file signatures, and it fails because new ransomware families have no signatures. The second trap is in "Speed": the real signal is early partial-encryption detection, while teams usually reach for waiting for full evidence.

**Scale and stakes.** At 10 million users this is about 300.0M model-touching events a day, 3.5K requests per second on average and 20.8K at peak, at an estimated $13.6K a month. A mistake is expensive in the way business interruption events measures it.

**What success looks like.** Offline: Detection latency and files lost at fixed FPR and Recall by family. Online: Files encrypted before containment and Business interruption events. The launch is judged on "Files encrypted before containment" while "Business interruption events" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect mass file encryption within seconds on endpoints and file servers to stop it before significant data is lost.

**Training objective.** `\mathcal{L}=\mathrm{FL}(y,p)+\lambda\,\mathrm{DetectionDelay}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{DetectionDelay} | Penalty that grows the longer after encryption starts the model takes to raise an alert. |

**Hard constraints**

- Detection within 10 seconds
- Very low false positives on backup and compression tools
- Minimal I/O overhead
- Auto-containment

## The approach in one paragraph

Start with canary files and signature AV. Then earn the move to streaming behavioural classifier on I/O telemetry with kernel-level hooks, canary files and automatic process suspension plus snapshot rollback, and only if it beats the baseline on Detection latency and files lost at fixed FPR and Recall by family after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Write entropy jump | Entropy of written blocks vs original. Encryption. Guard against: block sampling. |
| Add Rename and extension change rate | Files renamed per second. Mass change. Guard against: time window. |
| Add Process lineage anomaly | Process spawned by office app or script. Initial access. Guard against: lineage data. |
| Run it as one pipeline | Kernel I/O telemetry (minifilter driver), Sliding-window features (on-agent), Behaviour classifier (small GBDT), Containment (process suspend), Snapshot rollback (storage), SOC alert (queue) and Incident labels (cloud). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle legitimate encryption tools (backup, disk encryption) | Allow-listed signed encryptors and context-aware scoring. |

**Deliberately not doing**

- File path names: highly variable.
- Process name: trivial to change.

**How the approach is proven**

Prove it offline on Detection latency and files lost at fixed FPR and Recall by family using time-ordered splits, then online on "Files encrypted before containment" with "Business interruption events" as the guardrail. Watch for: Lab ransomware samples differ from live attacks and Benign tools underrepresented in tests.

## Baseline and production design

- **Baseline (build this first):** Canary files and signature AV.
- **Production design:** Streaming behavioural classifier on I/O telemetry with kernel-level hooks, canary files and automatic process suspension plus snapshot rollback.

## Why AI, and why this kind

**Why AI.** Detect mass file encryption within seconds on endpoints and file servers to stop it before significant data is lost. The evidence that separates good from bad outcomes (Write entropy jump, Rename and extension change rate, Process lineage anomaly) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "static file signatures" are what teams reach for first, and they fail because new ransomware families have no signatures. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Streaming behavioural classifier on I/O telemetry with kernel-level hooks, canary files and automatic process suspension plus snapshot rollback.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Write entropy jump, Rename and extension change rate, Process lineage anomaly and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Canary files and signature AV | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Streaming behavioural classifier on I/O telemetry with kernel-level hooks, canary files and automatic process suspension plus snapshot rollback | chosen | Meets the 80 ms envelope at $0.0015 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Files encrypted before containment) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Lab ransomware samples differ from live attacks.
- Evaluation trap: Benign tools underrepresented in tests.
- Legitimate encryption tools (backup, disk encryption): production file servers get frozen.
- Intermittent or slow encryption to evade thresholds: detection delayed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
