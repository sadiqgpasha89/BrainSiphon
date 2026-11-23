# Automated Decision Fairness and Drift Monitoring: use-case brief

> Generated from the blueprint `public-sector/automated-decision-fairness-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Automated Decision Fairness and Drift Monitoring · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Continuously monitor every automated and AI-supported tool in a programme for drift, error rates and outcome gaps across groups, and publish a register with the results. The system has to run as a scheduled batch job, inside these limits: Monitoring covers every tool in the public register, Metrics by protected group using lawful, minimised data and Thresholds trigger human review and a pause option.

**Why it is hard.** The obvious approach is overall accuracy, and it fails because averages hide group gaps. The second trap is in "Data": the real signal is lawfully collected group data or approved proxies for audit only, while teams usually reach for using group data in the models.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.7K a month. A mistake is expensive in the way disparities found and fixed measures it.

**What success looks like.** Offline: Metric stability, Detection of seeded disparities and Time to owner action. Online: Tools monitored, Disparities found and fixed and Time to pause a faulty tool. The launch is judged on "Tools monitored" while "Disparities found and fixed" must not get worse.

## Objective, loss and constraints

**Business objective.** Continuously monitor every automated and AI-supported tool in a programme for drift, error rates and outcome gaps across groups, and publish a register with the results.

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

- Monitoring covers every tool in the public register
- Metrics by protected group using lawful, minimised data
- Thresholds trigger human review and a pause option
- Reports to the oversight board
- 200 tools

## The approach in one paragraph

Start with annual audits of selected tools by an internal team, because they are the current oversight. Then earn the move to a monitoring service that computes agreed fairness and drift metrics per tool, sends threshold breaches to named owners and publishes a register and summary reports, and only if it beats the baseline on Metric stability and Detection of seeded disparities after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Outcome rate by group | Approval or review rate across groups. Disparity. Guard against: from audit data. |
| Add Error rate by group | False positive and negative rates. Disparity. Guard against: from audited samples. |
| Add Input drift | Change in input distributions. Drift. Guard against: from logs. |
| Run it as one pipeline | Decision and outcome logs (tool logs), Metric computation (monitoring service), Threshold evaluation (rules) and Register update (public register), with Audit data join, Owner review and pause option and Citizen board report off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle small groups | Confidence intervals and pooled periods across case handling. |

**Deliberately not doing**

- Tool name: an identifier.
- Team name: irrelevant.
- Report format: an artefact.

**How the approach is proven**

Prove it offline on Metric stability, Detection of seeded disparities and Time to owner action using time-ordered splits, then online on "Tools monitored" with "Disparities found and fixed" as the guardrail. Watch for: Average accuracy only, Group data used for decisions and Alerts with no action path.

## Baseline and production design

- **Baseline (build this first):** Annual audits of selected tools by an internal team, because they are the current oversight.
- **Production design:** A monitoring service that computes agreed fairness and drift metrics per tool, sends threshold breaches to named owners and publishes a register and summary reports.

## Why AI, and why this kind

**Why AI.** Continuously monitor every automated and AI-supported tool in a programme for drift, error rates and outcome gaps across groups, and publish a register with the results. The evidence that separates good from bad outcomes (Outcome rate by group, Error rate by group, Input drift) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "overall accuracy" are what teams reach for first, and they fail because averages hide group gaps. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A monitoring service that computes agreed fairness and drift metrics per tool, sends threshold breaches to named owners and publishes a register and summary reports.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Outcome rate by group, Error rate by group, Input drift and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Annual audits of selected tools by an internal team, because they are the current oversight | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A monitoring service that computes agreed fairness and drift metrics per tool, sends threshold breaches to named owners and publishes a register and summary reports | chosen | Meets the run-window envelope at $0.093 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Tools monitored) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Average accuracy only.
- Evaluation trap: Group data used for decisions.
- Small groups: metrics are noisy.
- Missing group data: groups are not recorded.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
