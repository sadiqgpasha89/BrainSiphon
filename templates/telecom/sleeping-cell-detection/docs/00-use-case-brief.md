# Sleeping Cell Detection: use-case brief

> Generated from the blueprint `telecom/sleeping-cell-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Sleeping Cell Detection · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect cells that appear healthy to the alarm system but carry no traffic or serve users badly, so silent outages are found in minutes not days. The system has to run interactively, within a few seconds, inside these limits: No dependence on alarms alone, False alarm rate low enough for dispatch and Distinguish planned downtime.

**Why it is hard.** The obvious approach is a fixed minimum traffic, and it fails because quiet rural cells would trigger constantly. The second trap is in "Evidence": the real signal is several KPIs falling together, while teams usually reach for one counter.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 20.0K at peak, at an estimated $9.3K a month. A mistake is expensive in the way customer complaints per silent outage measures it.

**What success looks like.** Offline: Precision and recall on confirmed silent outages, Time to detect against later alarms and False alarms per 1000 cell-days. Online: Silent outage duration, Customer complaints per silent outage and Truck rolls avoided. The launch is judged on "Silent outage duration" while "Customer complaints per silent outage" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect cells that appear healthy to the alarm system but carry no traffic or serve users badly, so silent outages are found in minutes not days.

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

- No dependence on alarms alone
- False alarm rate low enough for dispatch
- Distinguish planned downtime
- Evaluate 200K cells every 15 minutes

## The approach in one paragraph

Start with a threshold on traffic below a fraction of the cell's rolling median, because it is simple and operators already use it. Then earn the move to a peer-conditioned residual detector with a classifier over KPI patterns, scored every 15 minutes and routed with the topology so field and remote teams see the suspected cause, and only if it beats the baseline on Precision and recall on confirmed silent outages and Time to detect against later alarms after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Traffic deviation from peers | Ratio of actual to predicted traffic from similar cells. Primary silent signal. Guard against: peers from the same area and class. |
| Add Attach and handover success | Success rate of connection attempts and handovers. Shows users failing. Guard against: needs sufficient attempts. |
| Add Neighbour load increase | Extra load on neighbours when a cell goes quiet. Corroborates the silence. Guard against: verify neighbours are healthy. |
| Run it as one pipeline | KPI ingestion (time-series store), Peer prediction (forecasting model), Residual and KPI features (batch features), Silent-outage classifier (gradient boosting) and Planned-work filter (change calendar), with Dispatch and remote reset queue and Outcome feedback off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle low-traffic hours | Scale scores by expected traffic and require several KPIs. |

**Deliberately not doing**

- Alarm count: the failure is silent.
- Software version alone: weak link.
- Cell age: unrelated.

**How the approach is proven**

Prove it offline on Precision and recall on confirmed silent outages, Time to detect against later alarms and False alarms per 1000 cell-days using time-ordered splits, then online on "Silent outage duration" with "Customer complaints per silent outage" as the guardrail. Watch for: Training only on alarmed cells, Fixed traffic floors and Ignoring planned work.

## Baseline and production design

- **Baseline (build this first):** A threshold on traffic below a fraction of the cell's rolling median, because it is simple and operators already use it.
- **Production design:** A peer-conditioned residual detector with a classifier over KPI patterns, scored every 15 minutes and routed with the topology so field and remote teams see the suspected cause.

## Why AI, and why this kind

**Why AI.** Detect cells that appear healthy to the alarm system but carry no traffic or serve users badly, so silent outages are found in minutes not days. The evidence that separates good from bad outcomes (Traffic deviation from peers, Attach and handover success, Neighbour load increase) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A fixed minimum traffic" are what teams reach for first, and they fail because quiet rural cells would trigger constantly. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A peer-conditioned residual detector with a classifier over KPI patterns, scored every 15 minutes and routed with the topology so field and remote teams see the suspected cause.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Traffic deviation from peers, Attach and handover success, Neighbour load increase and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A threshold on traffic below a fraction of the cell's rolling median, because it is simple and operators already use it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A peer-conditioned residual detector with a classifier over KPI patterns, scored every 15 minutes and routed with the topology so field and remote teams see the suspected cause | chosen | Meets the 2500 ms envelope at $0.0011 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Silent outage duration) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training only on alarmed cells.
- Evaluation trap: Fixed traffic floors.
- Low-traffic hours: normal traffic looks like an outage.
- Backhaul fault: the cell is fine but unreachable.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
