# Change Risk Assessment: use-case brief

> Generated from the blueprint `it-ops/change-risk-assessment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Change Risk Assessment · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate the risk of a proposed change from its content, target and history so the approval route and test requirements match the risk, without blocking low-risk changes. The system has to run interactively, within a few seconds, inside these limits: Risk shown with its drivers, Policy sets the approval route not the model alone and Calibrated probabilities.

**Why it is hard.** The obvious approach is changes marked failed in the form, and it fails because forms are filled in inconsistently. The second trap is in "Use": the real signal is route and test depth, while teams usually reach for a blame score.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $12.3K a month. A mistake is expensive in the way time to approve low-risk changes measures it.

**What success looks like.** Offline: Calibration, Recall of failed changes at the review rate and Stability. Online: Change failure rate, Time to approve low-risk changes and Incidents caused by changes. The launch is judged on "Change failure rate" while "Time to approve low-risk changes" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate the risk of a proposed change from its content, target and history so the approval route and test requirements match the risk, without blocking low-risk changes.

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

- Risk shown with its drivers
- Policy sets the approval route not the model alone
- Calibrated probabilities
- Score within 3 s
- 200K changes per year

## The approach in one paragraph

Start with fixed risk questionnaires on the change form, because they are the standard method. Then earn the move to a calibrated risk model with explanations that sets the approval path and test requirements within policy, with a human override and monthly calibration reviews, and only if it beats the baseline on Calibration and Recall of failed changes at the review rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Target criticality | Tier of the affected services. Impact. Guard against: from the CMDB. |
| Add Change type and size | Standard, normal or emergency and scope. Risk. Guard against: from the record. |
| Add Past failure rate for the service | Failures in recent changes. Risk. Guard against: from history. |
| Run it as one pipeline | Change submission (ITSM), Feature build (change and CMDB data), Risk model (gradient boosting), Calibration (isotonic fit), Policy routing (rules), Approval (CAB) and Outcome tracking (monthly). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new service | Tier-based priors. |

**Deliberately not doing**

- Requester name: personal data.
- Team name: weak link.
- Change number: an identifier.

**How the approach is proven**

Prove it offline on Calibration, Recall of failed changes at the review rate and Stability using time-ordered splits, then online on "Change failure rate" with "Time to approve low-risk changes" as the guardrail. Watch for: Requester scoring, Model-only approval and Self-reported form labels.

## Baseline and production design

- **Baseline (build this first):** Fixed risk questionnaires on the change form, because they are the standard method.
- **Production design:** A calibrated risk model with explanations that sets the approval path and test requirements within policy, with a human override and monthly calibration reviews.

## Why AI, and why this kind

**Why AI.** Estimate the risk of a proposed change from its content, target and history so the approval route and test requirements match the risk, without blocking low-risk changes. The evidence that separates good from bad outcomes (Target criticality, Change type and size, Past failure rate for the service) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "changes marked failed in the form" are what teams reach for first, and they fail because forms are filled in inconsistently. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A calibrated risk model with explanations that sets the approval path and test requirements within policy, with a human override and monthly calibration reviews.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Target criticality, Change type and size, Past failure rate for the service and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed risk questionnaires on the change form, because they are the standard method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A calibrated risk model with explanations that sets the approval path and test requirements within policy, with a human override and monthly calibration reviews | chosen | Meets the 2500 ms envelope at $0.273 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Change failure rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Requester scoring.
- Evaluation trap: Model-only approval.
- New service: no change history exists.
- Emergency change: urgent changes are risky.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
