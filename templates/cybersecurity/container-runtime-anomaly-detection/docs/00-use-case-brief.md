# Container Runtime Anomaly Detection: use-case brief

> Generated from the blueprint `cybersecurity/container-runtime-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Container Runtime Anomaly Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect compromised containers via syscalls, process trees and network behaviour with low overhead. The system has to run in under 100 milliseconds, inside these limits: Under 3% overhead, Ephemeral workloads and Sparse labelled attacks.

**Why it is hard.** The obvious approach is host-level thresholds, and it fails because containers of one image behave consistently, hosts do not. The second trap is in "Ephemerality": the real signal is build profiles from image and deployment, not instance, while teams usually reach for instance-level baselines.

**Scale and stakes.** At 10 million users this is about 3000.0M model-touching events a day, 34.7K requests per second on average and 208.3K at peak, at an estimated $86.5K a month. A mistake is expensive in the way false quarantines measures it.

**What success looks like.** Offline: Detection of simulated exploits at low FP and Profile coverage. Online: Container compromise dwell time and False quarantines. The launch is judged on "Container compromise dwell time" while "False quarantines" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect compromised containers via syscalls, process trees and network behaviour with low overhead.

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

- Under 3% overhead
- Ephemeral workloads
- Sparse labelled attacks
- Kubernetes-native

## The approach in one paragraph

Start with runtime rules (Falco) with static signatures. Then earn the move to eBPF telemetry feeding per-image profile learners and a sequence anomaly model, with Kubernetes metadata enrichment, and only if it beats the baseline on Detection of simulated exploits at low FP and Profile coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Syscall n-gram novelty | Rare syscall sequences for the image. Exploit behaviour. Guard against: profile coverage. |
| Add Unexpected process spawn | Shell in a service container. Compromise. Guard against: image profile. |
| Add Outbound connection novelty | New destinations. C2. Guard against: profile. |
| Run it as one pipeline | eBPF syscall and network events (node agent), Metadata enricher (Kubernetes API), Image-profile model (sequence model), Anomaly scorer (per-image), Response action (kill or quarantine), SOC alert (queue) and Incident labels (feedback). |
| Optimise the right thing | The objective weighs norm: the length of a vector. The squared norm of a difference is the sum of squared errors, so the model is trained on the cost of the decision and not on a generic score. |
| Handle rolling deployment changes behaviour | Version-aware profile warm-up. |

**Deliberately not doing**

- Container ID: ephemeral.
- Pod IP: ephemeral.

**How the approach is proven**

Prove it offline on Detection of simulated exploits at low FP and Profile coverage using time-ordered splits, then online on "Container compromise dwell time" with "False quarantines" as the guardrail. Watch for: Simulated attacks lacking realism and Profiles learned during an already-compromised period.

## Baseline and production design

- **Baseline (build this first):** Runtime rules (Falco) with static signatures.
- **Production design:** eBPF telemetry feeding per-image profile learners and a sequence anomaly model, with Kubernetes metadata enrichment.

## Why AI, and why this kind

**Why AI.** Detect compromised containers via syscalls, process trees and network behaviour with low overhead. The evidence that separates good from bad outcomes (Syscall n-gram novelty, Unexpected process spawn, Outbound connection novelty) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "host-level thresholds" are what teams reach for first, and they fail because containers of one image behave consistently, hosts do not. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: eBPF telemetry feeding per-image profile learners and a sequence anomaly model, with Kubernetes metadata enrichment.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Syscall n-gram novelty, Unexpected process spawn, Outbound connection novelty and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Runtime rules (Falco) with static signatures | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| eBPF telemetry feeding per-image profile learners and a sequence anomaly model, with Kubernetes metadata enrichment | chosen | Meets the 80 ms envelope at $0.00096 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Container compromise dwell time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Simulated attacks lacking realism.
- Evaluation trap: Profiles learned during an already-compromised period.
- Rolling deployment changes behaviour: alerts fire on new but legitimate version.
- Debug sessions by engineers: flagged as compromise.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
