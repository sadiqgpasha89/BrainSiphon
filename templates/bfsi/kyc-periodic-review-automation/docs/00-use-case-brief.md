# KYC Periodic Review Automation & Risk Re-rating: use-case brief

> Generated from the blueprint `bfsi/kyc-periodic-review-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** KYC Periodic Review Automation & Risk Re-rating · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Automate periodic KYC refreshes by checking customer files against fresh data and re-rating risk, escalating changes to analysts. The system has to run interactively, within a few seconds, inside these limits: An analyst decides every change to a high-risk rating, Every check and its source logged with a timestamp and Review frequency set by risk tier.

**Why it is hard.** The obvious approach is re-collecting everything from the customer, and it fails because re-collection wastes the customer's time and the analyst's, and most files have not changed. The second trap is in "Risk": the real signal is a risk rating updated from behaviour and profile, while teams usually reach for a static rating from onboarding.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $12.3K a month. A mistake is expensive in the way overdue reviews measures it.

**What success looks like.** Offline: Precision on escalations and Recall of material changes. Online: Review time and Overdue reviews. The launch is judged on "Review time" while "Overdue reviews" must not get worse.

## Objective, loss and constraints

**Business objective.** Automate periodic KYC refreshes by checking customer files against fresh data and re-rating risk, escalating changes to analysts.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{CE}(\hat{y},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |

**Hard constraints**

- An analyst decides every change to a high-risk rating
- Every check and its source logged with a timestamp
- Review frequency set by risk tier
- Privacy rules limit the data collected from the customer

## The approach in one paragraph

Start with fixed review cycle by tier with manual checks, because it is regulation-driven. Then earn the move to a change-detection pipeline with entity checks, a re-rating model and an analyst queue for material changes, and only if it beats the baseline on Precision on escalations and Recall of material changes after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Ownership change | Change in beneficial ownership recorded in a company registry since the last review. A key trigger for re-rating. Guard against: registries update late. |
| Add Adverse media hit | Match of the customer or an owner in negative news with a score. Possible risk event. Guard against: precision is low for common names. |
| Add Activity versus profile | Monthly transaction volume divided by the volume expected for the profile. Behaviour that does not fit the profile. Guard against: baselines are weak for new customers. |
| Run it as one pipeline | Customer file (KYC platform), Registry and media checks (vendor APIs), Change detector (rules), Re-rating model (boosting) and Customer outreach (comms), with Analyst queue and Audit log off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle registry delay | Show the source date for each check and re-run when the registry refreshes. |

**Deliberately not doing**

- Customer name length: No link to risk.
- Account number: An arbitrary identifier.
- Branch: An administrative attribute with no risk information.

**How the approach is proven**

Prove it offline on Precision on escalations and Recall of material changes using time-ordered splits, then online on "Review time" with "Overdue reviews" as the guardrail. Watch for: Labels come from past analyst decisions, so the model repeats earlier habits and Easy cases dominate the data, so performance on hard cases is overstated.

## Baseline and production design

- **Baseline (build this first):** Fixed review cycle by tier with manual checks, because it is regulation-driven.
- **Production design:** A change-detection pipeline with entity checks, a re-rating model and an analyst queue for material changes.

## Why AI, and why this kind

**Why AI.** Automate periodic KYC refreshes by checking customer files against fresh data and re-rating risk, escalating changes to analysts. The evidence that separates good from bad outcomes (Ownership change, Adverse media hit, Activity versus profile) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "re-collecting everything from the customer" are what teams reach for first, and they fail because re-collection wastes the customer's time and the analyst's, and most files have not changed. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A change-detection pipeline with entity checks, a re-rating model and an analyst queue for material changes.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Ownership change, Adverse media hit, Activity versus profile and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed review cycle by tier with manual checks, because it is regulation-driven | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A change-detection pipeline with entity checks, a re-rating model and an analyst queue for material changes | chosen | Meets the 2500 ms envelope at $2.73 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Review time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels come from past analyst decisions, so the model repeats earlier habits.
- Evaluation trap: Easy cases dominate the data, so performance on hard cases is overstated.
- Registry delay: a registry updates late so the review checks outdated ownership data.
- Name collisions: common names produce false adverse media hits.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
