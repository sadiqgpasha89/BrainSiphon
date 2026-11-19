# Automated Code Review Assistant: use-case brief

> Generated from the blueprint `saas/automated-code-review-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Automated Code Review Assistant · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Review pull requests for bugs, risks and style, posting high-signal comments that developers act on. The system has to run interactively, within a few seconds, inside these limits: Low noise (developers mute noisy bots), Repo context and Security of code.

**Why it is hard.** The obvious approach is comment on everything, and it fails because noisy bots get muted. The second trap is in "Context": the real signal is cross-file context and tests, while teams usually reach for diff-only analysis.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $5.53M a month. A mistake is expensive in the way developer mute/disable rate measures it.

**What success looks like.** Offline: Precision of posted comments (accepted rate) and Bug-catch rate on seeded defects. Online: Defects found pre-merge and Developer mute/disable rate. The launch is judged on "Defects found pre-merge" while "Developer mute/disable rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Review pull requests for bugs, risks and style, posting high-signal comments that developers act on.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{diff,context})+\lambda\,\mathrm{FalsePositive}`

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
| \text{diff,context} | The code change and the surrounding repository context. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{FalsePositive} | Penalty for review comments that are wrong or noisy. |

**Hard constraints**

- Low noise (developers mute noisy bots)
- Repo context
- Security of code
- PR latency minutes

## The approach in one paragraph

Start with linters and CI checks. Then earn the move to agentic reviewer with repo context retrieval, tool verification (tests/static analysis), confidence filtering and learning from developer feedback, and only if it beats the baseline on Precision of posted comments (accepted rate) and Bug-catch rate on seeded defects after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Comment acceptance rate | Accepted or resolved comments. Quality. Guard against: logging. |
| Add Static-analysis corroboration | Linter or analyser agreement. Evidence. Guard against: tools. |
| Add Test-failure linkage | Comment correlates to failing tests. Signal. Guard against: cI. |
| Run it as one pipeline | PR event (git hook), Diff and context retriever (repo graph), Verifier (tests and analysers), Comment ranker (acceptance model) and PR comments (bot), with Review agent and Developer feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle large PRs overflow context | Chunked review and risk-based focus. |

**Deliberately not doing**

- Style nitpicks: formatters handle them.
- Comment count: quantity.

**How the approach is proven**

Prove it offline on Precision of posted comments (accepted rate) and Bug-catch rate on seeded defects using time-ordered splits, then online on "Defects found pre-merge" with "Developer mute/disable rate" as the guardrail. Watch for: Counting all comments as value and Seeded bugs unlike real ones.

## Baseline and production design

- **Baseline (build this first):** Linters and CI checks.
- **Production design:** Agentic reviewer with repo context retrieval, tool verification (tests/static analysis), confidence filtering and learning from developer feedback.

## Why AI, and why this kind

**Why AI.** Review pull requests for bugs, risks and style, posting high-signal comments that developers act on. The evidence that separates good from bad outcomes (Comment acceptance rate, Static-analysis corroboration, Test-failure linkage) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "comment on everything" are what teams reach for first, and they fail because noisy bots get muted. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Agentic reviewer with repo context retrieval, tool verification (tests/static analysis), confidence filtering and learning from developer feedback.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Comment acceptance rate, Static-analysis corroboration, Test-failure linkage and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Linters and CI checks | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Agentic reviewer with repo context retrieval, tool verification (tests/static analysis), confidence filtering and learning from developer feedback | chosen | Meets the 2500 ms envelope at $6.14 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Defects found pre-merge) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Counting all comments as value.
- Evaluation trap: Seeded bugs unlike real ones.
- Large PRs overflow context: superficial review.
- Bot hallucinated bug in correct code: a hallucinated bug comment on correct code erodes developer trust in the reviewer.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
