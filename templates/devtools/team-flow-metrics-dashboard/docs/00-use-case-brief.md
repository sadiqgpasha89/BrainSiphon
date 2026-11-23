# Team Flow Metrics and Insights: use-case brief

> Generated from the blueprint `devtools/team-flow-metrics-dashboard` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Team Flow Metrics and Insights · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Show team-level flow metrics such as lead time, deployment frequency and change failure rate with explanations of what moved, to support team improvement and never to rank people. The system has to run as a scheduled batch job, inside these limits: Metrics at team level with a minimum group size, No individual views and Teams own their data.

**Why it is hard.** The obvious approach is individuals, and it fails because individual metrics are gamed and harm trust. The second trap is in "Use": the real signal is team improvement conversations, while teams usually reach for performance reviews.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way change failure rate measures it.

**What success looks like.** Offline: Metric definition accuracy, Aggregation privacy checks and Insight usefulness in surveys. Online: Lead time, Change failure rate and Team satisfaction with metrics. The launch is judged on "Lead time" while "Change failure rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Show team-level flow metrics such as lead time, deployment frequency and change failure rate with explanations of what moved, to support team improvement and never to rank people.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Metrics at team level with a minimum group size
- No individual views
- Teams own their data
- Insights reviewed by team leads
- 2K teams

## The approach in one paragraph

Start with manually compiled engineering reports from the tracker, because they are the current practice. Then earn the move to a metrics service with team-level aggregation, trend explanations and bottleneck hints, with access controls that block individual views, and only if it beats the baseline on Metric definition accuracy and Aggregation privacy checks after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Lead time for changes | Time from commit to production. Flow. Guard against: from CI and CD. |
| Add Deployment frequency | Deployments per period. Flow. Guard against: from CD. |
| Add Change failure rate | Share of deployments with failures. Stability. Guard against: from incidents. |
| Run it as one pipeline | Event ingestion (CI, CD and trackers), Aggregation to team level (batch), Metric computation (analytics), Trend explanation (rules and LLM), Team dashboard (BI) and Team retrospectives (monthly), with Governance review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle small team | Suppress or merge groups. |

**Deliberately not doing**

- Developer name: personal data.
- Lines of code: a poor proxy.
- Commit counts: a poor proxy.

**How the approach is proven**

Prove it offline on Metric definition accuracy, Aggregation privacy checks and Insight usefulness in surveys using time-ordered splits, then online on "Lead time" with "Change failure rate" as the guardrail. Watch for: Individual metrics, Lines of code and Metrics as targets.

## Baseline and production design

- **Baseline (build this first):** Manually compiled engineering reports from the tracker, because they are the current practice.
- **Production design:** A metrics service with team-level aggregation, trend explanations and bottleneck hints, with access controls that block individual views.

## Why AI, and why this kind

**Why AI.** Show team-level flow metrics such as lead time, deployment frequency and change failure rate with explanations of what moved, to support team improvement and never to rank people. The evidence that separates good from bad outcomes (Lead time for changes, Deployment frequency, Change failure rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "individuals" are what teams reach for first, and they fail because individual metrics are gamed and harm trust. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A metrics service with team-level aggregation, trend explanations and bottleneck hints, with access controls that block individual views.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Lead time for changes, Deployment frequency, Change failure rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manually compiled engineering reports from the tracker, because they are the current practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A metrics service with team-level aggregation, trend explanations and bottleneck hints, with access controls that block individual views | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Lead time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Individual metrics.
- Evaluation trap: Lines of code.
- Small team: the group is under the minimum.
- Gaming: teams change behaviour to move numbers.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
