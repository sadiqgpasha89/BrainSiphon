# Developer Documentation Question Answering: use-case brief

> Generated from the blueprint `devtools/developer-docs-qa` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Developer Documentation Question Answering · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Answer engineers' questions about internal platforms, standards and runbooks from the official docs with citations and escalate gaps to doc owners. The system has to run interactively, within a few seconds, inside these limits: Answers cite the current doc version, The assistant is read-only and Access follows document permissions.

**Why it is hard.** The obvious approach is model memory, and it fails because platform details change. The second trap is in "Gaps": the real signal is a logged gap for each unanswered question, while teams usually reach for a guess.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.9K a month. A mistake is expensive in the way doc gaps closed measures it.

**What success looks like.** Offline: Answer faithfulness on audited questions, Retrieval recall and Gap detection precision. Online: Questions answered without humans, Doc gaps closed and Time to find an answer. The launch is judged on "Questions answered without humans" while "Doc gaps closed" must not get worse.

## Objective, loss and constraints

**Business objective.** Answer engineers' questions about internal platforms, standards and runbooks from the official docs with citations and escalate gaps to doc owners.

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

- Answers cite the current doc version
- The assistant is read-only
- Access follows document permissions
- Unanswered questions create doc requests
- 30K questions per day

## The approach in one paragraph

Start with a wiki search and a chat channel where people ask each other, because it is the current routine. Then earn the move to a retrieval assistant over docs and runbooks with citations and dates, permission checks, gap detection and routing to owners, and only if it beats the baseline on Answer faithfulness on audited questions and Retrieval recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Retrieval relevance | Match between question and doc. Quality. Guard against: from the index. |
| Add Doc freshness | Last updated and review date. Trust. Guard against: from the doc system. |
| Add Owner and channel | The owning team. Escalation. Guard against: from the portal. |
| Run it as one pipeline | Question intake (chat), Permission-aware retrieval (doc index), Answer with citations (LLM with controlled content), Freshness check (rules), Gap logging (issue tracker) and Owner notification (messaging), with Quality review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle conflicting docs | Show both and flag the conflict. |

**Deliberately not doing**

- Asker name: personal data.
- Chat session length: weak link.
- Time of day: irrelevant.

**How the approach is proven**

Prove it offline on Answer faithfulness on audited questions, Retrieval recall and Gap detection precision using time-ordered splits, then online on "Questions answered without humans" with "Doc gaps closed" as the guardrail. Watch for: Uncited answers, Guessing on missing docs and Ignoring doc permissions.

## Baseline and production design

- **Baseline (build this first):** A wiki search and a chat channel where people ask each other, because it is the current routine.
- **Production design:** A retrieval assistant over docs and runbooks with citations and dates, permission checks, gap detection and routing to owners.

## Why AI, and why this kind

**Why AI.** Answer engineers' questions about internal platforms, standards and runbooks from the official docs with citations and escalate gaps to doc owners. The evidence that separates good from bad outcomes (Retrieval relevance, Doc freshness, Owner and channel) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model memory" are what teams reach for first, and they fail because platform details change. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A retrieval assistant over docs and runbooks with citations and dates, permission checks, gap detection and routing to owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Retrieval relevance, Doc freshness, Owner and channel and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A wiki search and a chat channel where people ask each other, because it is the current routine | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval assistant over docs and runbooks with citations and dates, permission checks, gap detection and routing to owners | chosen | Meets the 2500 ms envelope at $5.10 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Questions answered without humans) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Uncited answers.
- Evaluation trap: Guessing on missing docs.
- Conflicting docs: two pages disagree.
- Outdated runbook: the page is stale.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
