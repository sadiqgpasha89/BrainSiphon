# Water Network Leak Detection: use-case brief

> Generated from the blueprint `energy/water-network-leak-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Water Network Leak Detection · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect and localise leaks in water distribution from district meter flows, pressure loggers and acoustic sensors so crews find them before they burst. The system has to run as a scheduled batch job, inside these limits: Night-flow baselines per district, Leak area list within 24 hours and Estimated loss volume with a range.

**Why it is hard.** The obvious approach is total flow, and it fails because daytime flow hides leaks. The second trap is in "Location": the real signal is pressure and acoustic cues to narrow the search, while teams usually reach for a district alarm.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 3.3K at peak, at an estimated $9.0K a month. A mistake is expensive in the way time to repair measures it.

**What success looks like.** Offline: Detection of seeded leaks, Location hit rate and Estimated volume error. Online: Water lost, Time to repair and Burst frequency. The launch is judged on "Water lost" while "Time to repair" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect and localise leaks in water distribution from district meter flows, pressure loggers and acoustic sensors so crews find them before they burst.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Night-flow baselines per district
- Leak area list within 24 hours
- Estimated loss volume with a range
- Crew confirms before excavation
- 3K districts

## The approach in one paragraph

Start with alarm when night flow exceeds a fixed threshold, because it is a common practice. Then earn the move to a district baseline model on night flow with pressure and acoustic corroboration and a hydraulic model that ranks candidate pipes, with a work order link, and only if it beats the baseline on Detection of seeded leaks and Location hit rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Minimum night flow | Flow in the lowest-use hours. Leak indicator. Guard against: from district meters. |
| Add Pressure transient pattern | Pressure drops and surges. Burst signal. Guard against: from loggers. |
| Add Acoustic noise level | Leak noise on hydrophones. Location. Guard against: from sensors. |
| Run it as one pipeline | Flow and pressure capture (SCADA), Night-flow baseline (regression), Leak anomaly detector (change point), Location ranking (hydraulic model), Alert and work order (network console), Crew verification (field app) and Savings check (before after). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle large user event | Customer event flags and filters. |

**Deliberately not doing**

- Meter name: an identifier.
- Crew name: irrelevant.
- Alarm wording: an artefact.

**How the approach is proven**

Prove it offline on Detection of seeded leaks, Location hit rate and Estimated volume error using time-ordered splits, then online on "Water lost" with "Time to repair" as the guardrail. Watch for: Total flow monitoring, Fixed thresholds and No corroboration.

## Baseline and production design

- **Baseline (build this first):** Alarm when night flow exceeds a fixed threshold, because it is a common practice.
- **Production design:** A district baseline model on night flow with pressure and acoustic corroboration and a hydraulic model that ranks candidate pipes, with a work order link.

## Why AI, and why this kind

**Why AI.** Detect and localise leaks in water distribution from district meter flows, pressure loggers and acoustic sensors so crews find them before they burst. The evidence that separates good from bad outcomes (Minimum night flow, Pressure transient pattern, Acoustic noise level) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "total flow" are what teams reach for first, and they fail because daytime flow hides leaks. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A district baseline model on night flow with pressure and acoustic corroboration and a hydraulic model that ranks candidate pipes, with a work order link.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Minimum night flow, Pressure transient pattern, Acoustic noise level and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Alarm when night flow exceeds a fixed threshold, because it is a common practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A district baseline model on night flow with pressure and acoustic corroboration and a hydraulic model that ranks candidate pipes, with a work order link | chosen | Meets the run-window envelope at $0.0010 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Water lost) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Total flow monitoring.
- Evaluation trap: Fixed thresholds.
- Large user event: a customer fills a tank.
- Valve operation: flow changes after operations.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
