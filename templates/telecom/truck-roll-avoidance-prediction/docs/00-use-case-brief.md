# Truck-Roll Avoidance Prediction: use-case brief

> Generated from the blueprint `telecom/truck-roll-avoidance-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Truck-Roll Avoidance Prediction · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict whether a customer fault can be fixed remotely so a technician is sent only when needed, and remote steps are tried first for the rest. The system has to run interactively, within a few seconds, inside these limits: Never delay a visit for a safety or service-critical fault, Remote steps limited to approved actions and Customer can request a visit.

**Why it is hard.** The obvious approach is visits that closed quickly, and it fails because quick visits can still need a technician. The second trap is in "Safety": the real signal is safety and critical-service rules first, while teams usually reach for a model decision on all faults.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $3.7K a month. A mistake is expensive in the way repeat visits measures it.

**What success looks like.** Offline: Precision of remote-fixable predictions, Missed critical faults and Calibration. Online: Truck rolls avoided, Repeat visits and Time to fix. The launch is judged on "Truck rolls avoided" while "Repeat visits" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict whether a customer fault can be fixed remotely so a technician is sent only when needed, and remote steps are tried first for the rest.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Never delay a visit for a safety or service-critical fault
- Remote steps limited to approved actions
- Customer can request a visit
- Recommendation within 5 s

## The approach in one paragraph

Start with a rule that tries a line test and reset before every visit, because it is a standard first step. Then earn the move to gradient boosting on line, device and ticket features giving fixable-remotely probability with a policy engine for safety rules and a guided remote step sequence, and only if it beats the baseline on Precision of remote-fixable predictions and Missed critical faults after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Line and modem diagnostics | Line quality, sync and reboot history. Remote fixability. Guard against: from the line test. |
| Add Fault description class | Classified customer fault type. Prior for outcome. Guard against: use categories. |
| Add Past visit outcomes on the line | Earlier no-fault-found visits. Pattern signal. Guard against: per line. |
| Run it as one pipeline | Ticket intake (care and field systems), Line test and device data (diagnostic tools), Fixability model (gradient boosting), Safety and critical rules (rule engine), Remote step sequence (device management), Visit decision (dispatch) and Outcome labels (weekly). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle intermittent fault | Repeat tests and flag intermittent patterns. |

**Deliberately not doing**

- Technician name: irrelevant.
- Ticket age alone: weak link.
- Customer name: irrelevant and private.

**How the approach is proven**

Prove it offline on Precision of remote-fixable predictions, Missed critical faults and Calibration using time-ordered splits, then online on "Truck rolls avoided" with "Repeat visits" as the guardrail. Watch for: Delaying critical visits, Learning from visit duration and One remote attempt only.

## Baseline and production design

- **Baseline (build this first):** A rule that tries a line test and reset before every visit, because it is a standard first step.
- **Production design:** Gradient boosting on line, device and ticket features giving fixable-remotely probability with a policy engine for safety rules and a guided remote step sequence.

## Why AI, and why this kind

**Why AI.** Predict whether a customer fault can be fixed remotely so a technician is sent only when needed, and remote steps are tried first for the rest. The evidence that separates good from bad outcomes (Line and modem diagnostics, Fault description class, Past visit outcomes on the line) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "visits that closed quickly" are what teams reach for first, and they fail because quick visits can still need a technician. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting on line, device and ticket features giving fixable-remotely probability with a policy engine for safety rules and a guided remote step sequence.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Line and modem diagnostics, Fault description class, Past visit outcomes on the line and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A rule that tries a line test and reset before every visit, because it is a standard first step | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting on line, device and ticket features giving fixable-remotely probability with a policy engine for safety rules and a guided remote step sequence | chosen | Meets the 2500 ms envelope at $0.205 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Truck rolls avoided) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Delaying critical visits.
- Evaluation trap: Learning from visit duration.
- Intermittent fault: tests pass while the fault remains.
- Vulnerable customer: a visit is needed for safety.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
