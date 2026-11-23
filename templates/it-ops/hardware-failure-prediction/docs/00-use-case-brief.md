# Hardware Failure Prediction: use-case brief

> Generated from the blueprint `it-ops/hardware-failure-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Hardware Failure Prediction · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict disk, memory and power supply failures from device telemetry so teams replace parts during planned windows and avoid unplanned outages. The system has to run as a scheduled batch job, inside these limits: Prediction lead time of at least 7 days, Replacements scheduled by owners and Data kept on devices protected during returns.

**Why it is hard.** The obvious approach is alerts only, and it fails because alerts include false warnings. The second trap is in "Action": the real signal is planned replacement or migration, while teams usually reach for replace at a fixed age.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way spare parts cost measures it.

**What success looks like.** Offline: Lead time at the alert rate, Calibration and Recall of failures. Online: Unplanned hardware outages, Spare parts cost and Replacement lead time. The launch is judged on "Unplanned hardware outages" while "Spare parts cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict disk, memory and power supply failures from device telemetry so teams replace parts during planned windows and avoid unplanned outages.

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

- Prediction lead time of at least 7 days
- Replacements scheduled by owners
- Data kept on devices protected during returns
- Calibrated risk scores
- 500K devices

## The approach in one paragraph

Start with vendor health alerts and scheduled refresh by age, because they are the usual practice. Then earn the move to a survival model on telemetry that produces calibrated failure risk with lead time and opens replacement tasks in planned windows, and only if it beats the baseline on Lead time at the alert rate and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around SMART and error counters | Disk reallocated sectors and errors. Core. Guard against: from device telemetry. |
| Add Temperature and power trend | Thermal and power drift. Support. Guard against: from sensors. |
| Add Age and model | Hardware batch and age. Prior. Guard against: from the CMDB. |
| Run it as one pipeline | Telemetry collection (device agents), Feature build (batch), Failure model (survival model), Calibration (isotonic fit), Replacement task (ITSM), Window scheduling (change process) and Outcome tracking (monthly). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new hardware model | Vendor priors and wide risk bands. |

**Deliberately not doing**

- Serial number: an identifier.
- Rack name: weak link.
- Vendor support level: weak link.

**How the approach is proven**

Prove it offline on Lead time at the alert rate, Calibration and Recall of failures using time-ordered splits, then online on "Unplanned hardware outages" with "Spare parts cost" as the guardrail. Watch for: Fixed-age replacement, Alerts as labels and Equal error costs.

## Baseline and production design

- **Baseline (build this first):** Vendor health alerts and scheduled refresh by age, because they are the usual practice.
- **Production design:** A survival model on telemetry that produces calibrated failure risk with lead time and opens replacement tasks in planned windows.

## Why AI, and why this kind

**Why AI.** Predict disk, memory and power supply failures from device telemetry so teams replace parts during planned windows and avoid unplanned outages. The evidence that separates good from bad outcomes (SMART and error counters, Temperature and power trend, Age and model) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "alerts only" are what teams reach for first, and they fail because alerts include false warnings. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A survival model on telemetry that produces calibrated failure risk with lead time and opens replacement tasks in planned windows.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among SMART and error counters, Temperature and power trend, Age and model and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Vendor health alerts and scheduled refresh by age, because they are the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A survival model on telemetry that produces calibrated failure risk with lead time and opens replacement tasks in planned windows | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unplanned hardware outages) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Fixed-age replacement.
- Evaluation trap: Alerts as labels.
- New hardware model: there is no failure history.
- Correlated batch failure: many devices share a defect.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
