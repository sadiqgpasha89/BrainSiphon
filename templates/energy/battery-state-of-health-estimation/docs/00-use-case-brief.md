# Battery State of Health Estimation: use-case brief

> Generated from the blueprint `energy/battery-state-of-health-estimation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Battery State of Health Estimation · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate battery capacity and resistance from operating data without full test cycles so ageing is tracked and the end of life is planned. The system has to run as a scheduled batch job, inside these limits: Capacity estimate with an interval, Works from partial cycles and Alerts for accelerated ageing.

**Why it is hard.** The obvious approach is the management system estimate alone, and it fails because vendor estimates drift. The second trap is in "Data": the real signal is partial and noisy cycles, while teams usually reach for full test cycles.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way warranty claims measures it.

**What success looks like.** Offline: Capacity error against tests, Interval coverage and Lead time of ageing alerts. Online: Replacement timing error, Warranty claims and Unexpected capacity loss. The launch is judged on "Replacement timing error" while "Warranty claims" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate battery capacity and resistance from operating data without full test cycles so ageing is tracked and the end of life is planned.

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

- Capacity estimate with an interval
- Works from partial cycles
- Alerts for accelerated ageing
- Weekly run for 100K batteries

## The approach in one paragraph

Start with the manufacturer's health estimate and fixed cycle count limits, because they are the default. Then earn the move to a hybrid physics and learning ageing model fitted on partial cycles with calibration on test results, interval output and fleet comparison for accelerated ageing, and only if it beats the baseline on Capacity error against tests and Interval coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Capacity from partial charge | Capacity inferred from partial cycles. Core estimate. Guard against: normalised. |
| Add Internal resistance trend | Rise in resistance. Ageing. Guard against: from current and voltage. |
| Add Temperature exposure | Time at high temperature. Ageing driver. Guard against: from sensors. |
| Run it as one pipeline | Telemetry capture (battery management system), Cycle segmentation (signal processing), Capacity and resistance estimate (hybrid model), Calibration on tests (periodic checks), Alerts and forecast (asset console), Warranty tracking (contract system) and Retraining (quarterly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle sensor drift | Cross-checks and calibration. |

**Deliberately not doing**

- Site name: an identifier.
- Operator name: irrelevant.
- Log format: an artefact.

**How the approach is proven**

Prove it offline on Capacity error against tests, Interval coverage and Lead time of ageing alerts using time-ordered splits, then online on "Replacement timing error" with "Warranty claims" as the guardrail. Watch for: Vendor estimate only, Full-cycle assumptions and Point estimates only.

## Baseline and production design

- **Baseline (build this first):** The manufacturer's health estimate and fixed cycle count limits, because they are the default.
- **Production design:** A hybrid physics and learning ageing model fitted on partial cycles with calibration on test results, interval output and fleet comparison for accelerated ageing.

## Why AI, and why this kind

**Why AI.** Estimate battery capacity and resistance from operating data without full test cycles so ageing is tracked and the end of life is planned. The evidence that separates good from bad outcomes (Capacity from partial charge, Internal resistance trend, Temperature exposure) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the management system estimate alone" are what teams reach for first, and they fail because vendor estimates drift. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A hybrid physics and learning ageing model fitted on partial cycles with calibration on test results, interval output and fleet comparison for accelerated ageing.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Capacity from partial charge, Internal resistance trend, Temperature exposure and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: The manufacturer's health estimate and fixed cycle count limits, because they are the default | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A hybrid physics and learning ageing model fitted on partial cycles with calibration on test results, interval output and fleet comparison for accelerated ageing | chosen | Meets the run-window envelope at $0.021 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Replacement timing error) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Vendor estimate only.
- Evaluation trap: Full-cycle assumptions.
- Sensor drift: voltage or current readings are wrong.
- Mixed chemistries: models differ by cell type.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
