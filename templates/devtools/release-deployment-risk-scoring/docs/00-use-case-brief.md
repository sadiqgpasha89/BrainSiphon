# Release Deployment Risk Scoring: use-case brief

> Generated from the blueprint `devtools/release-deployment-risk-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Release Deployment Risk Scoring · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate the risk of a deployment from the change, the service and the timing so teams add canaries, approvals or delay when risk is high, without blocking safe changes. The system has to run interactively, within a few seconds, inside these limits: Risk shown with the drivers, Policy decides gates not the model alone and Calibrated probabilities.

**Why it is hard.** The obvious approach is reverts only, and it fails because many failures are fixed forward. The second trap is in "Use": the real signal is gate choice and rollout speed, while teams usually reach for a blame score.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $3.7K a month. A mistake is expensive in the way time to deploy safe changes measures it.

**What success looks like.** Offline: Calibration, Recall of failed deployments at the gate rate and Stability. Online: Change failure rate, Time to deploy safe changes and Incidents from deployments. The launch is judged on "Change failure rate" while "Time to deploy safe changes" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate the risk of a deployment from the change, the service and the timing so teams add canaries, approvals or delay when risk is high, without blocking safe changes.

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

- Risk shown with the drivers
- Policy decides gates not the model alone
- Calibrated probabilities
- Score within 2 s
- 100K deployments per month

## The approach in one paragraph

Start with fixed change windows and approval rules by service tier, because they are the standard controls. Then earn the move to a calibrated risk model with explanations that maps risk to rollout strategy, such as slower canary steps or an extra approver, within policy, and only if it beats the baseline on Calibration and Recall of failed deployments at the gate rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Change size and files | Size and spread of the change. Risk. Guard against: from the diff. |
| Add Service criticality and traffic | Tier and request rate. Impact. Guard against: from the catalogue. |
| Add Recent incident history | Incidents in the service. Fragility. Guard against: from the incident tracker. |
| Run it as one pipeline | Deployment request (CD system), Feature build (change and service data), Repository risk model (gradient boosting), Repository calibration (isotonic fit), Repository policy mapping (rules), Rollout strategy (CD system) and Repository outcome tracking (monthly). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new service | Tier-based priors. |

**Deliberately not doing**

- Author name: personal data.
- Team name: weak link.
- Branch name: an artefact.

**How the approach is proven**

Prove it offline on Calibration, Recall of failed deployments at the gate rate and Stability using time-ordered splits, then online on "Change failure rate" with "Time to deploy safe changes" as the guardrail. Watch for: Author scoring, Model-only gates and Reverts as the only label.

## Baseline and production design

- **Baseline (build this first):** Fixed change windows and approval rules by service tier, because they are the standard controls.
- **Production design:** A calibrated risk model with explanations that maps risk to rollout strategy, such as slower canary steps or an extra approver, within policy.

## Why AI, and why this kind

**Why AI.** Estimate the risk of a deployment from the change, the service and the timing so teams add canaries, approvals or delay when risk is high, without blocking safe changes. The evidence that separates good from bad outcomes (Change size and files, Service criticality and traffic, Recent incident history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "reverts only" are what teams reach for first, and they fail because many failures are fixed forward. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A calibrated risk model with explanations that maps risk to rollout strategy, such as slower canary steps or an extra approver, within policy.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Change size and files, Service criticality and traffic, Recent incident history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed change windows and approval rules by service tier, because they are the standard controls | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A calibrated risk model with explanations that maps risk to rollout strategy, such as slower canary steps or an extra approver, within policy | chosen | Meets the 2500 ms envelope at $0.081 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Change failure rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Author scoring.
- Evaluation trap: Model-only gates.
- New service: the service has no incident history.
- Emergency fix: urgent deployments are risky.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
