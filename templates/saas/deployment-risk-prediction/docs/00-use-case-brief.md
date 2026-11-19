# Deployment Risk Prediction: use-case brief

> Generated from the blueprint `saas/deployment-risk-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Deployment Risk Prediction · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict the risk that a deployment causes an incident and apply stricter rollout policies (canary size, bake time) accordingly. The system has to run in under 100 milliseconds, inside these limits: Decision at merge or deploy time, Explainable factors and Low friction.

**Why it is hard.** The obvious approach is score without action, and it fails because a risk score no one acts on is waste. The second trap is in "Labels": the real signal is link incidents to causal changes, while teams usually reach for time-window attribution only.

**Scale and stakes.** At 10 million users this is about 15.0M model-touching events a day, 174 requests per second on average and 1.0K at peak, at an estimated $4.1K a month. A mistake is expensive in the way mean time to rollback measures it.

**What success looks like.** Offline: AUC and calibration for incident-causing deploys and Risk-tier precision. Online: Change failure rate and Mean time to rollback. The launch is judged on "Change failure rate" while "Mean time to rollback" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict the risk that a deployment causes an incident and apply stricter rollout policies (canary size, bake time) accordingly.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{incident},p)\cdot w(\text{blast radius})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{incident} | The label: 1 if the deployment caused an incident. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| w | A weight that scales how much a particular example, class or term counts in the loss. |
| \text{blast radius} | How many users or services a failure would affect; w grows with it. |

**Hard constraints**

- Decision at merge or deploy time
- Explainable factors
- Low friction
- Few incident labels

## The approach in one paragraph

Start with manual risk assessment and change advisory board. Then earn the move to gBDT risk model with blast-radius weighting driving automated canary policies and extra approvals for high-risk changes, and only if it beats the baseline on AUC and calibration for incident-causing deploys and Risk-tier precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Change size and files touched | Diff statistics. Risk. Guard against: metadata. |
| Add Author-service familiarity | Prior commits by author to service. Risk. Guard against: history. |
| Add Service criticality and recent incident rate | Tier and recent incidents. Blast radius. Guard against: catalogue. |
| Run it as one pipeline | Deploy request (CD system), Feature builder (change metadata), Risk model (GBDT), Rollout policy engine (canary and bake), Progressive delivery (deployment tool), Automated rollback (metrics watch) and Incident linkage (labels). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle incident attribution wrong | Causal attribution via bisect and postmortem linkage. |

**Deliberately not doing**

- Commit time of day: weak.
- Branch name: none.

**How the approach is proven**

Prove it offline on AUC and calibration for incident-causing deploys and Risk-tier precision using time-ordered splits, then online on "Change failure rate" with "Mean time to rollback" as the guardrail. Watch for: Few labelled incidents and Time-window attribution errors.

## Baseline and production design

- **Baseline (build this first):** Manual risk assessment and change advisory board.
- **Production design:** GBDT risk model with blast-radius weighting driving automated canary policies and extra approvals for high-risk changes.

## Why AI, and why this kind

**Why AI.** Predict the risk that a deployment causes an incident and apply stricter rollout policies (canary size, bake time) accordingly. The evidence that separates good from bad outcomes (Change size and files touched, Author-service familiarity, Service criticality and recent incident rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "score without action" are what teams reach for first, and they fail because A risk score no one acts on is waste. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: GBDT risk model with blast-radius weighting driving automated canary policies and extra approvals for high-risk changes.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Change size and files touched, Author-service familiarity, Service criticality and recent incident rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual risk assessment and change advisory board | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| GBDT risk model with blast-radius weighting driving automated canary policies and extra approvals for high-risk changes | chosen | Meets the 80 ms envelope at $0.0092 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Change failure rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Few labelled incidents.
- Evaluation trap: Time-window attribution errors.
- Incident attribution wrong: model learns the wrong risk drivers.
- Developers game the score by splitting changes: developers split changes into small pieces to lower the score, hiding the real aggregate risk.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
