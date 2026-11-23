# Repository-Aware Code Completion: use-case brief

> Generated from the blueprint `devtools/repo-aware-code-completion` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Repository-Aware Code Completion · **Domain:** devtools · **Latency tier:** sub-100ms · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Suggest the next lines and functions while a developer types, using the open files and the repository's own conventions, so common code is written faster and consistent with the codebase. The system has to run in under 100 milliseconds, inside these limits: Suggestion latency under 200 ms, Context limited to repositories the developer can access and Suggestions never include secrets.

**Why it is hard.** The obvious approach is generic public code only, and it fails because local APIs and styles matter. The second trap is in "Metric": the real signal is accepted and retained suggestions, while teams usually reach for suggestions shown.

**Scale and stakes.** At 10 million users this is about 1500.0M model-touching events a day, 17.4K requests per second on average and 104.2K at peak, at an estimated $207.37M a month. A mistake is expensive in the way time to complete tasks measures it.

**What success looks like.** Offline: Offline acceptance on held-out code, Secret leakage tests and Latency at p95. Online: Retained accepted code, Time to complete tasks and Defects in suggested code. The launch is judged on "Retained accepted code" while "Time to complete tasks" must not get worse.

## Objective, loss and constraints

**Business objective.** Suggest the next lines and functions while a developer types, using the open files and the repository's own conventions, so common code is written faster and consistent with the codebase.

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

- Suggestion latency under 200 ms
- Context limited to repositories the developer can access
- Suggestions never include secrets
- Licence and similarity checks on output
- 50K developers

## The approach in one paragraph

Start with language-server completion and snippets, because it is the standard editor feature. Then earn the move to a completion model with repository retrieval, a secret and licence filter, latency budgets and aggregated acceptance metrics, all running in the company boundary, and only if it beats the baseline on Offline acceptance on held-out code and Secret leakage tests after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Cursor and file context | Code around the cursor. Prompt basis. Guard against: from the editor. |
| Add Related file retrieval | Similar or imported files. Local conventions. Guard against: from the code index. |
| Add Language and framework | Detected language and libraries. Style. Guard against: from the project. |
| Run it as one pipeline | Editor context capture (IDE plugin), Repository retrieval (code index), Completion model (private LLM endpoint), Secret and licence filter (rules and scanner), Suggestion display (IDE), Acceptance and retention metrics (aggregated telemetry) and Model evaluation (monthly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle private repository access | Access checks at retrieval. |

**Deliberately not doing**

- Developer name: personal data.
- Editor theme: irrelevant.
- Keystroke timing: a monitoring artefact.

**How the approach is proven**

Prove it offline on Offline acceptance on held-out code, Secret leakage tests and Latency at p95 using time-ordered splits, then online on "Retained accepted code" with "Time to complete tasks" as the guardrail. Watch for: Shown-suggestion metrics, Unfiltered output and Ignoring repository access rights.

## Baseline and production design

- **Baseline (build this first):** Language-server completion and snippets, because it is the standard editor feature.
- **Production design:** A completion model with repository retrieval, a secret and licence filter, latency budgets and aggregated acceptance metrics, all running in the company boundary.

## Why AI, and why this kind

**Why AI.** Suggest the next lines and functions while a developer types, using the open files and the repository's own conventions, so common code is written faster and consistent with the codebase. The evidence that separates good from bad outcomes (Cursor and file context, Related file retrieval, Language and framework) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "generic public code only" are what teams reach for first, and they fail because local APIs and styles matter. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A completion model with repository retrieval, a secret and licence filter, latency budgets and aggregated acceptance metrics, all running in the company boundary.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Cursor and file context, Related file retrieval, Language and framework and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Language-server completion and snippets, because it is the standard editor feature | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A completion model with repository retrieval, a secret and licence filter, latency budgets and aggregated acceptance metrics, all running in the company boundary | chosen | Meets the 80 ms envelope at $4.61 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Retained accepted code) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Shown-suggestion metrics.
- Evaluation trap: Unfiltered output.
- Private repository access: the developer lacks access to a related file.
- Outdated API: suggestions use a deprecated function.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
