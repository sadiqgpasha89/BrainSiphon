# SIEM Alert Triage & Prioritisation: use-case brief

> Generated from the blueprint `cybersecurity/siem-alert-triage-ml` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SIEM Alert Triage & Prioritisation · **Domain:** cybersecurity · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Score and prioritise the flood of SIEM alerts so analysts spend time on the 2% that matter. The system has to run interactively, within a few seconds, inside these limits: Millions of alerts per day, Explainable priorities and Feedback loop from analysts.

**Why it is hard.** The obvious approach is closed-as-benign counted as truth, and it fails because benign closure is often a time-saving shortcut. The second trap is in "Context": the real signal is asset criticality and identity context, while teams usually reach for alert severity from the rule.

**Scale and stakes.** At 10 million users this is about 1500.0M model-touching events a day, 17.4K requests per second on average and 104.2K at peak, at an estimated $85.7K a month. A mistake is expensive in the way alerts handled per analyst hour measures it.

**What success looks like.** Offline: Recall of true incidents in top-k and Precision at analyst capacity. Online: Mean time to respond to critical alerts and Alerts handled per analyst hour. The launch is judged on "Mean time to respond to critical alerts" while "Alerts handled per analyst hour" must not get worse.

## Objective, loss and constraints

**Business objective.** Score and prioritise the flood of SIEM alerts so analysts spend time on the 2% that matter.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{RankLoss} | Ranking loss: penalises placing a less relevant item above a more relevant one. |

**Hard constraints**

- Millions of alerts per day
- Explainable priorities
- Feedback loop from analysts
- SLA for critical alerts

## The approach in one paragraph

Start with rule severity ordering. Then earn the move to gradient-boosted triage ranker with asset context and co-occurrence features, active learning from analyst feedback, and only if it beats the baseline on Recall of true incidents in top-k and Precision at analyst capacity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Rule historical true-positive rate | TP rate of the rule per asset class. Prior. Guard against: matured labels. |
| Add Asset criticality | Business criticality tier. Impact. Guard against: cMDB. |
| Add Alert co-occurrence | Related alerts on the same host. Attack chains. Guard against: window. |
| Run it as one pipeline | Alert stream (SIEM), Context enrichment (CMDB and identity), Triage ranker (LightGBM) and Correlation grouper (clustering), with Priority queue, Analyst and Disposition feedback off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new detection rule has no history | Prior from similar rules and exploration for new rules. |

**Deliberately not doing**

- Alert text: duplicates rule name.
- Analyst name: personal.

**How the approach is proven**

Prove it offline on Recall of true incidents in top-k and Precision at analyst capacity using time-ordered splits, then online on "Mean time to respond to critical alerts" with "Alerts handled per analyst hour" as the guardrail. Watch for: Disposition labels biased by prior ordering and Evaluating only alerts that were triaged.

## Baseline and production design

- **Baseline (build this first):** Rule severity ordering.
- **Production design:** Gradient-boosted triage ranker with asset context and co-occurrence features, active learning from analyst feedback.

## Why AI, and why this kind

**Why AI.** Score and prioritise the flood of SIEM alerts so analysts spend time on the 2% that matter. The evidence that separates good from bad outcomes (Rule historical true-positive rate, Asset criticality, Alert co-occurrence) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "closed-as-benign counted as truth" are what teams reach for first, and they fail because benign closure is often a time-saving shortcut. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient-boosted triage ranker with asset context and co-occurrence features, active learning from analyst feedback.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Rule historical true-positive rate, Asset criticality, Alert co-occurrence and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule severity ordering | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient-boosted triage ranker with asset context and co-occurrence features, active learning from analyst feedback | chosen | Meets the 2500 ms envelope at $0.0019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mean time to respond to critical alerts) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Disposition labels biased by prior ordering.
- Evaluation trap: Evaluating only alerts that were triaged.
- New detection rule has no history: cold-start priority is wrong.
- Analysts rubber-stamp low-priority alerts: labels are biased.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
