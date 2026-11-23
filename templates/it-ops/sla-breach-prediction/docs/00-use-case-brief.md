# SLA Breach Prediction: use-case brief

> Generated from the blueprint `it-ops/sla-breach-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SLA Breach Prediction · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which open tickets will breach their service level and alert queue owners early enough to rebalance work, using queue and ticket signals and not individual performance. The system has to run interactively, within a few seconds, inside these limits: Alerts at least 2 hours before a breach, Team-level actions only and Calibrated probabilities.

**Why it is hard.** The obvious approach is tickets closed late for any reason, and it fails because customer holds are not breaches. The second trap is in "Action": the real signal is queue rebalancing and escalation, while teams usually reach for chasing individual agents.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.7K a month. A mistake is expensive in the way breaches caught early measures it.

**What success looks like.** Offline: Calibration, Recall at the alert budget and Lead time before breach. Online: SLA breaches, Breaches caught early and Overtime hours. The launch is judged on "SLA breaches" while "Breaches caught early" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which open tickets will breach their service level and alert queue owners early enough to rebalance work, using queue and ticket signals and not individual performance.

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

- Alerts at least 2 hours before a breach
- Team-level actions only
- Calibrated probabilities
- Score refresh every 5 minutes
- 50K open tickets

## The approach in one paragraph

Start with colour-coded timers on tickets, because they are the standard feature. Then earn the move to a risk model on open tickets with queue context that raises early alerts to queue owners with suggested rebalancing steps, and only if it beats the baseline on Calibration and Recall at the alert budget after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Time remaining versus predicted work | Clock and estimated effort. Core. Guard against: from the ITSM. |
| Add Queue load and staffing | Open items and available people. Core. Guard against: from the queue. |
| Add Waiting state | Waiting on customer or vendor. Pause. Guard against: from the ticket. |
| Run it as one pipeline | Open ticket stream (ITSM), Feature build (queue and ticket data), Breach model (gradient boosting), Calibration (isotonic fit) and Rebalancing (team leads), with Queue owner alert and Outcome review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle surge of tickets | Surge mode with wider alerts. |

**Deliberately not doing**

- Agent name: personal data.
- Requester name: personal data.
- Ticket number: an identifier.

**How the approach is proven**

Prove it offline on Calibration, Recall at the alert budget and Lead time before breach using time-ordered splits, then online on "SLA breaches" with "Breaches caught early" as the guardrail. Watch for: Individual agent pressure, Late-closed as breach and Ignoring clock pauses.

## Baseline and production design

- **Baseline (build this first):** Colour-coded timers on tickets, because they are the standard feature.
- **Production design:** A risk model on open tickets with queue context that raises early alerts to queue owners with suggested rebalancing steps.

## Why AI, and why this kind

**Why AI.** Predict which open tickets will breach their service level and alert queue owners early enough to rebalance work, using queue and ticket signals and not individual performance. The evidence that separates good from bad outcomes (Time remaining versus predicted work, Queue load and staffing, Waiting state) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "tickets closed late for any reason" are what teams reach for first, and they fail because customer holds are not breaches. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A risk model on open tickets with queue context that raises early alerts to queue owners with suggested rebalancing steps.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Time remaining versus predicted work, Queue load and staffing, Waiting state and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Colour-coded timers on tickets, because they are the standard feature | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A risk model on open tickets with queue context that raises early alerts to queue owners with suggested rebalancing steps | chosen | Meets the 2500 ms envelope at $0.041 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (SLA breaches) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Individual agent pressure.
- Evaluation trap: Late-closed as breach.
- Surge of tickets: queue volume jumps after an outage.
- Clock pauses: tickets pause and resume often.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
