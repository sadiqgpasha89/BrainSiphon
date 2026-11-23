# Vibration Anomaly Detection: use-case brief

> Generated from the blueprint `manufacturing/vibration-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vibration Anomaly Detection · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect unusual vibration patterns on machines against their own healthy baseline so engineers investigate before a fault becomes a failure. The system has to run interactively, within a few seconds, inside these limits: Per-asset baselines by operating state, Alarm false rate under 1 per asset per month and Explanation by frequency band.

**Why it is hard.** The obvious approach is one threshold per machine, and it fails because vibration changes with operating state. The second trap is in "Explanation": the real signal is which frequency band moved, while teams usually reach for an anomaly score alone.

**Scale and stakes.** At 10 million users this is about 144.0M model-touching events a day, 1.7K requests per second on average and 10.0K at peak, at an estimated $12.8K a month. A mistake is expensive in the way engineer time per alarm measures it.

**What success looks like.** Offline: Detection rate on replayed faults, False alarms per asset-month and Lead time before failure. Online: Faults found before failure, Engineer time per alarm and Unplanned stops. The launch is judged on "Faults found before failure" while "Engineer time per alarm" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect unusual vibration patterns on machines against their own healthy baseline so engineers investigate before a fault becomes a failure.

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

- Per-asset baselines by operating state
- Alarm false rate under 1 per asset per month
- Explanation by frequency band
- Edge scoring for 20K sensors

## The approach in one paragraph

Start with fixed alarm limits on overall velocity per machine class, because iSO severity charts are the common practice. Then earn the move to an autoencoder or isolation forest per operating state on spectral features with calibrated scores and band-level explanations, run on edge devices and reviewed by condition-monitoring engineers, and only if it beats the baseline on Detection rate on replayed faults and False alarms per asset-month after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Band energy ratio | Energy in the bearing and gear bands against the baseline. Fault location. Guard against: per machine type. |
| Add Kurtosis and crest factor | Impulsiveness of the signal. Early bearing damage. Guard against: window size matters. |
| Add Operating state | Speed and load clusters. Conditioning. Guard against: from controller tags. |
| Run it as one pipeline | Vibration capture (edge gateway), Spectral feature extraction (signal processing), State assignment (clustering), Anomaly scoring (autoencoder) and Band explanation (feature attribution), with Engineer review and Fault feedback off the critical path. |
| Optimise the right thing | The objective weighs norm: the length of a vector. The squared norm of a difference is the sum of squared errors, so the model is trained on the cost of the decision and not on a generic score. |
| Handle process change | State clustering and baseline refresh on approved changes. |

**Deliberately not doing**

- Machine name: an identifier.
- Sensor installation date: weak link.
- Shift number: not a cause.

**How the approach is proven**

Prove it offline on Detection rate on replayed faults, False alarms per asset-month and Lead time before failure using time-ordered splits, then online on "Faults found before failure" with "Engineer time per alarm" as the guardrail. Watch for: One threshold for all states, No fault replay and Alarms without explanation.

## Baseline and production design

- **Baseline (build this first):** Fixed alarm limits on overall velocity per machine class, because ISO severity charts are the common practice.
- **Production design:** An autoencoder or isolation forest per operating state on spectral features with calibrated scores and band-level explanations, run on edge devices and reviewed by condition-monitoring engineers.

## Why AI, and why this kind

**Why AI.** Detect unusual vibration patterns on machines against their own healthy baseline so engineers investigate before a fault becomes a failure. The evidence that separates good from bad outcomes (Band energy ratio, Kurtosis and crest factor, Operating state) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one threshold per machine" are what teams reach for first, and they fail because vibration changes with operating state. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: An autoencoder or isolation forest per operating state on spectral features with calibrated scores and band-level explanations, run on edge devices and reviewed by condition-monitoring engineers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Band energy ratio, Kurtosis and crest factor, Operating state and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed alarm limits on overall velocity per machine class, because ISO severity charts are the common practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An autoencoder or isolation forest per operating state on spectral features with calibrated scores and band-level explanations, run on edge devices and reviewed by condition-monitoring engineers | chosen | Meets the 2500 ms envelope at $0.0030 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Faults found before failure) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: One threshold for all states.
- Evaluation trap: No fault replay.
- Process change: normal behaviour changes.
- Sensor mounting loosens: spurious spikes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
