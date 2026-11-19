# Fleet Predictive Maintenance: use-case brief

> Generated from the blueprint `supply-chain/predictive-maintenance-fleet` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fleet Predictive Maintenance · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict component failures from telematics and service history to schedule maintenance before breakdowns. The system has to run as a scheduled batch job, inside these limits: Downtime costs, Telematics gaps and Explainable component-level alerts.

**Why it is hard.** The obvious approach is binary failure flag, and it fails because preventive replacement censors failures. The second trap is in "Cost": the real signal is cost-sensitive thresholds per component, while teams usually reach for single threshold.

**Scale and stakes.** At 10 million users this is about 72.0M model-touching events a day, 833 requests per second on average and 833 at peak, at an estimated $6.2K a month. A mistake is expensive in the way maintenance cost per km measures it.

**What success looks like.** Offline: Time-dependent AUC and Cost savings in simulation. Online: Unplanned breakdowns and Maintenance cost per km. The launch is judged on "Unplanned breakdowns" while "Maintenance cost per km" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict component failures from telematics and service history to schedule maintenance before breakdowns.

**Training objective.** `\mathcal{L}=\mathrm{BCE}\text{(failure within horizon)}+\lambda\,\mathrm{CostWeighting}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy on whether the vehicle fails within the horizon. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{CostWeighting} | Weight that makes missed failures on costly or critical vehicles count more. |

**Hard constraints**

- Downtime costs
- Telematics gaps
- Explainable component-level alerts
- Weekly planning

## The approach in one paragraph

Start with fixed-interval maintenance. Then earn the move to component-wise survival and gradient-boosted models with sensor embeddings, cost-sensitive thresholds and maintenance schedule optimiser, and only if it beats the baseline on Time-dependent AUC and Cost savings in simulation after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Sensor degradation trend | Slope of vibration, temperature or voltage. Wear. Guard against: sensor calibration. |
| Add Usage intensity | Engine hours and load profile. Stress. Guard against: telematics. |
| Add Service history gap | Days since last service of the part. Risk. Guard against: maintenance records. |
| Run it as one pipeline | Telematics stream (IoT hub), Feature builder (Spark), Component risk models (survival GBDT), Maintenance optimiser (scheduling), Workshop booking (fleet system) and Failure and service records (labels), with Technician review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy on whether the vehicle fails within the horizon, so the model is trained on the cost of the decision and not on a generic score. |
| Handle sensor firmware update changes scale | Firmware-aware normalisation. |

**Deliberately not doing**

- Vehicle colour: none.
- Driver ID: personal.

**How the approach is proven**

Prove it offline on Time-dependent AUC and Cost savings in simulation using time-ordered splits, then online on "Unplanned breakdowns" with "Maintenance cost per km" as the guardrail. Watch for: Treating replaced parts as non-failures and Random split across vehicles over time.

## Baseline and production design

- **Baseline (build this first):** Fixed-interval maintenance.
- **Production design:** Component-wise survival and gradient-boosted models with sensor embeddings, cost-sensitive thresholds and maintenance schedule optimiser.

## Why AI, and why this kind

**Why AI.** Predict component failures from telematics and service history to schedule maintenance before breakdowns. The evidence that separates good from bad outcomes (Sensor degradation trend, Usage intensity, Service history gap) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "binary failure flag" are what teams reach for first, and they fail because preventive replacement censors failures. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Component-wise survival and gradient-boosted models with sensor embeddings, cost-sensitive thresholds and maintenance schedule optimiser.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Sensor degradation trend, Usage intensity, Service history gap and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed-interval maintenance | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Component-wise survival and gradient-boosted models with sensor embeddings, cost-sensitive thresholds and maintenance schedule optimiser | chosen | Meets the run-window envelope at $0.0029 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unplanned breakdowns) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating replaced parts as non-failures.
- Evaluation trap: Random split across vehicles over time.
- Sensor firmware update changes scale: a firmware update rescales sensor values so features shift and predictions degrade.
- Preventive replacement hides failure labels: model underestimates risk.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
