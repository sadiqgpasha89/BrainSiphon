# Wangiri & Premium-Rate Fraud Detection: use-case brief

> Generated from the blueprint `telecom/wangiri-irsf-fraud-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Wangiri & Premium-Rate Fraud Detection · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect call-back, premium-rate and international revenue share fraud in near real time so fraudulent traffic is stopped before large bills and settlement losses accrue. The system has to run interactively, within a few seconds, inside these limits: Alert within 5 minutes of the pattern starting, Blocks limited to destination ranges and approved templates and Genuine customers notified and given a way to appeal.

**Why it is hard.** The obvious approach is total international spend, and it fails because heavy genuine callers look the same on spend. The second trap is in "Speed": the real signal is detection inside minutes, while teams usually reach for next-day batch.

**Scale and stakes.** At 10 million users this is about 144.0M model-touching events a day, 1.7K requests per second on average and 10.0K at peak, at an estimated $7.3K a month. A mistake is expensive in the way genuine calls blocked measures it.

**What success looks like.** Offline: Detection delay on replayed fraud, Precision of range blocks and Loss prevented in backtests. Online: Fraud loss per month, Genuine calls blocked and Customer bill disputes. The launch is judged on "Fraud loss per month" while "Genuine calls blocked" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect call-back, premium-rate and international revenue share fraud in near real time so fraudulent traffic is stopped before large bills and settlement losses accrue.

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

- Alert within 5 minutes of the pattern starting
- Blocks limited to destination ranges and approved templates
- Genuine customers notified and given a way to appeal
- 100M call records per day

## The approach in one paragraph

Start with threshold alerts on spend per destination and calls per hour, because they are the common practice. Then earn the move to a streaming detector with destination risk scores and account baselines that proposes range blocks and customer messages, with a human approval for large blocks and an outcome feedback loop, and only if it beats the baseline on Detection delay on replayed fraud and Precision of range blocks after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Destination risk score | Fraud rate of the destination range from recent weeks. Targets the fraud route. Guard against: update daily. |
| Add Calls per minute spike | Calls per minute against the account's baseline. Burst signal. Guard against: account baseline. |
| Add Missed call to call-back ratio | Inbound missed calls followed by outbound calls. Wangiri pattern. Guard against: per account. |
| Run it as one pipeline | Real-time CDR feed (mediation stream), Windowed features (stream processor), Fraud model (gradient boosting), Destination risk table (daily batch), Block proposal (rule engine) and Customer notification (messaging), with Analyst approval off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new fraud destination | Anomaly features on destination novelty. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Plan name alone: weak link.
- Time zone of destination: weak link.

**How the approach is proven**

Prove it offline on Detection delay on replayed fraud, Precision of range blocks and Loss prevented in backtests using time-ordered splits, then online on "Fraud loss per month" with "Genuine calls blocked" as the guardrail. Watch for: Account blocks for call-back fraud, Batch-only detection and Ignoring event traffic.

## Baseline and production design

- **Baseline (build this first):** Threshold alerts on spend per destination and calls per hour, because they are the common practice.
- **Production design:** A streaming detector with destination risk scores and account baselines that proposes range blocks and customer messages, with a human approval for large blocks and an outcome feedback loop.

## Why AI, and why this kind

**Why AI.** Detect call-back, premium-rate and international revenue share fraud in near real time so fraudulent traffic is stopped before large bills and settlement losses accrue. The evidence that separates good from bad outcomes (Destination risk score, Calls per minute spike, Missed call to call-back ratio) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "total international spend" are what teams reach for first, and they fail because heavy genuine callers look the same on spend. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A streaming detector with destination risk scores and account baselines that proposes range blocks and customer messages, with a human approval for large blocks and an outcome feedback loop.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Destination risk score, Calls per minute spike, Missed call to call-back ratio and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Threshold alerts on spend per destination and calls per hour, because they are the common practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A streaming detector with destination risk scores and account baselines that proposes range blocks and customer messages, with a human approval for large blocks and an outcome feedback loop | chosen | Meets the 2500 ms envelope at $0.0017 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Fraud loss per month) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Account blocks for call-back fraud.
- Evaluation trap: Batch-only detection.
- New fraud destination: the new range has no risk score.
- Genuine event drives calls: a disaster causes calls to a range.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
