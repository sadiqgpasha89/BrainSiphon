# Public Safety Tool Bias and Error Audit: use-case brief

> Generated from the blueprint `public-safety/public-safety-tool-bias-error-audit` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Public Safety Tool Bias and Error Audit · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Audit each deployed tool for error rates, outcome gaps and drift across groups and areas, test with held-out reviews and report results to an oversight board with the power to pause a tool. The system has to run as a scheduled batch job, inside these limits: Every deployed tool audited at least every 6 months, Group data used for audit only and never in decisions and Oversight board can pause a tool.

**Why it is hard.** The obvious approach is overall accuracy, and it fails because averages hide gaps. The second trap is in "Truth": the real signal is independent reviews of samples, while teams usually reach for outputs checked by the same tool.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.7K a month. A mistake is expensive in the way disparities found and fixed measures it.

**What success looks like.** Offline: Detection of seeded disparities, Sample review agreement and Time to board action. Online: Tools audited, Disparities found and fixed and Tools paused. The launch is judged on "Tools audited" while "Disparities found and fixed" must not get worse.

## Objective, loss and constraints

**Business objective.** Audit each deployed tool for error rates, outcome gaps and drift across groups and areas, test with held-out reviews and report results to an oversight board with the power to pause a tool.

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

- Every deployed tool audited at least every 6 months
- Group data used for audit only and never in decisions
- Oversight board can pause a tool
- Results published in summary
- 100 tools

## The approach in one paragraph

Start with annual internal reviews of selected tools, because they are the current oversight. Then earn the move to an audit service that draws samples, collects independent reviews, computes agreed metrics and sends threshold breaches to the oversight board with a pause procedure, and only if it beats the baseline on Detection of seeded disparities and Sample review agreement after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Error rate by group | False positives and negatives. Disparity. Guard against: from reviewed samples. |
| Add Outcome rate by group | Review or action rates by group. Disparity. Guard against: from audit data. |
| Add Input and output drift | Changes in data and scores. Drift. Guard against: from logs. |
| Run it as one pipeline | Tool decision and outcome extract (audit warehouse), Sample draw (audit sampling), Metric computation (audit service), Disparity threshold check (audit rules), Board decision and pause (governance workflow) and Public summary (register), with Independent review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle small groups | Confidence intervals and pooled periods. |

**Deliberately not doing**

- Tool name: an identifier.
- Author name: irrelevant.
- Report format: an artefact.

**How the approach is proven**

Prove it offline on Detection of seeded disparities, Sample review agreement and Time to board action using time-ordered splits, then online on "Tools audited" with "Disparities found and fixed" as the guardrail. Watch for: Overall accuracy only, Self-checking outputs and Reports with no consequence.

## Baseline and production design

- **Baseline (build this first):** Annual internal reviews of selected tools, because they are the current oversight.
- **Production design:** An audit service that draws samples, collects independent reviews, computes agreed metrics and sends threshold breaches to the oversight board with a pause procedure.

## Why AI, and why this kind

**Why AI.** Audit each deployed tool for error rates, outcome gaps and drift across groups and areas, test with held-out reviews and report results to an oversight board with the power to pause a tool. The evidence that separates good from bad outcomes (Error rate by group, Outcome rate by group, Input and output drift) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "overall accuracy" are what teams reach for first, and they fail because averages hide gaps. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: An audit service that draws samples, collects independent reviews, computes agreed metrics and sends threshold breaches to the oversight board with a pause procedure.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Error rate by group, Outcome rate by group, Input and output drift and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Annual internal reviews of selected tools, because they are the current oversight | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An audit service that draws samples, collects independent reviews, computes agreed metrics and sends threshold breaches to the oversight board with a pause procedure | chosen | Meets the run-window envelope at $0.093 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Tools audited) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Overall accuracy only.
- Evaluation trap: Self-checking outputs.
- Small groups: metrics are noisy.
- Missing group data: groups are not recorded.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
