# Compressed Air Leak Detection: use-case brief

> Generated from the blueprint `manufacturing/compressed-air-leak-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Compressed Air Leak Detection · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect compressed air leaks from flow, pressure and compressor data and prioritise repairs by energy cost so waste falls. The system has to run as a scheduled batch job, inside these limits: Leak estimate in cubic metres per hour with a range, Production-off baselines and Priority by cost.

**Why it is hard.** The obvious approach is total flow, and it fails because production use hides leaks. The second trap is in "Location": the real signal is zone-level flow with ultrasonic surveys, while teams usually reach for plant-wide flow.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 3.3K at peak, at an estimated $5.3K a month. A mistake is expensive in the way leaks repaired measures it.

**What success looks like.** Offline: Leak estimate error on surveyed leaks, Detection of seeded leaks and Savings accuracy. Online: Air energy per unit produced, Leaks repaired and Compressor hours. The launch is judged on "Air energy per unit produced" while "Leaks repaired" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect compressed air leaks from flow, pressure and compressor data and prioritise repairs by energy cost so waste falls.

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

- Leak estimate in cubic metres per hour with a range
- Production-off baselines
- Priority by cost
- Daily run for 300 sites

## The approach in one paragraph

Start with periodic ultrasonic surveys by technicians, because it is the standard method and finds specific leaks. Then earn the move to a baseline model on idle flow and zone submeters with a leak growth detector, repair priorities by energy cost and a work-order link for survey teams, and only if it beats the baseline on Leak estimate error on surveyed leaks and Detection of seeded leaks after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Idle-period flow | Flow during shutdown windows. Leak rate. Guard against: from the production calendar. |
| Add Compressor load factor | Loaded versus unloaded time. Efficiency. Guard against: from the compressor. |
| Add Pressure decay rate | Pressure drop in isolated zones. Leak size. Guard against: from valves. |
| Run it as one pipeline | Flow and pressure capture (metering system), Idle period detection (production calendar), Baseline model (regression), Leak growth detector (change point), Priority list (cost model), Work order (CMMS) and Savings verification (before after check). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle no idle window | Use low-load windows and zone isolation. |

**Deliberately not doing**

- Meter name: an identifier.
- Operator name: irrelevant.
- Alarm text: vendor formatting.

**How the approach is proven**

Prove it offline on Leak estimate error on surveyed leaks, Detection of seeded leaks and Savings accuracy using time-ordered splits, then online on "Air energy per unit produced" with "Leaks repaired" as the guardrail. Watch for: Total flow monitoring only, Counting leaks not cost and Ignoring sensor drift.

## Baseline and production design

- **Baseline (build this first):** Periodic ultrasonic surveys by technicians, because it is the standard method and finds specific leaks.
- **Production design:** A baseline model on idle flow and zone submeters with a leak growth detector, repair priorities by energy cost and a work-order link for survey teams.

## Why AI, and why this kind

**Why AI.** Detect compressed air leaks from flow, pressure and compressor data and prioritise repairs by energy cost so waste falls. The evidence that separates good from bad outcomes (Idle-period flow, Compressor load factor, Pressure decay rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "total flow" are what teams reach for first, and they fail because production use hides leaks. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A baseline model on idle flow and zone submeters with a leak growth detector, repair priorities by energy cost and a work-order link for survey teams.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Idle-period flow, Compressor load factor, Pressure decay rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Periodic ultrasonic surveys by technicians, because it is the standard method and finds specific leaks | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A baseline model on idle flow and zone submeters with a leak growth detector, repair priorities by energy cost and a work-order link for survey teams | chosen | Meets the run-window envelope at $0.00062 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Air energy per unit produced) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Total flow monitoring only.
- Evaluation trap: Counting leaks not cost.
- No idle window: the plant never stops.
- Process change: the baseline shifts.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
