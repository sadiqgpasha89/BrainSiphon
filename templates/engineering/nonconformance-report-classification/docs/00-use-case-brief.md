# Nonconformance Report Classification: use-case brief

> Generated from the blueprint `engineering/nonconformance-report-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Nonconformance Report Classification · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify nonconformance reports by cause, discipline and severity and find repeating patterns across projects and suppliers so quality managers can fix systemic causes. The system has to run as a scheduled batch job, inside these limits: Quality managers confirm classifications, Patterns shown by supplier and process, not by individual and Safety-related reports routed at once.

**Why it is hard.** The obvious approach is initial category, and it fails because initial categories are often wrong. The second trap is in "Level": the real signal is process, supplier and design, while teams usually reach for individual workers.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.9K a month. A mistake is expensive in the way time to root cause measures it.

**What success looks like.** Offline: Cause classification accuracy, Cluster quality and Safety recall. Online: Repeat nonconformances, Time to root cause and Rework cost. The launch is judged on "Repeat nonconformances" while "Time to root cause" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify nonconformance reports by cause, discipline and severity and find repeating patterns across projects and suppliers so quality managers can fix systemic causes.

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

- Quality managers confirm classifications
- Patterns shown by supplier and process, not by individual
- Safety-related reports routed at once
- Weekly analysis of 100K reports
- No personal blame fields

## The approach in one paragraph

Start with quality managers reading and categorising reports by hand, because it is the usual practice. Then earn the move to a classifier and clustering tool that proposes cause categories and groups repeating issues by process and supplier for quality reviews, and only if it beats the baseline on Cause classification accuracy and Cluster quality after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Report text and photos | Description of the issue. Core. Guard against: from the quality system. |
| Add Work package and supplier | Where the issue arose. Pattern. Guard against: from project data. |
| Add Inspection stage | When it was found. Context. Guard against: from records. |
| Run it as one pipeline | Text and image parsing (NLP and vision), Cause classifier (transformer), Pattern clustering (analytics), Corrective action (tracker) and Effectiveness check (quarterly), with Report intake and Quality manager review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle free-text vagueness | Request details. |

**Deliberately not doing**

- Reporter name: personal data.
- Report number: an identifier.
- Photo count: weak link.

**How the approach is proven**

Prove it offline on Cause classification accuracy, Cluster quality and Safety recall using time-ordered splits, then online on "Repeat nonconformances" with "Time to root cause" as the guardrail. Watch for: Initial category as label, Individual blame and Report counts as quality.

## Baseline and production design

- **Baseline (build this first):** Quality managers reading and categorising reports by hand, because it is the usual practice.
- **Production design:** A classifier and clustering tool that proposes cause categories and groups repeating issues by process and supplier for quality reviews.

## Why AI, and why this kind

**Why AI.** Classify nonconformance reports by cause, discipline and severity and find repeating patterns across projects and suppliers so quality managers can fix systemic causes. The evidence that separates good from bad outcomes (Report text and photos, Work package and supplier, Inspection stage) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "initial category" are what teams reach for first, and they fail because initial categories are often wrong. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A classifier and clustering tool that proposes cause categories and groups repeating issues by process and supplier for quality reviews.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Report text and photos, Work package and supplier, Inspection stage and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Quality managers reading and categorising reports by hand, because it is the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A classifier and clustering tool that proposes cause categories and groups repeating issues by process and supplier for quality reviews | chosen | Meets the run-window envelope at $0.105 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Repeat nonconformances) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Initial category as label.
- Evaluation trap: Individual blame.
- Free-text vagueness: the report lacks detail.
- Multiple causes: one report has several causes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
