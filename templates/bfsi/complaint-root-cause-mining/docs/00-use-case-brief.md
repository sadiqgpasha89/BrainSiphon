# Complaint Root-Cause Mining: use-case brief

> Generated from the blueprint `bfsi/complaint-root-cause-mining` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Complaint Root-Cause Mining · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify complaints and cluster them by root cause so the bank fixes processes and meets regulatory complaint-handling duties. The system has to run as a scheduled batch job, inside these limits: Every complaint maps to the regulator's official categories, A reviewer signs off the classification and the root-cause report and A root-cause report goes to product owners every week.

**Why it is hard.** The obvious approach is the topic of the complaint, and it fails because a topic such as cards says nothing about what to fix, and the fix is in the cause. The second trap is in "Category": the real signal is the official category and product mapped from the complaint, while teams usually reach for free-form labels.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.9K a month. A mistake is expensive in the way repeat complaints measures it.

**What success looks like.** Offline: Category macro-F1 and Cluster purity. Online: Time to detect new issues and Repeat complaints. The launch is judged on "Time to detect new issues" while "Repeat complaints" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify complaints and cluster them by root cause so the bank fixes processes and meets regulatory complaint-handling duties.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{Contrastive}(z)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Contrastive} | Contrastive loss: pulls similar items together and pushes dissimilar items apart in embedding space. |
| z | The embedding vector of a complaint, used so similar root causes sit close together. |

**Hard constraints**

- Every complaint maps to the regulator's official categories
- A reviewer signs off the classification and the root-cause report
- A root-cause report goes to product owners every week
- Complaint text retained and deleted according to the retention policy

## The approach in one paragraph

Start with manual tagging and a monthly report, because it is the current process. Then earn the move to a classifier for regulatory categories and a clustering pipeline with labelled root causes and emerging-issue alerts, and only if it beats the baseline on Category macro-F1 and Cluster purity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Complaint embedding | Encoder vector of the complaint text clustered by similarity. Groups complaints by meaning. Guard against: language and writing style affect the clusters. |
| Add Product and process tags | Tags from the source system, such as product and channel. Context for the root cause. Guard against: tagging quality varies by team. |
| Add Repeat complainant | Count of earlier complaints by the same customer in 12 months. Points to unresolved issues. Guard against: privacy rules limit the use. |
| Run it as one pipeline | Complaint intake (CRM), Text processor (redaction), Category classifier (encoder), Cluster engine (embeddings plus HDBSCAN), Emerging issue detector (time-series), Owner dashboard (BI) and Action tracker (workflow). |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle multi-issue complaint | Use multi-label classification and route by the highest-priority label. |

**Deliberately not doing**

- Complaint length: Style of the customer and not the severity of the issue.
- Channel: A cohort effect that does not change the cause.
- Time of day: Has no link to the cause of a complaint.

**How the approach is proven**

Prove it offline on Category macro-F1 and Cluster purity using time-ordered splits, then online on "Time to detect new issues" with "Repeat complaints" as the guardrail. Watch for: Labels from stressed staff vary with workload, so the training set is noisy and Cluster drift as products and wording change, so last year's clusters no longer match.

## Baseline and production design

- **Baseline (build this first):** Manual tagging and a monthly report, because it is the current process.
- **Production design:** A classifier for regulatory categories and a clustering pipeline with labelled root causes and emerging-issue alerts.

## Why AI, and why this kind

**Why AI.** Classify complaints and cluster them by root cause so the bank fixes processes and meets regulatory complaint-handling duties. The evidence that separates good from bad outcomes (Complaint embedding, Product and process tags, Repeat complainant) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the topic of the complaint" are what teams reach for first, and they fail because A topic such as cards says nothing about what to fix, and the fix is in the cause. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A classifier for regulatory categories and a clustering pipeline with labelled root causes and emerging-issue alerts.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Complaint embedding, Product and process tags, Repeat complainant and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual tagging and a monthly report, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A classifier for regulatory categories and a clustering pipeline with labelled root causes and emerging-issue alerts | chosen | Meets the run-window envelope at $0.107 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to detect new issues) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels from stressed staff vary with workload, so the training set is noisy.
- Evaluation trap: Cluster drift as products and wording change, so last year's clusters no longer match.
- Multi-issue complaint: one complaint contains several issues and a single label hides the other causes.
- Product launch: a product launch causes a spike in complaints that looks like a new root cause.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
