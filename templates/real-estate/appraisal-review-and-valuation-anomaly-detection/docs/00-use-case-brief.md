# Appraisal Review & Valuation Anomaly Detection: use-case brief

> Generated from the blueprint `real-estate/appraisal-review-and-valuation-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Appraisal Review & Valuation Anomaly Detection · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Flag appraisals that look inflated, inconsistent or non-compliant before a lender relies on them. The system has to run interactively, within a few seconds, inside these limits: Reviewer sees the evidence, Appraiser independence rules and Review capacity.

**Why it is hard.** The obvious approach is any gap, and it fails because thin markets have wide AVM error. The second trap is in "Comparables": the real signal is quality of selected comps, while teams usually reach for count.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $12.3K a month. A mistake is expensive in the way review turnaround measures it.

**What success looks like.** Offline: Precision at review capacity and Recall on confirmed issues. Online: Valuation losses avoided and Review turnaround. The launch is judged on "Valuation losses avoided" while "Review turnaround" must not get worse.

## Objective, loss and constraints

**Business objective.** Flag appraisals that look inflated, inconsistent or non-compliant before a lender relies on them.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{v}-v)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \hat{v} | The value the independent model expects for the property. |
| v | The value stated in the appraisal. |

**Hard constraints**

- Reviewer sees the evidence
- Appraiser independence rules
- Review capacity
- Fair treatment of appraisers

## The approach in one paragraph

Start with review any appraisal more than 10% from the AVM, because lenders use such triggers. Then earn the move to gradient boosting on gap, comp quality and narrative checks with calibrated risk and a reviewer queue, and only if it beats the baseline on Precision at review capacity and Recall on confirmed issues after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Appraisal to AVM gap | Log difference scaled by AVM interval. Core signal. Guard against: aVM coverage. |
| Add Comparable selection quality | Similarity of chosen vs available comps. Cherry-picking. Guard against: comp pool. |
| Add Appraiser history | Past review outcomes. Pattern. Guard against: fairness. |
| Run it as one pipeline | AVM benchmark (valuation service), Comparable checker (ranking model), Risk model (boosting) and Outcome log (warehouse), with Appraisal report intake, Report parser and Reviewer queue off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle unique property | Use wider tolerances for unique properties and say so in the review note. |

**Deliberately not doing**

- Report length: style.
- Appraiser firm: weak.
- Photo count: style.

**How the approach is proven**

Prove it offline on Precision at review capacity and Recall on confirmed issues using time-ordered splits, then online on "Valuation losses avoided" with "Review turnaround" as the guardrail. Watch for: Confirmed issues are those that defaulted and Reviewer bias.

## Baseline and production design

- **Baseline (build this first):** Review any appraisal more than 10% from the AVM, because lenders use such triggers.
- **Production design:** Gradient boosting on gap, comp quality and narrative checks with calibrated risk and a reviewer queue.

## Why AI, and why this kind

**Why AI.** Flag appraisals that look inflated, inconsistent or non-compliant before a lender relies on them. The evidence that separates good from bad outcomes (Appraisal to AVM gap, Comparable selection quality, Appraiser history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "any gap" are what teams reach for first, and they fail because thin markets have wide AVM error. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Gradient boosting on gap, comp quality and narrative checks with calibrated risk and a reviewer queue.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Appraisal to AVM gap, Comparable selection quality, Appraiser history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Review any appraisal more than 10% from the AVM, because lenders use such triggers | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting on gap, comp quality and narrative checks with calibrated risk and a reviewer queue | chosen | Meets the 2500 ms envelope at $2.74 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Valuation losses avoided) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Confirmed issues are those that defaulted.
- Evaluation trap: Reviewer bias.
- Unique property: a unique property sits outside the range where the independent valuation is reliable.
- Rising market: in a rising market the independent valuation lags and every appraisal looks too high.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
