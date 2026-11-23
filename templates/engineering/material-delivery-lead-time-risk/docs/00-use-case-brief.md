# Material Delivery Lead Time Risk: use-case brief

> Generated from the blueprint `engineering/material-delivery-lead-time-risk` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Material Delivery Lead Time Risk · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict late deliveries of materials and equipment from supplier history and order status and flag orders that threaten the schedule so buyers can expedite or re-sequence. The system has to run as a scheduled batch job, inside these limits: Alerts at least 3 weeks before the needed date, Buyers decide on expediting and Calibrated probabilities.

**Why it is hard.** The obvious approach is orders delivered after the promised date, and it fails because promised dates may be padded. The second trap is in "Impact": the real signal is float on the linked activity, while teams usually reach for lateness alone.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way expedite cost measures it.

**What success looks like.** Offline: Calibration, Recall at the list size and Lead time before need date. Online: Late deliveries impacting the schedule, Expedite cost and Idle crews waiting for materials. The launch is judged on "Late deliveries impacting the schedule" while "Expedite cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict late deliveries of materials and equipment from supplier history and order status and flag orders that threaten the schedule so buyers can expedite or re-sequence.

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

- Alerts at least 3 weeks before the needed date
- Buyers decide on expediting
- Calibrated probabilities
- Weekly scoring of 50K order lines
- Supplier ratings explained

## The approach in one paragraph

Start with expediting lists reviewed by buyers each week, because it is the usual process. Then earn the move to a risk model on order milestones and supplier history that ranks orders by lateness probability and schedule impact and feeds the buyer expediting list, and only if it beats the baseline on Calibration and Recall at the list size after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Supplier on-time history | Past delivery performance. Core. Guard against: from procurement. |
| Add Order status and milestones | Fabrication and shipping steps. Core. Guard against: from supplier updates. |
| Add Linked activity float | Slack on the schedule. Impact. Guard against: from the schedule. |
| Run it as one pipeline | Order and milestone data (procurement system), Feature build (batch), Lateness model (gradient boosting), Calibration (isotonic fit), Float join (schedule), Expedite list (buyer dashboard) and Outcome tracking (monthly). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle single-source item | Early engagement flags. |

**Deliberately not doing**

- Buyer name: personal data.
- Purchase order number: an identifier.
- Supplier brand: weak link.

**How the approach is proven**

Prove it offline on Calibration, Recall at the list size and Lead time before need date using time-ordered splits, then online on "Late deliveries impacting the schedule" with "Expedite cost" as the guardrail. Watch for: Promised date as label, Lateness without float and Automatic supplier penalties.

## Baseline and production design

- **Baseline (build this first):** Expediting lists reviewed by buyers each week, because it is the usual process.
- **Production design:** A risk model on order milestones and supplier history that ranks orders by lateness probability and schedule impact and feeds the buyer expediting list.

## Why AI, and why this kind

**Why AI.** Predict late deliveries of materials and equipment from supplier history and order status and flag orders that threaten the schedule so buyers can expedite or re-sequence. The evidence that separates good from bad outcomes (Supplier on-time history, Order status and milestones, Linked activity float) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "orders delivered after the promised date" are what teams reach for first, and they fail because promised dates may be padded. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A risk model on order milestones and supplier history that ranks orders by lateness probability and schedule impact and feeds the buyer expediting list.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Supplier on-time history, Order status and milestones, Linked activity float and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Expediting lists reviewed by buyers each week, because it is the usual process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A risk model on order milestones and supplier history that ranks orders by lateness probability and schedule impact and feeds the buyer expediting list | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Late deliveries impacting the schedule) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Promised date as label.
- Evaluation trap: Lateness without float.
- Single-source item: there is no alternative supplier.
- Port disruption: shipments are delayed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
