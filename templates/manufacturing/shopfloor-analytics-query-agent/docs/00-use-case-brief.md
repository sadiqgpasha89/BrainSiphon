# Shop-Floor Analytics Query Agent: use-case brief

> Generated from the blueprint `manufacturing/shopfloor-analytics-query-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Shop-Floor Analytics Query Agent · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Let supervisors and engineers ask questions in plain language about output, quality, downtime and energy and get correct charts and numbers with the definitions and sources shown. The system has to run interactively, within a few seconds, inside these limits: Queries run only against a governed semantic layer, Metrics use the plant definitions and The agent is read-only.

**Why it is hard.** The obvious approach is the model inventing SQL on raw tables, and it fails because different definitions give different numbers. The second trap is in "Trust": the real signal is the query and sources shown with every answer, while teams usually reach for a number with no lineage.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $834.0K a month. A mistake is expensive in the way time to answer a plant question measures it.

**What success looks like.** Offline: Answer accuracy against analyst-verified queries, Query validity rate and Refusal accuracy for out-of-scope questions. Online: Analyst requests avoided, Time to answer a plant question and Disputes over numbers. The launch is judged on "Analyst requests avoided" while "Time to answer a plant question" must not get worse.

## Objective, loss and constraints

**Business objective.** Let supervisors and engineers ask questions in plain language about output, quality, downtime and energy and get correct charts and numbers with the definitions and sources shown.

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

- Queries run only against a governed semantic layer
- Metrics use the plant definitions
- The agent is read-only
- Every answer shows its query and data freshness
- Answer within 8 s

## The approach in one paragraph

Start with fixed dashboards by role, because they are the current way plants see metrics. Then earn the move to a text-to-metrics agent over a semantic layer with entity resolution, validation of generated queries, charts with definitions and a log for governance, and only if it beats the baseline on Answer accuracy against analyst-verified queries and Query validity rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Metric match | Whether the question maps to a governed metric. Correctness. Guard against: semantic layer coverage. |
| Add Time and entity resolution | Lines, shifts and periods resolved. Right slice. Guard against: check ambiguities. |
| Add Data freshness | Age of the data used. Trust. Guard against: from pipelines. |
| Run it as one pipeline | Question intake (chat and dashboard), Entity and period resolution (LLM with lookups), Query generation (semantic layer API), Result validation (rules), Chart and answer (LLM with citations) and Governance log (lakehouse), with User feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle ambiguous line name | Ask which one and show the options. |

**Deliberately not doing**

- Question phrasing: not substance.
- User seniority: not relevant to correctness.
- Chat length: an artefact.

**How the approach is proven**

Prove it offline on Answer accuracy against analyst-verified queries, Query validity rate and Refusal accuracy for out-of-scope questions using time-ordered splits, then online on "Analyst requests avoided" with "Time to answer a plant question" as the guardrail. Watch for: Free SQL on raw tables, Hiding query and lineage and Answering out of scope.

## Baseline and production design

- **Baseline (build this first):** Fixed dashboards by role, because they are the current way plants see metrics.
- **Production design:** A text-to-metrics agent over a semantic layer with entity resolution, validation of generated queries, charts with definitions and a log for governance.

## Why AI, and why this kind

**Why AI.** Let supervisors and engineers ask questions in plain language about output, quality, downtime and energy and get correct charts and numbers with the definitions and sources shown. The evidence that separates good from bad outcomes (Metric match, Time and entity resolution, Data freshness) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the model inventing SQL on raw tables" are what teams reach for first, and they fail because different definitions give different numbers. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A text-to-metrics agent over a semantic layer with entity resolution, validation of generated queries, charts with definitions and a log for governance.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Metric match, Time and entity resolution, Data freshness and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed dashboards by role, because they are the current way plants see metrics | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A text-to-metrics agent over a semantic layer with entity resolution, validation of generated queries, charts with definitions and a log for governance | chosen | Meets the 2500 ms envelope at $4.63 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Analyst requests avoided) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Free SQL on raw tables.
- Evaluation trap: Hiding query and lineage.
- Ambiguous line name: two lines match.
- Metric not defined: no governed metric exists.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
