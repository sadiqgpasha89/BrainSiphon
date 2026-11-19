# Natural Language to SQL for Analytics: use-case brief

> Generated from the blueprint `saas/natural-language-to-sql` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Natural Language to SQL for Analytics · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Let business users ask questions in plain language and receive correct SQL and results using a governed semantic layer. The system has to run interactively, within a few seconds, inside these limits: Row-level security, Read-only and Correct metric definitions.

**Why it is hard.** The obvious approach is raw schema generation, and it fails because same word means different metrics. The second trap is in "Evaluation": the real signal is execution accuracy on golden queries, while teams usually reach for exact string match.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $474.8K a month. A mistake is expensive in the way analyst request backlog measures it.

**What success looks like.** Offline: Execution accuracy on golden queries and Wrong-answer rate. Online: Self-serve query success and Analyst request backlog. The launch is judged on "Self-serve query success" while "Analyst request backlog" must not get worse.

## Objective, loss and constraints

**Business objective.** Let business users ask questions in plain language and receive correct SQL and results using a governed semantic layer.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{schema})+\lambda\,\mathrm{ExecutionMismatch}`

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
| \text{schema} | The database schema (tables and columns). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ExecutionMismatch} | Penalty when the generated SQL returns different results from the reference query. |

**Hard constraints**

- Row-level security
- Read-only
- Correct metric definitions
- Query cost limits

## The approach in one paragraph

Start with bI dashboard with filters. Then earn the move to schema-linked generation over a semantic layer, with validation, cost limits, row-level security and result explanations, and only if it beats the baseline on Execution accuracy on golden queries and Wrong-answer rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Schema linking accuracy | Right tables and columns. Correctness. Guard against: metadata quality. |
| Add Execution validity and sanity | Runs and passes sanity checks. Safety. Guard against: checks. |
| Add Query cost estimate | Planner cost. Guardrail. Guard against: warehouse. |
| Run it as one pipeline | Question (chat), Schema and metric linker (retriever), SQL generator (LLM), Validator and cost guard (planner), Read-only executor (warehouse) and Result explainer (LLM), with Feedback and corrections off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle ambiguous metric names | Clarifying question and metric-layer resolution. |

**Deliberately not doing**

- SQL formatting: cosmetic.
- Question length: weak.

**How the approach is proven**

Prove it offline on Execution accuracy on golden queries and Wrong-answer rate using time-ordered splits, then online on "Self-serve query success" with "Analyst request backlog" as the guardrail. Watch for: Benchmark leakage and Golden queries simpler than real.

## Baseline and production design

- **Baseline (build this first):** BI dashboard with filters.
- **Production design:** Schema-linked generation over a semantic layer, with validation, cost limits, row-level security and result explanations.

## Why AI, and why this kind

**Why AI.** Let business users ask questions in plain language and receive correct SQL and results using a governed semantic layer. The evidence that separates good from bad outcomes (Schema linking accuracy, Execution validity and sanity, Query cost estimate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw schema generation" are what teams reach for first, and they fail because same word means different metrics. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Schema-linked generation over a semantic layer, with validation, cost limits, row-level security and result explanations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Schema linking accuracy, Execution validity and sanity, Query cost estimate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: BI dashboard with filters | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Schema-linked generation over a semantic layer, with validation, cost limits, row-level security and result explanations | chosen | Meets the 2500 ms envelope at $5.28 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Self-serve query success) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Benchmark leakage.
- Evaluation trap: Golden queries simpler than real.
- Ambiguous metric names: wrong definition used silently.
- Expensive query scans the full warehouse: an unconstrained generated query scans the whole warehouse and causes a cost spike.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
