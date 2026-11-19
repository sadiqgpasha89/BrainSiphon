# Warehouse Equipment Anomaly Detection: use-case brief

> Generated from the blueprint `supply-chain/predictive-maintenance-warehouse-equipment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Warehouse Equipment Anomaly Detection · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect abnormal vibration, current and temperature in conveyors, sorters and AGVs in real time to prevent line stoppages. The system has to run in under 100 milliseconds, inside these limits: Edge inference on PLC-adjacent hardware, Few failure labels and Low false alarms.

**Why it is hard.** The obvious approach is supervised failure classifier, and it fails because failures are rare and diverse. The second trap is in "Context": the real signal is operating-mode-conditional baselines, while teams usually reach for global thresholds.

**Scale and stakes.** At 10 million users this is about 4320.0M model-touching events a day, 50.0K requests per second on average and 300.0K at peak, at an estimated $123.6K a month. A mistake is expensive in the way maintenance cost measures it.

**What success looks like.** Offline: Detection lead time before failure and False-alarm rate per machine-month. Online: Unplanned stoppage minutes and Maintenance cost. The launch is judged on "Unplanned stoppage minutes" while "Maintenance cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect abnormal vibration, current and temperature in conveyors, sorters and AGVs in real time to prevent line stoppages.

**Training objective.** `\mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2+\beta\,\mathrm{KL}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \\|x\\| | Norm: the length of a vector. The squared norm of a difference is the sum of squared errors. |
| x | The input features describing one example (what the model sees). |
| \mathrm{Dec} | The decoder: the network part that rebuilds the input from its compressed code. |
| \mathrm{Enc} | The encoder: the network part that compresses the input into a short code. |
| \beta | Weight on the KL term that keeps the learned code close to a standard normal distribution: how strongly it counts against the main objective. |
| \mathrm{KL} | Kullback-Leibler divergence: how far the learned code distribution is from the standard normal prior. |

**Hard constraints**

- Edge inference on PLC-adjacent hardware
- Few failure labels
- Low false alarms
- Explanation to technicians

## The approach in one paragraph

Start with static alarm thresholds on vibration RMS. Then earn the move to mode-conditional autoencoder or normalising-flow on spectral features at the edge, with technician-facing feature attributions, and only if it beats the baseline on Detection lead time before failure and False-alarm rate per machine-month after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Spectral vibration features | Band energies and harmonics. Bearing faults. Guard against: sampling rate. |
| Add Motor current signature | Harmonic ratios. Electrical faults. Guard against: load condition. |
| Add Residual to healthy model | Reconstruction error by mode. Anomaly. Guard against: mode label. |
| Run it as one pipeline | Sensors (vibration and current), Edge preprocessor (spectral transform), Anomaly model (autoencoder on edge), Alert aggregator (debounce), Maintenance ticket (CMMS), Technician check (human) and Failure confirmation (labels). |
| Optimise the right thing | The objective weighs norm: the length of a vector. The squared norm of a difference is the sum of squared errors, so the model is trained on the cost of the decision and not on a generic score. |
| Handle normal operating mode change | Mode detection and per-mode baselines. |

**Deliberately not doing**

- Raw timestamp: none.
- Machine serial: encoded in mode.

**How the approach is proven**

Prove it offline on Detection lead time before failure and False-alarm rate per machine-month using time-ordered splits, then online on "Unplanned stoppage minutes" with "Maintenance cost" as the guardrail. Watch for: Seeded faults unlike real failures and Evaluating on healthy periods only.

## Baseline and production design

- **Baseline (build this first):** Static alarm thresholds on vibration RMS.
- **Production design:** Mode-conditional autoencoder or normalising-flow on spectral features at the edge, with technician-facing feature attributions.

## Why AI, and why this kind

**Why AI.** Detect abnormal vibration, current and temperature in conveyors, sorters and AGVs in real time to prevent line stoppages. The evidence that separates good from bad outcomes (Spectral vibration features, Motor current signature, Residual to healthy model) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "supervised failure classifier" are what teams reach for first, and they fail because failures are rare and diverse. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Mode-conditional autoencoder or normalising-flow on spectral features at the edge, with technician-facing feature attributions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Spectral vibration features, Motor current signature, Residual to healthy model and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static alarm thresholds on vibration RMS | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Mode-conditional autoencoder or normalising-flow on spectral features at the edge, with technician-facing feature attributions | chosen | Meets the 80 ms envelope at $0.00095 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unplanned stoppage minutes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Seeded faults unlike real failures.
- Evaluation trap: Evaluating on healthy periods only.
- Normal operating mode change: a legitimate change in speed or load makes healthy vibration look anomalous and floods alarms.
- Sensor mounting loosened: spurious signals.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
