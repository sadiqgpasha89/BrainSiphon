# Code Explanation and Onboarding Assistant: use-case brief

> Generated from the blueprint `devtools/code-explanation-onboarding-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Code Explanation and Onboarding Assistant · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Explain what a module, function or service does, who owns it and how it is deployed, with links to the code and docs, so new engineers get productive faster. The system has to run interactively, within a few seconds, inside these limits: Every explanation links to the code and docs it used, Access follows repository permissions and The assistant is read-only.

**Why it is hard.** The obvious approach is model memory, and it fails because wrong explanations mislead. The second trap is in "Evidence": the real signal is links to files and lines, while teams usually reach for a free explanation.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $87.2K a month. A mistake is expensive in the way questions to senior engineers measures it.

**What success looks like.** Offline: Answer faithfulness on audited questions, Retrieval accuracy and Link correctness. Online: Time to first contribution, Questions to senior engineers and Docs updated after feedback. The launch is judged on "Time to first contribution" while "Questions to senior engineers" must not get worse.

## Objective, loss and constraints

**Business objective.** Explain what a module, function or service does, who owns it and how it is deployed, with links to the code and docs, so new engineers get productive faster.

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

- Every explanation links to the code and docs it used
- Access follows repository permissions
- The assistant is read-only
- Answers within 8 s
- 10K questions per day

## The approach in one paragraph

Start with reading code and wikis and asking colleagues, because it is how people learn systems today. Then earn the move to a retrieval assistant over code, docs and ownership data with citations to files and lines, permission checks and a feedback path to doc owners, and only if it beats the baseline on Answer faithfulness on audited questions and Retrieval accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Code and doc retrieval | Relevant files and pages. Grounding. Guard against: from the index. |
| Add Ownership data | Owning team and on-call. Routing. Guard against: from the portal. |
| Add Recent change history | Recent commits and incidents. Context. Guard against: from version control. |
| Run it as one pipeline | Question intake (chat or IDE), Permission check (identity), Hybrid retrieval (code and doc index), Answer with links (LLM with citations) and Ownership lookup (developer portal), with Feedback to doc owners and Usage review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle stale docs | Prefer code and flag the conflict. |

**Deliberately not doing**

- Asker name: personal data.
- Chat length: weak link.
- Time of day: irrelevant.

**How the approach is proven**

Prove it offline on Answer faithfulness on audited questions, Retrieval accuracy and Link correctness using time-ordered splits, then online on "Time to first contribution" with "Questions to senior engineers" as the guardrail. Watch for: Answers with no links, Ignoring access rights and Relying on stale docs.

## Baseline and production design

- **Baseline (build this first):** Reading code and wikis and asking colleagues, because it is how people learn systems today.
- **Production design:** A retrieval assistant over code, docs and ownership data with citations to files and lines, permission checks and a feedback path to doc owners.

## Why AI, and why this kind

**Why AI.** Explain what a module, function or service does, who owns it and how it is deployed, with links to the code and docs, so new engineers get productive faster. The evidence that separates good from bad outcomes (Code and doc retrieval, Ownership data, Recent change history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model memory" are what teams reach for first, and they fail because wrong explanations mislead. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A retrieval assistant over code, docs and ownership data with citations to files and lines, permission checks and a feedback path to doc owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Code and doc retrieval, Ownership data, Recent change history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Reading code and wikis and asking colleagues, because it is how people learn systems today | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval assistant over code, docs and ownership data with citations to files and lines, permission checks and a feedback path to doc owners | chosen | Meets the 2500 ms envelope at $4.84 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to first contribution) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Answers with no links.
- Evaluation trap: Ignoring access rights.
- Stale docs: the docs disagree with the code.
- Restricted repository: the asker lacks access.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
