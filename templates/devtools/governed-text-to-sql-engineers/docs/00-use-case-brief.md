# Governed Text-to-SQL for Engineers: use-case brief

> Generated from the blueprint `devtools/governed-text-to-sql-engineers` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Governed Text-to-SQL for Engineers · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Let engineers query operational and product data in plain language through a governed semantic layer with row and column access controls, showing the query and sources. The system has to run interactively, within a few seconds, inside these limits: Queries run only on the governed semantic layer, Read-only with row limits and Access follows data permissions.

**Why it is hard.** The obvious approach is raw table access, and it fails because raw access leaks data and costs money. The second trap is in "Trust": the real signal is the query and definitions shown, while teams usually reach for a number with no lineage.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $419.4K a month. A mistake is expensive in the way time to answer measures it.

**What success looks like.** Offline: Answer accuracy against analyst queries, Permission violation rate and Refusal accuracy for out-of-scope questions. Online: Analyst requests, Time to answer and Disputes about numbers. The launch is judged on "Analyst requests" while "Time to answer" must not get worse.

## Objective, loss and constraints

**Business objective.** Let engineers query operational and product data in plain language through a governed semantic layer with row and column access controls, showing the query and sources.

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

- Queries run only on the governed semantic layer
- Read-only with row limits
- Access follows data permissions
- Every answer shows the query
- Answer within 10 s

## The approach in one paragraph

Start with analysts and SQL editors with training, because they are the current way. Then earn the move to a text-to-metrics agent over a semantic layer with permission checks, cost limits and sanity validation that shows its query and definitions and logs usage, and only if it beats the baseline on Answer accuracy against analyst queries and Permission violation rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Metric and entity match | Whether the question maps to a defined metric. Correctness. Guard against: from the semantic layer. |
| Add Permission scope | Tables and columns the user may read. Gate. Guard against: from identity. |
| Add Query cost estimate | Scan size. Safety. Guard against: from the planner. |
| Run it as one pipeline | Question intake (chat), Entity resolution (semantic layer), Query generation (LLM with constraints), Permission and cost check (policy), Query run (warehouse read replica), Result validation (rules) and Answer with query (UI). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle ambiguous metric | Ask which one. |

**Deliberately not doing**

- Asker name: personal data.
- Question wording: not substance.
- Chat length: an artefact.

**How the approach is proven**

Prove it offline on Answer accuracy against analyst queries, Permission violation rate and Refusal accuracy for out-of-scope questions using time-ordered splits, then online on "Analyst requests" with "Time to answer" as the guardrail. Watch for: Raw table access, Hidden queries and Answers out of scope.

## Baseline and production design

- **Baseline (build this first):** Analysts and SQL editors with training, because they are the current way.
- **Production design:** A text-to-metrics agent over a semantic layer with permission checks, cost limits and sanity validation that shows its query and definitions and logs usage.

## Why AI, and why this kind

**Why AI.** Let engineers query operational and product data in plain language through a governed semantic layer with row and column access controls, showing the query and sources. The evidence that separates good from bad outcomes (Metric and entity match, Permission scope, Query cost estimate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw table access" are what teams reach for first, and they fail because raw access leaks data and costs money. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A text-to-metrics agent over a semantic layer with permission checks, cost limits and sanity validation that shows its query and definitions and logs usage.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Metric and entity match, Permission scope, Query cost estimate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Analysts and SQL editors with training, because they are the current way | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A text-to-metrics agent over a semantic layer with permission checks, cost limits and sanity validation that shows its query and definitions and logs usage | chosen | Meets the 2500 ms envelope at $4.66 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Analyst requests) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Raw table access.
- Evaluation trap: Hidden queries.
- Ambiguous metric: the question has two meanings.
- Expensive query: the generated query would scan a very large table.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
