# Network Intrusion Detection via Flow Anomalies: use-case brief

> Generated from the blueprint `cybersecurity/network-intrusion-detection-flow-anomaly` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Network Intrusion Detection via Flow Anomalies · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect lateral movement, scanning and command-and-control from network flow metadata at line rate, including in encrypted traffic. The system has to run in under 100 milliseconds, inside these limits: 100 Gbps links, Encrypted payloads invisible and Alert precision for SOC.

**Why it is hard.** The obvious approach is payload signatures, and it fails because tLS hides payloads and signatures lag new attacks. The second trap is in "Benchmarks": the real signal is evaluate on recent real traffic with temporal splits, while teams usually reach for public datasets like KDD/CICIDS.

**Scale and stakes.** At 10 million users this is about 6000.0M model-touching events a day, 69.4K requests per second on average and 416.7K at peak, at an estimated $171.8K a month. A mistake is expensive in the way analyst false-positive hours measures it.

**What success looks like.** Offline: Recall at fixed alerts per day and Precision on analyst-verified alerts. Online: Mean time to detect and Analyst false-positive hours. The launch is judged on "Mean time to detect" while "Analyst false-positive hours" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect lateral movement, scanning and command-and-control from network flow metadata at line rate, including in encrypted traffic.

**Training objective.** `\mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2+\lambda\,\mathrm{SemiSupervisedBCE}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \\|x\\| | Norm: the length of a vector. The squared norm of a difference is the sum of squared errors. |
| x | The input features describing one example (what the model sees). |
| \mathrm{Dec} | The decoder: the network part that rebuilds the input from its compressed code. |
| \mathrm{Enc} | The encoder: the network part that compresses the input into a short code. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{SemiSupervisedBCE} | Binary cross-entropy applied only to the few flows with known labels, which steers the unsupervised model toward real attacks. |

**Hard constraints**

- 100 Gbps links
- Encrypted payloads invisible
- Alert precision for SOC
- Edge sensor CPU limits

## The approach in one paragraph

Start with signature-based IDS rules (Snort/Suricata) plus static thresholds. Then earn the move to per-role autoencoder and gradient-boosted classifier on streaming flow aggregates, with host-role baselines and a graph layer for lateral movement, and only if it beats the baseline on Recall at fixed alerts per day and Precision on analyst-verified alerts after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Fan-out and new-destination rate | Distinct new peers per host per hour. Scanning and lateral movement. Guard against: window and baseline exclude the alert. |
| Add Beaconing periodicity | Autocorrelation of connection intervals. C2 beacons. Guard against: jitter handling. |
| Add Byte ratio asymmetry | Upload to download ratio. Exfiltration. Guard against: direction labelling. |
| Run it as one pipeline | Flow collectors (NetFlow and eBPF), Flow aggregator (Flink windows), Role-aware baseline (per-role model), Anomaly and class model (GBDT plus autoencoder) and Alert enrichment (asset and identity context), with SOC queue and Analyst verdicts off the critical path. |
| Optimise the right thing | The objective weighs norm: the length of a vector. The squared norm of a difference is the sum of squared errors, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new backup job creates huge uploads | Change-calendar integration and per-role baselines with maintenance windows. |

**Deliberately not doing**

- Source port: ephemeral and random.
- Absolute packet counts: scale with host role not intent.

**How the approach is proven**

Prove it offline on Recall at fixed alerts per day and Precision on analyst-verified alerts using time-ordered splits, then online on "Mean time to detect" with "Analyst false-positive hours" as the guardrail. Watch for: Training on public datasets with unrealistic attacks and Random flow splits leak the same session across train and test.

## Baseline and production design

- **Baseline (build this first):** Signature-based IDS rules (Snort/Suricata) plus static thresholds.
- **Production design:** Per-role autoencoder and gradient-boosted classifier on streaming flow aggregates, with host-role baselines and a graph layer for lateral movement.

## Why AI, and why this kind

**Why AI.** Detect lateral movement, scanning and command-and-control from network flow metadata at line rate, including in encrypted traffic. The evidence that separates good from bad outcomes (Fan-out and new-destination rate, Beaconing periodicity, Byte ratio asymmetry) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "payload signatures" are what teams reach for first, and they fail because TLS hides payloads and signatures lag new attacks. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Per-role autoencoder and gradient-boosted classifier on streaming flow aggregates, with host-role baselines and a graph layer for lateral movement.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Fan-out and new-destination rate, Beaconing periodicity, Byte ratio asymmetry and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Signature-based IDS rules (Snort/Suricata) plus static thresholds | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Per-role autoencoder and gradient-boosted classifier on streaming flow aggregates, with host-role baselines and a graph layer for lateral movement | chosen | Meets the 80 ms envelope at $0.00095 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mean time to detect) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on public datasets with unrealistic attacks.
- Evaluation trap: Random flow splits leak the same session across train and test.
- New backup job creates huge uploads: exfiltration alerts fire on a legitimate scheduled transfer.
- Sensor drops packets under load: features are silently biased low and attacks hide.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
