# Marketing Analytics Copilot Agent: use-case brief

> Generated from the blueprint `adtech/marketing-copilot-analyst-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Marketing Analytics Copilot Agent · **Domain:** adtech · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Let marketers ask questions in plain language and get correct, reproducible analyses and chart-backed recommendations from campaign data. The system has to run interactively, within a few seconds, inside these limits: Read-only access, Row-level security and Reproducible SQL.

**Why it is hard.** The obvious approach is lLM states numbers from memory, and it fails because models hallucinate numbers. The second trap is in "Semantics": the real signal is governed metric layer definitions, while teams usually reach for raw table querying.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $121.5K a month. A mistake is expensive in the way analyst escalations measures it.

**What success looks like.** Offline: SQL execution accuracy on golden questions and Number faithfulness. Online: Time to insight and Analyst escalations. The launch is judged on "Time to insight" while "Analyst escalations" must not get worse.

## Objective, loss and constraints

**Business objective.** Let marketers ask questions in plain language and get correct, reproducible analyses and chart-backed recommendations from campaign data.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{schema,results})+\lambda\,\mathrm{WrongQuery}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The tokens of the target query or answer: y_t at position t. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| \text{schema,results} | The data schema and query results the assistant can see. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{WrongQuery} | Penalty when generated queries are invalid or do not answer the question. |

**Hard constraints**

- Read-only access
- Row-level security
- Reproducible SQL
- Numbers computed by tools not the LLM

## The approach in one paragraph

Start with bI dashboards with filters. Then earn the move to agent over a semantic metrics layer with SQL tools, result sanity checks, citations to queries and human review for decisions, and only if it beats the baseline on SQL execution accuracy on golden questions and Number faithfulness after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Metric-layer coverage | Share of questions answerable via governed metrics. Reliability. Guard against: layer. |
| Add Query validity and result checks | Row-count and sanity checks. Correctness. Guard against: checks. |
| Add Answer reproducibility | Same question gives same answer. Trust. Guard against: seed. |
| Run it as one pipeline | User question (chat), Intent and schema linking (LLM), SQL tool (read-only warehouse), Result checker (sanity rules), Chart and narrative (LLM), Marketer (human) and Query log (audit). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle ambiguous metric names | Disambiguation via metric layer and clarifying questions. |

**Deliberately not doing**

- Chart colour: none.
- Answer verbosity: none.

**How the approach is proven**

Prove it offline on SQL execution accuracy on golden questions and Number faithfulness using time-ordered splits, then online on "Time to insight" with "Analyst escalations" as the guardrail. Watch for: Golden questions simpler than real and Judging narrative not numbers.

## Baseline and production design

- **Baseline (build this first):** BI dashboards with filters.
- **Production design:** Agent over a semantic metrics layer with SQL tools, result sanity checks, citations to queries and human review for decisions.

## Why AI, and why this kind

**Why AI.** Let marketers ask questions in plain language and get correct, reproducible analyses and chart-backed recommendations from campaign data. The evidence that separates good from bad outcomes (Metric-layer coverage, Query validity and result checks, Answer reproducibility) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "LLM states numbers from memory" are what teams reach for first, and they fail because models hallucinate numbers. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Agent over a semantic metrics layer with SQL tools, result sanity checks, citations to queries and human review for decisions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Metric-layer coverage, Query validity and result checks, Answer reproducibility and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: BI dashboards with filters | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Agent over a semantic metrics layer with SQL tools, result sanity checks, citations to queries and human review for decisions | chosen | Meets the 2500 ms envelope at $13.50 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to insight) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Golden questions simpler than real.
- Evaluation trap: Judging narrative not numbers.
- Ambiguous metric names: analysis uses the wrong definition.
- Prompt injection via campaign names: agent runs unintended queries.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
