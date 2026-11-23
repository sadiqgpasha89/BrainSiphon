# Network Change Risk Scoring: use-case brief

> Generated from the blueprint `telecom/network-change-risk-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Network Change Risk Scoring · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Score each planned network change for the probability that it causes a customer-impacting incident, so reviewers focus approval time on risky changes and safe ones flow quickly. The system has to run interactively, within a few seconds, inside these limits: Scores must be explainable to the change board, The score informs approval and never replaces the board and No use of the engineer's identity as a feature.

**Why it is hard.** The obvious approach is any incident in the same window, and it fails because coincident incidents flood the label with noise. The second trap is in "Context": the real signal is change type, target criticality and timing together, while teams usually reach for change type alone.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $3.6K a month. A mistake is expensive in the way median approval time for low-risk changes measures it.

**What success looks like.** Offline: AUC and calibration error, Recall of incident-causing changes at the review cut-off and Score stability across releases. Online: Change-induced incidents, Median approval time for low-risk changes and Changes rolled back. The launch is judged on "Change-induced incidents" while "Median approval time for low-risk changes" must not get worse.

## Objective, loss and constraints

**Business objective.** Score each planned network change for the probability that it causes a customer-impacting incident, so reviewers focus approval time on risky changes and safe ones flow quickly.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Scores must be explainable to the change board
- The score informs approval and never replaces the board
- No use of the engineer's identity as a feature
- Score returned within 5 s of submission

## The approach in one paragraph

Start with a checklist-based risk matrix by change type and target criticality, because that is how boards decide today. Then earn the move to gradient boosting on structured change features with monotonic constraints on blast radius, calibrated probabilities and per-change reasons shown beside the approval request, and only if it beats the baseline on AUC and calibration error and Recall of incident-causing changes at the review cut-off after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Blast radius | Customers and services behind the target. Higher reach raises risk. Guard against: use live inventory. |
| Add Change complexity | Number of steps and elements touched in the plan. Complexity raises error odds. Guard against: parse from the structured plan. |
| Add Time to peak traffic | Minutes between the window and the next busy hour. Late changes hit peak. Guard against: use local time. |
| Run it as one pipeline | Change intake (change-management tool), Feature build (inventory and change joins), Risk model (gradient boosting), Calibration (isotonic regression), Post-change outcome (incident join) and Model monitoring (drift and calibration), with Reviewer display off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle emergency change | A fast path that still records the score and the reason. |

**Deliberately not doing**

- Free-text description length: not risk.
- Requester team size: weak link.
- Ticket number: an identifier.

**How the approach is proven**

Prove it offline on AUC and calibration error, Recall of incident-causing changes at the review cut-off and Score stability across releases using time-ordered splits, then online on "Change-induced incidents" with "Median approval time for low-risk changes" as the guardrail. Watch for: Labelling by time overlap, Using engineer identity and Scoring after the change is applied.

## Baseline and production design

- **Baseline (build this first):** A checklist-based risk matrix by change type and target criticality, because that is how boards decide today.
- **Production design:** Gradient boosting on structured change features with monotonic constraints on blast radius, calibrated probabilities and per-change reasons shown beside the approval request.

## Why AI, and why this kind

**Why AI.** Score each planned network change for the probability that it causes a customer-impacting incident, so reviewers focus approval time on risky changes and safe ones flow quickly. The evidence that separates good from bad outcomes (Blast radius, Change complexity, Time to peak traffic) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "any incident in the same window" are what teams reach for first, and they fail because coincident incidents flood the label with noise. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting on structured change features with monotonic constraints on blast radius, calibrated probabilities and per-change reasons shown beside the approval request.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Blast radius, Change complexity, Time to peak traffic and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A checklist-based risk matrix by change type and target criticality, because that is how boards decide today | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting on structured change features with monotonic constraints on blast radius, calibrated probabilities and per-change reasons shown beside the approval request | chosen | Meets the 2500 ms envelope at $0.800 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Change-induced incidents) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labelling by time overlap.
- Evaluation trap: Using engineer identity.
- Emergency change: there is no time for a full review.
- New template: the template has no incident history.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
