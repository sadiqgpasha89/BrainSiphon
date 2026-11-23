# Duplicate Issue Detection: use-case brief

> Generated from the blueprint `devtools/duplicate-issue-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Duplicate Issue Detection · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find existing issues that describe the same problem and link them so reports and fixes are not duplicated and users see known workarounds. The system has to run interactively, within a few seconds, inside these limits: Suggest duplicates and never close automatically, Show the existing issue and workaround and Precision above 85% for suggested duplicates.

**Why it is hard.** The obvious approach is same words, and it fails because different words can describe one bug. The second trap is in "Action": the real signal is a suggestion to the reporter and maintainer, while teams usually reach for auto-close.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $12.2K a month. A mistake is expensive in the way time to first fix measures it.

**What success looks like.** Offline: Precision at five, Recall of known duplicates and Maintainer acceptance. Online: Duplicate issues filed, Time to first fix and Triage effort. The launch is judged on "Duplicate issues filed" while "Time to first fix" must not get worse.

## Objective, loss and constraints

**Business objective.** Find existing issues that describe the same problem and link them so reports and fixes are not duplicated and users see known workarounds.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{RankLoss} | Ranking loss: penalises placing a less relevant item above a more relevant one. |

**Hard constraints**

- Suggest duplicates and never close automatically
- Show the existing issue and workaround
- Precision above 85% for suggested duplicates
- Suggestions within 2 s
- 1M issues indexed

## The approach in one paragraph

Start with keyword search by the reporter before filing, because it is the standard practice. Then earn the move to a hybrid search that shows likely duplicates while the reporter types, with maintainer confirmation and linking, and a duplicate cluster view, and only if it beats the baseline on Precision at five and Recall of known duplicates after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Semantic similarity | Embedding similarity of texts. Core. Guard against: from a text model. |
| Add Error signature match | Same stack trace or message. Strong evidence. Guard against: from extraction. |
| Add Version and platform | Same product and version. Context. Guard against: from metadata. |
| Run it as one pipeline | Draft issue text (tracker form), Embedding and signature search (index), Candidate ranking (learned ranker), Suggestion display (tracker UI), Maintainer confirmation (tracker) and Link creation (tracker), with Feedback off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle similar symptoms | Show candidates and let humans decide. |

**Deliberately not doing**

- Reporter name: personal data.
- Issue age alone: weak link.
- Comment count: weak link.

**How the approach is proven**

Prove it offline on Precision at five, Recall of known duplicates and Maintainer acceptance using time-ordered splits, then online on "Duplicate issues filed" with "Time to first fix" as the guardrail. Watch for: Auto-closing duplicates, Word-match search and Ignoring versions.

## Baseline and production design

- **Baseline (build this first):** Keyword search by the reporter before filing, because it is the standard practice.
- **Production design:** A hybrid search that shows likely duplicates while the reporter types, with maintainer confirmation and linking, and a duplicate cluster view.

## Why AI, and why this kind

**Why AI.** Find existing issues that describe the same problem and link them so reports and fixes are not duplicated and users see known workarounds. The evidence that separates good from bad outcomes (Semantic similarity, Error signature match, Version and platform) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "same words" are what teams reach for first, and they fail because different words can describe one bug. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A hybrid search that shows likely duplicates while the reporter types, with maintainer confirmation and linking, and a duplicate cluster view.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Semantic similarity, Error signature match, Version and platform and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword search by the reporter before filing, because it is the standard practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A hybrid search that shows likely duplicates while the reporter types, with maintainer confirmation and linking, and a duplicate cluster view | chosen | Meets the 2500 ms envelope at $1.36 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Duplicate issues filed) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Auto-closing duplicates.
- Evaluation trap: Word-match search.
- Similar symptoms: different causes share symptoms.
- Fixed issues: the old issue is fixed in a newer version.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
