# Pull Request Description and Commit Message Drafting: use-case brief

> Generated from the blueprint `devtools/pr-description-commit-message-drafting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Pull Request Description and Commit Message Drafting · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Draft pull request descriptions and commit messages from the diff, linked issues and conventions so reviewers understand a change quickly, with the author editing before submission. The system has to run interactively, within a few seconds, inside these limits: The author reviews every draft, Descriptions list files and risks from the diff and Linked issues are real references.

**Why it is hard.** The obvious approach is a plausible summary, and it fails because a wrong summary misleads review. The second trap is in "Role": the real signal is a draft for the author, while teams usually reach for an automatic submission.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.7K a month. A mistake is expensive in the way description edits by reviewers measures it.

**What success looks like.** Offline: Faithfulness to the diff, Author edit rate and Reviewer rating of clarity. Online: Review time, Description edits by reviewers and Pull requests with empty descriptions. The launch is judged on "Review time" while "Description edits by reviewers" must not get worse.

## Objective, loss and constraints

**Business objective.** Draft pull request descriptions and commit messages from the diff, linked issues and conventions so reviewers understand a change quickly, with the author editing before submission.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| x | The input features describing one example (what the model sees). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- The author reviews every draft
- Descriptions list files and risks from the diff
- Linked issues are real references
- Draft within 5 s
- 200K pull requests per month

## The approach in one paragraph

Start with authors writing descriptions by hand from templates, because it is the current practice. Then earn the move to a drafting assistant that fills the team template from the diff and issue, flags missing tests and risk areas and lets the author edit before posting, and only if it beats the baseline on Faithfulness to the diff and Author edit rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Diff summary | Files and changes by area. Content. Guard against: from the diff. |
| Add Linked issue text | The issue the change closes. Intent. Guard against: from the tracker. |
| Add Test changes | Tests added or changed. Risk note. Guard against: from the diff. |
| Run it as one pipeline | Diff and issue retrieval (code host), Change summarisation (LLM), Template fill (rules), Risk note (rules and model), Author edit (pull request UI) and Posting (code host), with Edit-rate review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle huge diff | Split by area and warn on size. |

**Deliberately not doing**

- Author name: personal data.
- Branch name wording: weak link.
- Commit time: irrelevant.

**How the approach is proven**

Prove it offline on Faithfulness to the diff, Author edit rate and Reviewer rating of clarity using time-ordered splits, then online on "Review time" with "Description edits by reviewers" as the guardrail. Watch for: Auto-posting, Summaries with no diff check and Free text only.

## Baseline and production design

- **Baseline (build this first):** Authors writing descriptions by hand from templates, because it is the current practice.
- **Production design:** A drafting assistant that fills the team template from the diff and issue, flags missing tests and risk areas and lets the author edit before posting.

## Why AI, and why this kind

**Why AI.** Draft pull request descriptions and commit messages from the diff, linked issues and conventions so reviewers understand a change quickly, with the author editing before submission. The evidence that separates good from bad outcomes (Diff summary, Linked issue text, Test changes) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A plausible summary" are what teams reach for first, and they fail because A wrong summary misleads review. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A drafting assistant that fills the team template from the diff and issue, flags missing tests and risk areas and lets the author edit before posting.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Diff summary, Linked issue text, Test changes and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Authors writing descriptions by hand from templates, because it is the current practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A drafting assistant that fills the team template from the diff and issue, flags missing tests and risk areas and lets the author edit before posting | chosen | Meets the 2500 ms envelope at $5.08 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Review time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Auto-posting.
- Evaluation trap: Summaries with no diff check.
- Huge diff: the summary loses detail.
- Generated files: the diff is mostly generated.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
