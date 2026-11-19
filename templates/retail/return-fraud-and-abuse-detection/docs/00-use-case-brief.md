# Return Fraud & Policy Abuse Detection: use-case brief

> Generated from the blueprint `retail/return-fraud-and-abuse-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Return Fraud & Policy Abuse Detection · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Decide at return initiation whether to auto-approve, require inspection or deny, catching wardrobing, empty-box and serial abusers. The system has to run in under 100 milliseconds, inside these limits: Genuine customers must not be punished, Instant refund promise for trusted users and Decision in 80 ms.

**Why it is hard.** The obvious approach is absolute return rate, and it fails because apparel naturally has high return rates. The second trap is in "Loss": the real signal is cost-sensitive thresholding by item value, while teams usually reach for equal weights.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $3.6K a month. A mistake is expensive in the way customer complaint rate measures it.

**What success looks like.** Offline: PR-AUC and expected loss prevented and Inspection yield. Online: Return abuse losses and Customer complaint rate. The launch is judged on "Return abuse losses" while "Customer complaint rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Decide at return initiation whether to auto-approve, require inspection or deny, catching wardrobing, empty-box and serial abusers.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{item value})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| w | A weight that scales how much a particular example, class or term counts in the loss. |
| \text{item value} | The value of the returned item; w grows with it. |

**Hard constraints**

- Genuine customers must not be punished
- Instant refund promise for trusted users
- Decision in 80 ms
- Policy fairness

## The approach in one paragraph

Start with rules on return count thresholds. Then earn the move to gBDT with graph features and customer trust tiers, cost-sensitive thresholds and inspection routing optimised for capacity, and only if it beats the baseline on PR-AUC and expected loss prevented and Inspection yield after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Category-adjusted return rate | Customer rate over category peer rate. Abuse measure. Guard against: peer baseline per period. |
| Add Return-reason inconsistency | Stated reason vs inspection outcome history. Credibility. Guard against: use inspected outcomes only. |
| Add Linked-account abuse | Returns across linked accounts and addresses. Evasion. Guard against: link snapshot as-of. |
| Run it as one pipeline | Return request (app API), Customer trust features (feature store), Return-risk model (LightGBM), Cost-sensitive policy (thresholds by value), Inspection router (capacity planner) and Outcome labels (inspection results), with Warehouse inspection off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle policy change extends return windows | Policy-version covariate and re-baselining. |

**Deliberately not doing**

- Return window day: policy artefact.
- Customer tenure: weak.

**How the approach is proven**

Prove it offline on PR-AUC and expected loss prevented and Inspection yield using time-ordered splits, then online on "Return abuse losses" with "Customer complaint rate" as the guardrail. Watch for: Labels only from inspected returns and Feature leakage via post-return refund status.

## Baseline and production design

- **Baseline (build this first):** Rules on return count thresholds.
- **Production design:** GBDT with graph features and customer trust tiers, cost-sensitive thresholds and inspection routing optimised for capacity.

## Why AI, and why this kind

**Why AI.** Decide at return initiation whether to auto-approve, require inspection or deny, catching wardrobing, empty-box and serial abusers. The evidence that separates good from bad outcomes (Category-adjusted return rate, Return-reason inconsistency, Linked-account abuse) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "absolute return rate" are what teams reach for first, and they fail because apparel naturally has high return rates. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: GBDT with graph features and customer trust tiers, cost-sensitive thresholds and inspection routing optimised for capacity.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Category-adjusted return rate, Return-reason inconsistency, Linked-account abuse and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rules on return count thresholds | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| GBDT with graph features and customer trust tiers, cost-sensitive thresholds and inspection routing optimised for capacity | chosen | Meets the 80 ms envelope at $0.080 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Return abuse losses) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels only from inspected returns.
- Evaluation trap: Feature leakage via post-return refund status.
- Policy change extends return windows: baseline return rates shift.
- Holiday return spike: inspection capacity overwhelmed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
