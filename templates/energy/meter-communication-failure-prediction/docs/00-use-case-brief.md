# Meter Communication Failure Prediction: use-case brief

> Generated from the blueprint `energy/meter-communication-failure-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Meter Communication Failure Prediction · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which meters and collectors will lose communication in the coming weeks so repairs are planned and reads do not become estimates. The system has to run as a scheduled batch job, inside these limits: Probability of failure within 30 days, Collector and meter level lists and Reason hints for the field team.

**Why it is hard.** The obvious approach is single missed reads, and it fails because short misses are noise. The second trap is in "Cause": the real signal is radio, power or device fault, while teams usually reach for a score only.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.7K a month. A mistake is expensive in the way truck rolls measures it.

**What success looks like.** Offline: Calibration of 30-day failure risk, Top-decile capture and Cause hint accuracy. Online: Estimated read share, Truck rolls and Time with no communication. The launch is judged on "Estimated read share" while "Truck rolls" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which meters and collectors will lose communication in the coming weeks so repairs are planned and reads do not become estimates.

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

- Probability of failure within 30 days
- Collector and meter level lists
- Reason hints for the field team
- Weekly run for 10M endpoints

## The approach in one paragraph

Start with repair meters after they have not reported for a set number of days, because it is the standard process. Then earn the move to a calibrated model of failure within 30 days with cause hints and a route-optimised preventive work plan, and only if it beats the baseline on Calibration of 30-day failure risk and Top-decile capture after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Signal strength trend | Change in radio signal and retry counts. Early sign. Guard against: from head-end. |
| Add Collector load and age | Number of meters on a collector and its age. Capacity risk. Guard against: from network data. |
| Add Firmware and model family | Firmware version and hardware model. Known issues. Guard against: from the register. |
| Run it as one pipeline | Head-end data extraction (AMI system), Feature build (aggregated histories), Failure model (gradient boosting), Cause hint (rules), Route plan (optimiser), Work order (field system) and Outcome tracking (monthly). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle firmware rollout | Firmware flags and a pause in alerts. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Meter serial: an identifier.
- Install crew name: irrelevant.

**How the approach is proven**

Prove it offline on Calibration of 30-day failure risk, Top-decile capture and Cause hint accuracy using time-ordered splits, then online on "Estimated read share" with "Truck rolls" as the guardrail. Watch for: Reactive repair only, Ignoring firmware and Counting short misses as failures.

## Baseline and production design

- **Baseline (build this first):** Repair meters after they have not reported for a set number of days, because it is the standard process.
- **Production design:** A calibrated model of failure within 30 days with cause hints and a route-optimised preventive work plan.

## Why AI, and why this kind

**Why AI.** Predict which meters and collectors will lose communication in the coming weeks so repairs are planned and reads do not become estimates. The evidence that separates good from bad outcomes (Signal strength trend, Collector load and age, Firmware and model family) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single missed reads" are what teams reach for first, and they fail because short misses are noise. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A calibrated model of failure within 30 days with cause hints and a route-optimised preventive work plan.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Signal strength trend, Collector load and age, Firmware and model family and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Repair meters after they have not reported for a set number of days, because it is the standard process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A calibrated model of failure within 30 days with cause hints and a route-optimised preventive work plan | chosen | Meets the run-window envelope at $0.092 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Estimated read share) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Reactive repair only.
- Evaluation trap: Ignoring firmware.
- Firmware rollout: communication changes for a family.
- Storm outage: many meters go quiet at once.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
