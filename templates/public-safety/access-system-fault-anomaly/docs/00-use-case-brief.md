# Door and Access System Fault Detection: use-case brief

> Generated from the blueprint `public-safety/access-system-fault-anomaly` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Door and Access System Fault Detection · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect failing readers, doors forced or held open, and tailgating patterns at the door level so facilities fix faults and reduce security gaps, without profiling individual people. The system has to run as a scheduled batch job, inside these limits: Analysis at the door and reader level, No individual employee scoring and Facilities and security review alerts.

**Why it is hard.** The obvious approach is employees, and it fails because employee surveillance harms trust and needs legal basis. The second trap is in "Label": the real signal is fault tickets and verified events, while teams usually reach for alarms alone.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way security gaps closed measures it.

**What success looks like.** Offline: Fault detection against tickets, False alerts per door-month and Time to repair. Online: Door downtime, Security gaps closed and Maintenance cost. The launch is judged on "Door downtime" while "Security gaps closed" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect failing readers, doors forced or held open, and tailgating patterns at the door level so facilities fix faults and reduce security gaps, without profiling individual people.

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

- Analysis at the door and reader level
- No individual employee scoring
- Facilities and security review alerts
- Event data retained for 90 days
- 50K doors

## The approach in one paragraph

Start with alarm responses and periodic maintenance rounds, because they are the standard process. Then earn the move to a door-level anomaly model with fault classification and a maintenance work order link, with aggregation that prevents individual-level views, and only if it beats the baseline on Fault detection against tickets and False alerts per door-month after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Door open duration | Time doors stay open. Fault or misuse. Guard against: from controllers. |
| Add Reader error rate | Failed reads and retries. Reader fault. Guard against: from readers. |
| Add Forced or held alarms | Door alarms. Security event. Guard against: from controllers. |
| Run it as one pipeline | Controller event capture (access control system), Aggregation by door (batch), Anomaly model (change point and classifier), Fault classification (rules), Work order (facilities system) and Outcome tracking (monthly), with Security review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle firmware update | Versioned code maps. |

**Deliberately not doing**

- Employee name: personal data.
- Badge number: an identifier.
- Department: weak link.

**How the approach is proven**

Prove it offline on Fault detection against tickets, False alerts per door-month and Time to repair using time-ordered splits, then online on "Door downtime" with "Security gaps closed" as the guardrail. Watch for: Employee scoring, Alarm counts as labels and Disciplinary use of scores.

## Baseline and production design

- **Baseline (build this first):** Alarm responses and periodic maintenance rounds, because they are the standard process.
- **Production design:** A door-level anomaly model with fault classification and a maintenance work order link, with aggregation that prevents individual-level views.

## Why AI, and why this kind

**Why AI.** Detect failing readers, doors forced or held open, and tailgating patterns at the door level so facilities fix faults and reduce security gaps, without profiling individual people. The evidence that separates good from bad outcomes (Door open duration, Reader error rate, Forced or held alarms) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "employees" are what teams reach for first, and they fail because employee surveillance harms trust and needs legal basis. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A door-level anomaly model with fault classification and a maintenance work order link, with aggregation that prevents individual-level views.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Door open duration, Reader error rate, Forced or held alarms and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Alarm responses and periodic maintenance rounds, because they are the standard process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A door-level anomaly model with fault classification and a maintenance work order link, with aggregation that prevents individual-level views | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Door downtime) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Employee scoring.
- Evaluation trap: Alarm counts as labels.
- Firmware update: event codes change.
- Construction work: doors are held open on purpose.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
