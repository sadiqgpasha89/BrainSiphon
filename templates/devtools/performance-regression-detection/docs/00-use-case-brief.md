# Performance Regression Detection: use-case brief

> Generated from the blueprint `devtools/performance-regression-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Performance Regression Detection · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect performance regressions in benchmarks and canaries per commit despite noisy measurements, and point to the change that caused them. The system has to run as a scheduled batch job, inside these limits: Regressions above 3% detected with 95% confidence, Culprit commit named within 10 builds and Noise estimated per benchmark.

**Why it is hard.** The obvious approach is a fixed threshold, and it fails because noise differs by test and machine. The second trap is in "Attribution": the real signal is bisection or change-point attribution, while teams usually reach for a trend chart.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way time to culprit measures it.

**What success looks like.** Offline: Detection rate on seeded regressions, False alarms per week and Attribution accuracy. Online: Regressions caught before release, Time to culprit and Performance incidents. The launch is judged on "Regressions caught before release" while "Time to culprit" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect performance regressions in benchmarks and canaries per commit despite noisy measurements, and point to the change that caused them.

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

- Regressions above 3% detected with 95% confidence
- Culprit commit named within 10 builds
- Noise estimated per benchmark
- Daily run for 10K benchmarks

## The approach in one paragraph

Start with fixed thresholds on benchmark results with manual review, because they are the common practice. Then earn the move to a change-point detector with per-benchmark noise models, automatic bisection and a ticket with the culprit commit and plots, and only if it beats the baseline on Detection rate on seeded regressions and False alarms per week after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Benchmark time series | Measurements per commit. Core. Guard against: from CI. |
| Add Machine and environment tags | Hardware and load. Noise source. Guard against: from the lab. |
| Add Change point statistics | Detected shifts. Regression. Guard against: from the detector. |
| Run it as one pipeline | Benchmark ingestion (CI), Noise modelling (statistics), Change-point detection (detector), Bisection (automated reruns), Ticket with evidence (issue tracker) and Accuracy tracking (monthly), with Owner review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle noisy machine | Machine tagging and exclusion. |

**Deliberately not doing**

- Developer name: personal data.
- Benchmark name wording: weak link.
- Branch name: an artefact.

**How the approach is proven**

Prove it offline on Detection rate on seeded regressions, False alarms per week and Attribution accuracy using time-ordered splits, then online on "Regressions caught before release" with "Time to culprit" as the guardrail. Watch for: Fixed thresholds, Trend charts with no culprit and Ignoring machine noise.

## Baseline and production design

- **Baseline (build this first):** Fixed thresholds on benchmark results with manual review, because they are the common practice.
- **Production design:** A change-point detector with per-benchmark noise models, automatic bisection and a ticket with the culprit commit and plots.

## Why AI, and why this kind

**Why AI.** Detect performance regressions in benchmarks and canaries per commit despite noisy measurements, and point to the change that caused them. The evidence that separates good from bad outcomes (Benchmark time series, Machine and environment tags, Change point statistics) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A fixed threshold" are what teams reach for first, and they fail because noise differs by test and machine. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A change-point detector with per-benchmark noise models, automatic bisection and a ticket with the culprit commit and plots.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Benchmark time series, Machine and environment tags, Change point statistics and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed thresholds on benchmark results with manual review, because they are the common practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A change-point detector with per-benchmark noise models, automatic bisection and a ticket with the culprit commit and plots | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Regressions caught before release) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Fixed thresholds.
- Evaluation trap: Trend charts with no culprit.
- Noisy machine: a bad runner distorts results.
- Gradual drift: no single commit stands out.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
