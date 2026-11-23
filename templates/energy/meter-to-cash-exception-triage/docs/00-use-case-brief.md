# Meter-to-Cash Exception Triage: use-case brief

> Generated from the blueprint `energy/meter-to-cash-exception-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Meter-to-Cash Exception Triage · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify and route billing exceptions such as unusual reads, rejected bills and mismatched accounts so analysts fix the most costly ones first. The system has to run as a scheduled batch job, inside these limits: Exception type and fix route for every item, Value at risk shown and Analysts approve every correction.

**Why it is hard.** The obvious approach is the exception code, and it fails because codes are broad and inconsistent. The second trap is in "Priority": the real signal is value at risk and age, while teams usually reach for first in first out.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.9K a month. A mistake is expensive in the way analyst handle time measures it.

**What success looks like.** Offline: Fix accuracy against analyst actions, Priority rank quality and Abstention rate. Online: Unbilled revenue days, Analyst handle time and Rebills. The launch is judged on "Unbilled revenue days" while "Analyst handle time" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify and route billing exceptions such as unusual reads, rejected bills and mismatched accounts so analysts fix the most costly ones first.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Exception type and fix route for every item
- Value at risk shown
- Analysts approve every correction
- Daily run for 200K exceptions

## The approach in one paragraph

Start with queues by exception code worked in order of arrival, because it is the current workflow. Then earn the move to a classifier on codes and notes with a value-at-risk ranking, a recommended fix with confidence and analyst approval, and only if it beats the baseline on Fix accuracy against analyst actions and Priority rank quality after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Exception code and text | Code and free-text note. Type. Guard against: from the billing system. |
| Add Account and meter context | Account type and meter changes. Cause. Guard against: from CIS. |
| Add Value at risk | Estimated unbilled amount. Priority. Guard against: from billing. |
| Run it as one pipeline | Exception intake (billing system), Context join (CIS and MDM), Fix classifier (transformer), Value ranking (rules), Correction approval (maker-checker) and Outcome tracking (weekly), with Analyst queue off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new exception type | Abstain and route to an expert. |

**Deliberately not doing**

- Analyst name: irrelevant.
- Customer name: irrelevant and private.
- Queue name: an artefact.

**How the approach is proven**

Prove it offline on Fix accuracy against analyst actions, Priority rank quality and Abstention rate using time-ordered splits, then online on "Unbilled revenue days" with "Analyst handle time" as the guardrail. Watch for: Code-only labels, First-in first-out queues and Auto-corrections without approval.

## Baseline and production design

- **Baseline (build this first):** Queues by exception code worked in order of arrival, because it is the current workflow.
- **Production design:** A classifier on codes and notes with a value-at-risk ranking, a recommended fix with confidence and analyst approval.

## Why AI, and why this kind

**Why AI.** Classify and route billing exceptions such as unusual reads, rejected bills and mismatched accounts so analysts fix the most costly ones first. The evidence that separates good from bad outcomes (Exception code and text, Account and meter context, Value at risk) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the exception code" are what teams reach for first, and they fail because codes are broad and inconsistent. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A classifier on codes and notes with a value-at-risk ranking, a recommended fix with confidence and analyst approval.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Exception code and text, Account and meter context, Value at risk and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Queues by exception code worked in order of arrival, because it is the current workflow | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A classifier on codes and notes with a value-at-risk ranking, a recommended fix with confidence and analyst approval | chosen | Meets the run-window envelope at $0.043 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unbilled revenue days) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Code-only labels.
- Evaluation trap: First-in first-out queues.
- New exception type: the classifier has not seen it.
- Conflicting fixes: two analysts apply different fixes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
