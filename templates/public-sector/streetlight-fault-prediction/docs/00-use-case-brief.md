# Streetlight Fault Prediction: use-case brief

> Generated from the blueprint `public-sector/streetlight-fault-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Streetlight Fault Prediction · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict luminaire and driver failures from power, dimming and fault data so repairs are scheduled in routes before streets go dark. The system has to run as a scheduled batch job, inside these limits: Failure probability within 30 days, Priority to high-risk streets and crossings and Repair routes optimised.

**Why it is hard.** The obvious approach is resident complaints, and it fails because complaints vary by area and confidence. The second trap is in "Priority": the real signal is safety value of the location, while teams usually reach for failure probability alone.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way repair time measures it.

**What success looks like.** Offline: Calibration of 30-day failure risk, Top-decile capture and Repair time parity across areas. Online: Lights out, Repair time and Night inspections avoided. The launch is judged on "Lights out" while "Repair time" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict luminaire and driver failures from power, dimming and fault data so repairs are scheduled in routes before streets go dark.

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

- Failure probability within 30 days
- Priority to high-risk streets and crossings
- Repair routes optimised
- Weekly run for 400K lights

## The approach in one paragraph

Start with repair after complaints and annual night inspections, because it is the current process. Then earn the move to a failure prediction model with a safety-weighted repair route planner, parity monitoring of repair times by area and a work order link, and only if it beats the baseline on Calibration of 30-day failure risk and Top-decile capture after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Power draw drift | Change in power consumption. Degradation. Guard against: from controllers. |
| Add Dimming and switching faults | Fault codes. Cause. Guard against: from controllers. |
| Add Luminaire age and type | Years and model. Base rate. Guard against: from the register. |
| Run it as one pipeline | Controller data intake (lighting management system), Feature build (aggregated histories), Failure model (gradient boosting), Priority scoring (rules), Route planning (optimiser) and Work order (asset system), with Repair parity review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle controller outage | Outage flags to avoid false failures. |

**Deliberately not doing**

- Light id: an identifier.
- Contractor name: irrelevant.
- Photo name: an artefact.

**How the approach is proven**

Prove it offline on Calibration of 30-day failure risk, Top-decile capture and Repair time parity across areas using time-ordered splits, then online on "Lights out" with "Repair time" as the guardrail. Watch for: Complaint-led repairs, Ignoring location safety and Failure probability as the only priority.

## Baseline and production design

- **Baseline (build this first):** Repair after complaints and annual night inspections, because it is the current process.
- **Production design:** A failure prediction model with a safety-weighted repair route planner, parity monitoring of repair times by area and a work order link.

## Why AI, and why this kind

**Why AI.** Predict luminaire and driver failures from power, dimming and fault data so repairs are scheduled in routes before streets go dark. The evidence that separates good from bad outcomes (Power draw drift, Dimming and switching faults, Luminaire age and type) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "resident complaints" are what teams reach for first, and they fail because complaints vary by area and confidence. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A failure prediction model with a safety-weighted repair route planner, parity monitoring of repair times by area and a work order link.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Power draw drift, Dimming and switching faults, Luminaire age and type and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Repair after complaints and annual night inspections, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A failure prediction model with a safety-weighted repair route planner, parity monitoring of repair times by area and a work order link | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Lights out) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Complaint-led repairs.
- Evaluation trap: Ignoring location safety.
- Controller outage: many lights report no data.
- Firmware update: fault codes change.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
