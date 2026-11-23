# Non-Technical Loss Detection: use-case brief

> Generated from the blueprint `energy/non-technical-loss-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Non-Technical Loss Detection · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find feeders and transformers with unexplained energy losses and rank them for field inspection so theft and metering faults are found at areas, not by profiling individuals. The system has to run as a scheduled batch job, inside these limits: Analysis at transformer and feeder level first, Inspectors verify on site before any action and No customer is penalised on a score alone.

**Why it is hard.** The obvious approach is customer complaints, and it fails because complaints do not show losses. The second trap is in "Unit": the real signal is transformer or feeder balance, while teams usually reach for individual customer scores.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.7K a month. A mistake is expensive in the way wrongful findings measures it.

**What success looks like.** Offline: Inspection hit rate by area, Energy recovered per inspection and Balance model error. Online: Energy recovered, Wrongful findings and Inspection cost per recovery. The launch is judged on "Energy recovered" while "Wrongful findings" must not get worse.

## Objective, loss and constraints

**Business objective.** Find feeders and transformers with unexplained energy losses and rank them for field inspection so theft and metering faults are found at areas, not by profiling individuals.

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

- Analysis at transformer and feeder level first
- Inspectors verify on site before any action
- No customer is penalised on a score alone
- Audit of inspection outcomes across areas
- 2M transformers

## The approach in one paragraph

Start with inspect the areas with the highest reported losses and complaints, because it is the common approach. Then earn the move to a transformer-level balance model with an anomaly score and an inspection planner that balances expected recovery and coverage across areas with fairness checks, and only if it beats the baseline on Inspection hit rate by area and Energy recovered per inspection after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Energy balance gap | Difference between supply and metered consumption. Core signal. Guard against: by transformer. |
| Add Meter anomaly counts | Tamper and communication events. Supporting signal. Guard against: from head-end. |
| Add Technical loss estimate | Modelled network losses. Adjustment. Guard against: from the power flow. |
| Run it as one pipeline | Energy balance data (SCADA and AMI), Technical loss estimate (power flow), Anomaly scoring (model), Inspection planning (route optimiser), Field verification (inspectors) and Result capture (field app), with Fairness and yield audit off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle meter data gaps | Data quality checks before scoring. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Neighbourhood label: a proxy for protected groups.
- Meter serial: an identifier.

**How the approach is proven**

Prove it offline on Inspection hit rate by area, Energy recovered per inspection and Balance model error using time-ordered splits, then online on "Energy recovered" with "Wrongful findings" as the guardrail. Watch for: Individual customer scoring, Penalties from scores and Complaint-based areas only.

## Baseline and production design

- **Baseline (build this first):** Inspect the areas with the highest reported losses and complaints, because it is the common approach.
- **Production design:** A transformer-level balance model with an anomaly score and an inspection planner that balances expected recovery and coverage across areas with fairness checks.

## Why AI, and why this kind

**Why AI.** Find feeders and transformers with unexplained energy losses and rank them for field inspection so theft and metering faults are found at areas, not by profiling individuals. The evidence that separates good from bad outcomes (Energy balance gap, Meter anomaly counts, Technical loss estimate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "customer complaints" are what teams reach for first, and they fail because complaints do not show losses. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A transformer-level balance model with an anomaly score and an inspection planner that balances expected recovery and coverage across areas with fairness checks.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Energy balance gap, Meter anomaly counts, Technical loss estimate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Inspect the areas with the highest reported losses and complaints, because it is the common approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A transformer-level balance model with an anomaly score and an inspection planner that balances expected recovery and coverage across areas with fairness checks | chosen | Meets the run-window envelope at $0.062 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Energy recovered) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Individual customer scoring.
- Evaluation trap: Penalties from scores.
- Meter data gaps: balance errors appear.
- Area bias: some neighbourhoods are inspected more.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
