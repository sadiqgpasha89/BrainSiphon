# Municipal Building Energy Anomaly Detection: use-case brief

> Generated from the blueprint `public-sector/municipal-building-energy-anomaly` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Municipal Building Energy Anomaly Detection · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find buildings with abnormal energy use among schools, libraries and offices so faults and wasted heating or cooling are fixed. The system has to run as a scheduled batch job, inside these limits: Baselines weather-adjusted per building, Estimated waste in energy and cost and Facilities team confirms before work.

**Why it is hard.** The obvious approach is absolute use, and it fails because use changes with season and occupancy. The second trap is in "Action": the real signal is a ranked list with likely cause, while teams usually reach for a heat map.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 3.3K at peak, at an estimated $9.0K a month. A mistake is expensive in the way faults found measures it.

**What success looks like.** Offline: Detection of seeded faults, Savings estimate error and False alerts per building. Online: Energy per square metre, Faults found and Comfort complaints. The launch is judged on "Energy per square metre" while "Faults found" must not get worse.

## Objective, loss and constraints

**Business objective.** Find buildings with abnormal energy use among schools, libraries and offices so faults and wasted heating or cooling are fixed.

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

- Baselines weather-adjusted per building
- Estimated waste in energy and cost
- Facilities team confirms before work
- Weekly run for 3K buildings

## The approach in one paragraph

Start with monthly energy reports by building and a review of the highest users, because it is the common approach. Then earn the move to a weather- and schedule-normalised anomaly model with cause hints and a work order flow plus a check that comfort targets are kept, and only if it beats the baseline on Detection of seeded faults and Savings estimate error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Weather-adjusted consumption | Use against expected for the weather. Core signal. Guard against: from meters. |
| Add Schedule deviation | Operation outside opening hours. Waste. Guard against: from schedules. |
| Add Equipment alarms | Heating and ventilation faults. Cause. Guard against: from building systems. |
| Run it as one pipeline | Meter and building data (energy management system), Normalisation (regression), Anomaly detection (change point), Cause hints (rules), Work order (facilities system) and Verification (before after check), with Comfort review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle occupancy change | Schedule updates. |

**Deliberately not doing**

- Building name: an identifier.
- Caretaker name: irrelevant.
- Photo name: an artefact.

**How the approach is proven**

Prove it offline on Detection of seeded faults, Savings estimate error and False alerts per building using time-ordered splits, then online on "Energy per square metre" with "Faults found" as the guardrail. Watch for: Absolute use comparisons, Blind reductions and Heat maps with no actions.

## Baseline and production design

- **Baseline (build this first):** Monthly energy reports by building and a review of the highest users, because it is the common approach.
- **Production design:** A weather- and schedule-normalised anomaly model with cause hints and a work order flow plus a check that comfort targets are kept.

## Why AI, and why this kind

**Why AI.** Find buildings with abnormal energy use among schools, libraries and offices so faults and wasted heating or cooling are fixed. The evidence that separates good from bad outcomes (Weather-adjusted consumption, Schedule deviation, Equipment alarms) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "absolute use" are what teams reach for first, and they fail because use changes with season and occupancy. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A weather- and schedule-normalised anomaly model with cause hints and a work order flow plus a check that comfort targets are kept.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Weather-adjusted consumption, Schedule deviation, Equipment alarms and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Monthly energy reports by building and a review of the highest users, because it is the common approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A weather- and schedule-normalised anomaly model with cause hints and a work order flow plus a check that comfort targets are kept | chosen | Meets the run-window envelope at $0.0010 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Energy per square metre) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Absolute use comparisons.
- Evaluation trap: Blind reductions.
- Occupancy change: a building is used differently.
- Meter fault: readings are wrong.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
