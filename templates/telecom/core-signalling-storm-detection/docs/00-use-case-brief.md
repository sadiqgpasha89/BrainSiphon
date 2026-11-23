# Core Signalling Storm Detection: use-case brief

> Generated from the blueprint `telecom/core-signalling-storm-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Core Signalling Storm Detection · **Domain:** telecom · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect abnormal signalling surges in the mobile core early enough to throttle or isolate the source before it overloads authentication and session functions. The system has to run in under 100 milliseconds, inside these limits: Detection decision under 80 ms per window, Throttling limited to approved templates with automatic expiry and Emergency calls and priority traffic never throttled.

**Why it is hard.** The obvious approach is one global threshold, and it fails because healthy peaks look like storms. The second trap is in "Source": the real signal is concentration of load on a few devices or an app, while teams usually reach for total rate alone.

**Scale and stakes.** At 10 million users this is about 300.0M model-touching events a day, 3.5K requests per second on average and 20.8K at peak, at an estimated $9.8K a month. A mistake is expensive in the way storm-induced outages measures it.

**What success looks like.** Offline: Detection delay and false alarm rate on replayed storms, Priority traffic loss in tests and Source attribution accuracy. Online: Core overload minutes, Storm-induced outages and Throttle duration. The launch is judged on "Core overload minutes" while "Storm-induced outages" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect abnormal signalling surges in the mobile core early enough to throttle or isolate the source before it overloads authentication and session functions.

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

- Detection decision under 80 ms per window
- Throttling limited to approved templates with automatic expiry
- Emergency calls and priority traffic never throttled
- 50K signalling events per second

## The approach in one paragraph

Start with static rate thresholds per function with an alarm to the core team, because they are simple and easy to audit. Then earn the move to a streaming detector with seasonal baselines and source concentration features that proposes a class-based throttle template, gated by approval above a severity level and expiring automatically, and only if it beats the baseline on Detection delay and false alarm rate on replayed storms and Priority traffic loss in tests after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Rate versus expected | Ratio of signalling per minute to the time-adjusted baseline. Surge signal. Guard against: baseline per function. |
| Add Source concentration | Share of events from the top 1% of sources. Targets the cause. Guard against: needs pseudonymous grouping. |
| Add Failure and retry ratio | Ratio of rejects and retries to requests. Positive feedback loop sign. Guard against: tune per message type. |
| Run it as one pipeline | Signalling ingestion (stream processor), Windowed rates (streaming aggregation), Baseline and anomaly score (seasonal model), Source attribution (top-k sketches), Throttle proposal (rule layer), Approval and apply (core controller) and Recovery check (KPI monitor). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle firmware update storm | Event calendar for known mass updates and staged throttling. |

**Deliberately not doing**

- Subscriber name: irrelevant and private.
- Server hostname: encodes location only.
- Raw event count without baseline: follows traffic.

**How the approach is proven**

Prove it offline on Detection delay and false alarm rate on replayed storms, Priority traffic loss in tests and Source attribution accuracy using time-ordered splits, then online on "Core overload minutes" with "Storm-induced outages" as the guardrail. Watch for: Global thresholds, Throttling by cell instead of source and Not testing emergency traffic.

## Baseline and production design

- **Baseline (build this first):** Static rate thresholds per function with an alarm to the core team, because they are simple and easy to audit.
- **Production design:** A streaming detector with seasonal baselines and source concentration features that proposes a class-based throttle template, gated by approval above a severity level and expiring automatically.

## Why AI, and why this kind

**Why AI.** Detect abnormal signalling surges in the mobile core early enough to throttle or isolate the source before it overloads authentication and session functions. The evidence that separates good from bad outcomes (Rate versus expected, Source concentration, Failure and retry ratio) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one global threshold" are what teams reach for first, and they fail because healthy peaks look like storms. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A streaming detector with seasonal baselines and source concentration features that proposes a class-based throttle template, gated by approval above a severity level and expiring automatically.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Rate versus expected, Source concentration, Failure and retry ratio and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static rate thresholds per function with an alarm to the core team, because they are simple and easy to audit | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A streaming detector with seasonal baselines and source concentration features that proposes a class-based throttle template, gated by approval above a severity level and expiring automatically | chosen | Meets the 80 ms envelope at $0.0011 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Core overload minutes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Global thresholds.
- Evaluation trap: Throttling by cell instead of source.
- Firmware update storm: legitimate devices all reconnect.
- Throttle blocks priority traffic: safety calls fail.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
