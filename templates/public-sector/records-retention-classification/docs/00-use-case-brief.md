# Records Retention Classification: use-case brief

> Generated from the blueprint `public-sector/records-retention-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Records Retention Classification · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify documents and emails into records categories with retention rules so records are kept as long as the law requires and deleted when the period ends. The system has to run as a scheduled batch job, inside these limits: Category with confidence and the retention rule, Legal holds override deletion and Records officers approve disposal lists.

**Why it is hard.** The obvious approach is folder names, and it fails because folders are inconsistent. The second trap is in "Safety": the real signal is legal holds checked before disposal, while teams usually reach for retention timers alone.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.9K a month. A mistake is expensive in the way storage cost measures it.

**What success looks like.** Offline: Category accuracy, Hold check recall and Disposal error rate on samples. Online: Documents correctly retained, Storage cost and Disposal errors. The launch is judged on "Documents correctly retained" while "Storage cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify documents and emails into records categories with retention rules so records are kept as long as the law requires and deleted when the period ends.

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

- Category with confidence and the retention rule
- Legal holds override deletion
- Records officers approve disposal lists
- Audit log of every disposal
- 50M documents

## The approach in one paragraph

Start with retention schedules applied by office staff by hand, because it is the current practice. Then earn the move to a classifier with confidence and rule lookup, a hold check, sampled review and disposal approval lists with logs, and only if it beats the baseline on Category accuracy and Hold check recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Document type and content | Text and attachments. Category. Guard against: from the classifier. |
| Add Creator unit and function | Office and business function. Context. Guard against: from the directory. |
| Add Date and trigger event | Creation date and closure event. Retention start. Guard against: from metadata. |
| Run it as one pipeline | Document intake (records system), Classification (transformer), Retention rule lookup (schedule), Legal hold check (case system), Disposal list (records workflow) and Officer approval (records tool), with Audit log off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle unknown category | Abstain and ask an officer. |

**Deliberately not doing**

- Author name: irrelevant.
- File size: weak link.
- Folder name: an artefact.

**How the approach is proven**

Prove it offline on Category accuracy, Hold check recall and Disposal error rate on samples using time-ordered splits, then online on "Documents correctly retained" with "Storage cost" as the guardrail. Watch for: Automatic deletion, Skipping hold checks and Folder-based labels.

## Baseline and production design

- **Baseline (build this first):** Retention schedules applied by office staff by hand, because it is the current practice.
- **Production design:** A classifier with confidence and rule lookup, a hold check, sampled review and disposal approval lists with logs.

## Why AI, and why this kind

**Why AI.** Classify documents and emails into records categories with retention rules so records are kept as long as the law requires and deleted when the period ends. The evidence that separates good from bad outcomes (Document type and content, Creator unit and function, Date and trigger event) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "folder names" are what teams reach for first, and they fail because folders are inconsistent. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A classifier with confidence and rule lookup, a hold check, sampled review and disposal approval lists with logs.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Document type and content, Creator unit and function, Date and trigger event and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Retention schedules applied by office staff by hand, because it is the current practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A classifier with confidence and rule lookup, a hold check, sampled review and disposal approval lists with logs | chosen | Meets the run-window envelope at $0.106 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Documents correctly retained) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Automatic deletion.
- Evaluation trap: Skipping hold checks.
- Unknown category: no retention rule fits the document.
- Late hold: a hold arrives after listing.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
