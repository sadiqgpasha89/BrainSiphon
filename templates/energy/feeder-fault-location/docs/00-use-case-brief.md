# Feeder Fault Location from Waveforms: use-case brief

> Generated from the blueprint `energy/feeder-fault-location` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Feeder Fault Location from Waveforms · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate the location of a fault on a distribution feeder from relay and meter waveforms so crews drive to the right span first and restoration is faster. The system has to run interactively, within a few seconds, inside these limits: Candidate span list within 30 s of the fault, Top three spans cover the true location at least 85% of the time and Works with sparse measurement points.

**Why it is hard.** The obvious approach is impedance estimates alone, and it fails because physics estimates drift with the feeder model. The second trap is in "Model": the real signal is a hybrid of physics and learning, while teams usually reach for a learned map with no network model.

**Scale and stakes.** At 10 million users this is about 60.0M model-touching events a day, 694 requests per second on average and 4.2K at peak, at an estimated $8.2K a month. A mistake is expensive in the way restoration time measures it.

**What success looks like.** Offline: Top-three coverage on confirmed faults, Distance error and Latency from event to list. Online: Patrol time per fault, Restoration time and Repeat faults on the same span. The launch is judged on "Patrol time per fault" while "Restoration time" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate the location of a fault on a distribution feeder from relay and meter waveforms so crews drive to the right span first and restoration is faster.

**Training objective.** `\mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Candidate span list within 30 s of the fault
- Top three spans cover the true location at least 85% of the time
- Works with sparse measurement points
- Confirmed locations feed back
- 5K feeders

## The approach in one paragraph

Start with impedance-based distance estimation on the feeder model, because protection engineers use it today. Then earn the move to a hybrid physics and learned model that corrects impedance estimates with meter sag patterns and topology state to produce a ranked span list, retrained on confirmed locations, and only if it beats the baseline on Top-three coverage on confirmed faults and Distance error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Apparent impedance to the fault | Impedance computed from relay phasors. Distance estimate. Guard against: needs the feeder model. |
| Add Fault type and phases | Type of fault from relay data. Narrows the cause. Guard against: from relay events. |
| Add Downstream meter voltage sags | Sag depth at smart meters. Branch isolation. Guard against: time aligned. |
| Run it as one pipeline | Relay and meter waveform capture (protection and AMI data), Event alignment (time synchronisation), Topology lookup (ADMS model), Distance model (hybrid estimator), Span ranking (GIS join) and Crew dispatch hint (outage console), with Confirmation feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle wrong topology | Check the live state and flag stale models. |

**Deliberately not doing**

- Relay serial number: an identifier.
- Crew name: irrelevant.
- Event log wording: formatting.

**How the approach is proven**

Prove it offline on Top-three coverage on confirmed faults, Distance error and Latency from event to list using time-ordered splits, then online on "Patrol time per fault" with "Restoration time" as the guardrail. Watch for: Learning without a network model, Single-point output and Ignoring topology state.

## Baseline and production design

- **Baseline (build this first):** Impedance-based distance estimation on the feeder model, because protection engineers use it today.
- **Production design:** A hybrid physics and learned model that corrects impedance estimates with meter sag patterns and topology state to produce a ranked span list, retrained on confirmed locations.

## Why AI, and why this kind

**Why AI.** Estimate the location of a fault on a distribution feeder from relay and meter waveforms so crews drive to the right span first and restoration is faster. The evidence that separates good from bad outcomes (Apparent impedance to the fault, Fault type and phases, Downstream meter voltage sags) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "impedance estimates alone" are what teams reach for first, and they fail because physics estimates drift with the feeder model. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A hybrid physics and learned model that corrects impedance estimates with meter sag patterns and topology state to produce a ranked span list, retrained on confirmed locations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Apparent impedance to the fault, Fault type and phases, Downstream meter voltage sags and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Impedance-based distance estimation on the feeder model, because protection engineers use it today | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A hybrid physics and learned model that corrects impedance estimates with meter sag patterns and topology state to produce a ranked span list, retrained on confirmed locations | chosen | Meets the 2500 ms envelope at $0.0046 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Patrol time per fault) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Learning without a network model.
- Evaluation trap: Single-point output.
- Wrong topology: the model has the wrong switch state.
- Intermittent fault: the fault clears and recurs.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
