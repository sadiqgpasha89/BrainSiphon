# Code Completion Assistant: use-case brief

> Generated from the blueprint `saas/code-completion-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Code Completion Assistant · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Provide fast, context-aware code suggestions in the editor that developers accept often, with licence and security safeguards. The system has to run in under 100 milliseconds, inside these limits: First token under 200 ms, Repo-aware context and Licence compliance.

**Why it is hard.** The obvious approach is large model for every keystroke, and it fails because latency kills acceptance. The second trap is in "Metric": the real signal is persisted accepted characters, while teams usually reach for suggestion count.

**Scale and stakes.** At 10 million users this is about 300.0M model-touching events a day, 3.5K requests per second on average and 20.8K at peak, at an estimated $41.41M a month. A mistake is expensive in the way developer-reported productivity measures it.

**What success looks like.** Offline: Exact match and execution-based benchmarks and Latency percentiles. Online: Persisted accepted characters and Developer-reported productivity. The launch is judged on "Persisted accepted characters" while "Developer-reported productivity" must not get worse.

## Objective, loss and constraints

**Business objective.** Provide fast, context-aware code suggestions in the editor that developers accept often, with licence and security safeguards.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{context})\ \text{(fill-in-the-middle)}`

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
| \text{context} | The code around the cursor (before and after) that the model completes. |

**Hard constraints**

- First token under 200 ms
- Repo-aware context
- Licence compliance
- Cost per completion

## The approach in one paragraph

Start with static IDE autocomplete from symbols. Then earn the move to fIM-trained code model with repo-aware retrieval, small-model routing, caching and licence/security filters, and only if it beats the baseline on Exact match and execution-based benchmarks and Latency percentiles after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Context window quality | Relevant files retrieved. Accuracy. Guard against: retrieval. |
| Add Acceptance and persistence rate | Accepted and kept after 30 s. Quality. Guard against: telemetry. |
| Add Latency percentile | P95 time to first token. UX. Guard against: infrastructure. |
| Run it as one pipeline | Editor request (IDE plugin), Context assembler (repo index), Router (model selection), Completion model (vLLM FIM), Filters (licence and secrets), Suggestion display (IDE) and Acceptance telemetry (analytics). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle large monorepo context | Incremental indexing and fallback to local context. |

**Deliberately not doing**

- Suggestion length: weak.
- Editor theme: none.

**How the approach is proven**

Prove it offline on Exact match and execution-based benchmarks and Latency percentiles using time-ordered splits, then online on "Persisted accepted characters" with "Developer-reported productivity" as the guardrail. Watch for: Public benchmarks contaminated and Measuring raw acceptance.

## Baseline and production design

- **Baseline (build this first):** Static IDE autocomplete from symbols.
- **Production design:** FIM-trained code model with repo-aware retrieval, small-model routing, caching and licence/security filters.

## Why AI, and why this kind

**Why AI.** Provide fast, context-aware code suggestions in the editor that developers accept often, with licence and security safeguards. The evidence that separates good from bad outcomes (Context window quality, Acceptance and persistence rate, Latency percentile) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "large model for every keystroke" are what teams reach for first, and they fail because latency kills acceptance. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: FIM-trained code model with repo-aware retrieval, small-model routing, caching and licence/security filters.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Context window quality, Acceptance and persistence rate, Latency percentile and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static IDE autocomplete from symbols | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| FIM-trained code model with repo-aware retrieval, small-model routing, caching and licence/security filters | chosen | Meets the 80 ms envelope at $4.60 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Persisted accepted characters) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Public benchmarks contaminated.
- Evaluation trap: Measuring raw acceptance.
- Large monorepo context: slow retrieval and stale index.
- Model suggests licensed code verbatim: the model reproduces licensed code verbatim and exposes the company to legal risk.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
