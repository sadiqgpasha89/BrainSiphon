# Regulatory Reporting RAG Copilot: use-case brief

> Generated from the blueprint `fintech/regulatory-reporting-rag-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Regulatory Reporting RAG Copilot · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Answer compliance questions and pre-fill regulatory reports from rule books and internal data with exact citations. The system has to run interactively, within a few seconds, inside these limits: Every answer cites the rule paragraph, Version-aware (effective dates) and Private deployment.

**Why it is hard.** The obvious approach is latest-version only, and it fails because reports are filed under the rule version in force at period end. The second trap is in "Structure": the real signal is hierarchical chunking by article, paragraph and definition, while teams usually reach for fixed-size chunks.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $33.2K a month. A mistake is expensive in the way reviewer edit rate measures it.

**What success looks like.** Offline: Clause recall at k and Answer support rate. Online: Time to prepare report and Reviewer edit rate. The launch is judged on "Time to prepare report" while "Reviewer edit rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Answer compliance questions and pre-fill regulatory reports from rule books and internal data with exact citations.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{retrieved})+\lambda\,\mathrm{CitationError}`

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
| \text{retrieved} | The regulatory passages retrieved for the question. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{CitationError} | Penalty for citing a passage that does not support the sentence. |

**Hard constraints**

- Every answer cites the rule paragraph
- Version-aware (effective dates)
- Private deployment
- Reviewer sign-off

## The approach in one paragraph

Start with keyword search over rule PDFs. Then earn the move to hybrid retrieval over a versioned legal knowledge graph, reasoning LLM with citation verifier and numeric tool for report fields, and only if it beats the baseline on Clause recall at k and Answer support rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Clause-level retrieval recall | Share of ground-truth clauses retrieved in top 10. Retrieval bounds answer quality. Guard against: evaluate with expert-labelled clauses. |
| Add Effective-date match | Rule version vs report period. Prevents wrong-law answers. Guard against: date from filing period not today. |
| Add Definition linking | Expanded defined terms inside the answer context. Correct interpretation. Guard against: link to the defining paragraph. |
| Run it as one pipeline | Rulebook ingestion (structured parser), Versioned index (hybrid search), Retriever and reranker (cross-encoder), Reasoning LLM (private model), Citation verifier (entailment check) and Answer log (audit), with Compliance officer review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle amended regulation published today | Hot-reload pipeline with change-alert and re-index SLA. |

**Deliberately not doing**

- Generic web regulatory commentary: out-of-scope, unauthoritative.
- Model's parametric memory of regulations: stale and ungrounded.

**How the approach is proven**

Prove it offline on Clause recall at k and Answer support rate using time-ordered splits, then online on "Time to prepare report" with "Reviewer edit rate" as the guardrail. Watch for: Test questions copied from document headings and Counting plausible answers without clause verification.

## Baseline and production design

- **Baseline (build this first):** Keyword search over rule PDFs.
- **Production design:** Hybrid retrieval over a versioned legal knowledge graph, reasoning LLM with citation verifier and numeric tool for report fields.

## Why AI, and why this kind

**Why AI.** Answer compliance questions and pre-fill regulatory reports from rule books and internal data with exact citations. The evidence that separates good from bad outcomes (Clause-level retrieval recall, Effective-date match, Definition linking) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "latest-version only" are what teams reach for first, and they fail because reports are filed under the rule version in force at period end. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Hybrid retrieval over a versioned legal knowledge graph, reasoning LLM with citation verifier and numeric tool for report fields.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Clause-level retrieval recall, Effective-date match, Definition linking and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword search over rule PDFs | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hybrid retrieval over a versioned legal knowledge graph, reasoning LLM with citation verifier and numeric tool for report fields | chosen | Meets the 2500 ms envelope at $7.37 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to prepare report) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test questions copied from document headings.
- Evaluation trap: Counting plausible answers without clause verification.
- Amended regulation published today: answer cites superseded rule.
- Ambiguous question spanning jurisdictions: model blends rules.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
