# Statistical Process Control Drift Detection: use-case brief

> Generated from the blueprint `manufacturing/spc-drift-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Statistical Process Control Drift Detection · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect slow drifts and shifts in process measurements earlier than classic control charts while keeping the false alarm rate low enough for operators to act. The system has to run interactively, within a few seconds, inside these limits: Alert false alarm rate under one per line per week, Interpretable charts operators know and Limits per product and tool.

**Why it is hard.** The obvious approach is shewhart limits only, and it fails because slow drifts stay within the limits for days. The second trap is in "Context": the real signal is limits set per product, tool and material, while teams usually reach for one limit for all.

**Scale and stakes.** At 10 million users this is about 180.0M model-touching events a day, 2.1K requests per second on average and 12.5K at peak, at an estimated $6.6K a month. A mistake is expensive in the way out-of-spec output measures it.

**What success looks like.** Offline: Average run length to detect a seeded shift, False alarms per stream per month and Alarm precision. Online: Time from drift onset to action, Out-of-spec output and Operator alarm acknowledgement rate. The launch is judged on "Time from drift onset to action" while "Out-of-spec output" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect slow drifts and shifts in process measurements earlier than classic control charts while keeping the false alarm rate low enough for operators to act.

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

- Alert false alarm rate under one per line per week
- Interpretable charts operators know
- Limits per product and tool
- 50K measurement streams

## The approach in one paragraph

Start with shewhart X-bar and R charts with standard run rules, because they are the quality standard. Then earn the move to per-stream EWMA and CUSUM detectors with change-point detection on tool-segmented data, a response-plan link for each alarm type and a dashboard for engineers, and only if it beats the baseline on Average run length to detect a seeded shift and False alarms per stream per month after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around CUSUM statistic | Cumulative sum of deviations from the target. Detects small shifts. Guard against: reset after corrective action. |
| Add EWMA residual | Exponentially weighted moving residual. Smooth drift signal. Guard against: tune the weight per process. |
| Add Run-rule violations | Counts of Western Electric rule hits. Familiar to operators. Guard against: combine with the model score. |
| Run it as one pipeline | Measurement ingestion (historian), Stream segmentation by tool and product (stream processor), Drift detectors (CUSUM EWMA change-point), Alarm scoring (gradient boosting), Response plan lookup (quality system) and Operator acknowledgement (HMI), with Limit review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle planned recipe change | Recipe change events reset the baseline. |

**Deliberately not doing**

- Operator name: not a cause.
- Measurement timestamp precision: an artefact.
- Product colour: no link.

**How the approach is proven**

Prove it offline on Average run length to detect a seeded shift, False alarms per stream per month and Alarm precision using time-ordered splits, then online on "Time from drift onset to action" with "Out-of-spec output" as the guardrail. Watch for: One limit for mixed populations, Alarms with no response plan and Ignoring gauge error.

## Baseline and production design

- **Baseline (build this first):** Shewhart X-bar and R charts with standard run rules, because they are the quality standard.
- **Production design:** Per-stream EWMA and CUSUM detectors with change-point detection on tool-segmented data, a response-plan link for each alarm type and a dashboard for engineers.

## Why AI, and why this kind

**Why AI.** Detect slow drifts and shifts in process measurements earlier than classic control charts while keeping the false alarm rate low enough for operators to act. The evidence that separates good from bad outcomes (CUSUM statistic, EWMA residual, Run-rule violations) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "shewhart limits only" are what teams reach for first, and they fail because slow drifts stay within the limits for days. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Per-stream EWMA and CUSUM detectors with change-point detection on tool-segmented data, a response-plan link for each alarm type and a dashboard for engineers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among CUSUM statistic, EWMA residual, Run-rule violations and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Shewhart X-bar and R charts with standard run rules, because they are the quality standard | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Per-stream EWMA and CUSUM detectors with change-point detection on tool-segmented data, a response-plan link for each alarm type and a dashboard for engineers | chosen | Meets the 2500 ms envelope at $0.0012 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time from drift onset to action) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: One limit for mixed populations.
- Evaluation trap: Alarms with no response plan.
- Planned recipe change: the process shifts on purpose.
- Gauge error: measurement system drifts.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
