# Work Order Failure Code Classification: use-case brief

> Generated from the blueprint `manufacturing/work-order-failure-code-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Work Order Failure Code Classification · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Assign standard failure codes and causes to maintenance work orders from technician text so reliability analysis rests on consistent data. The system has to run interactively, within a few seconds, inside these limits: Technician confirms the suggested code, Codes follow the company taxonomy and Multilingual text supported.

**Why it is hard.** The obvious approach is free text categories, and it fails because reports need consistent codes. The second trap is in "Label": the real signal is codes reviewed by reliability engineers, while teams usually reach for whatever the technician picked in a hurry.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $12.3K a month. A mistake is expensive in the way time spent coding measures it.

**What success looks like.** Offline: Top-one and top-three accuracy by asset class, Agreement with engineer review and Calibration. Online: Share of work orders with a valid code, Time spent coding and Reliability analysis rework. The launch is judged on "Share of work orders with a valid code" while "Time spent coding" must not get worse.

## Objective, loss and constraints

**Business objective.** Assign standard failure codes and causes to maintenance work orders from technician text so reliability analysis rests on consistent data.

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

- Technician confirms the suggested code
- Codes follow the company taxonomy
- Multilingual text supported
- 20K work orders per day

## The approach in one paragraph

Start with keyword rules mapping common terms to codes, because reliability teams already use similar lists. Then earn the move to a multilingual text classifier constrained by asset class, with confidence-based auto-suggest and an audit sample, plus a monthly code quality report, and only if it beats the baseline on Top-one and top-three accuracy by asset class and Agreement with engineer review after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Component and symptom terms | Named parts and symptoms in the text. Primary evidence. Guard against: maintain a synonym list. |
| Add Asset class | The type of asset. Restricts valid codes. Guard against: from the CMMS. |
| Add Action verbs | Replaced, adjusted, cleaned. Distinguishes the cause from the action. Guard against: parse the action text. |
| Run it as one pipeline | Work order intake (CMMS), Text normalisation (language detection), Code classifier (transformer), Asset class constraint (rule filter), Suggestion in form (CMMS UI) and Technician confirmation (click), with Quality audit off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle slang and abbreviations | Site-specific lexicons and a review loop. |

**Deliberately not doing**

- Technician name: irrelevant.
- Text length: not the code.
- Priority level alone: weak link.

**How the approach is proven**

Prove it offline on Top-one and top-three accuracy by asset class, Agreement with engineer review and Calibration using time-ordered splits, then online on "Share of work orders with a valid code" with "Time spent coding" as the guardrail. Watch for: Training on hurried default picks, Auto-assigning without review and Ignoring asset class.

## Baseline and production design

- **Baseline (build this first):** Keyword rules mapping common terms to codes, because reliability teams already use similar lists.
- **Production design:** A multilingual text classifier constrained by asset class, with confidence-based auto-suggest and an audit sample, plus a monthly code quality report.

## Why AI, and why this kind

**Why AI.** Assign standard failure codes and causes to maintenance work orders from technician text so reliability analysis rests on consistent data. The evidence that separates good from bad outcomes (Component and symptom terms, Asset class, Action verbs) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free text categories" are what teams reach for first, and they fail because reports need consistent codes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A multilingual text classifier constrained by asset class, with confidence-based auto-suggest and an audit sample, plus a monthly code quality report.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Component and symptom terms, Asset class, Action verbs and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword rules mapping common terms to codes, because reliability teams already use similar lists | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A multilingual text classifier constrained by asset class, with confidence-based auto-suggest and an audit sample, plus a monthly code quality report | chosen | Meets the 2500 ms envelope at $0.137 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Share of work orders with a valid code) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on hurried default picks.
- Evaluation trap: Auto-assigning without review.
- Slang and abbreviations: the classifier misreads the text.
- Multiple failures in one order: several codes apply.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
