# RAG Quality Monitoring in Production: use-case brief

> Generated from the blueprint `saas/rag-quality-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** RAG Quality Monitoring in Production · **Domain:** saas · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Monitor retrieval relevance, groundedness and user outcomes of RAG apps in production, spotting content gaps and regressions. The system has to run as a scheduled batch job, inside these limits: Online sampling cost, Privacy of queries and Per-tenant indexes.

**Why it is hard.** The obvious approach is end-to-end score only, and it fails because fixes differ: retrieval vs prompt vs content. The second trap is in "Gaps": the real signal is detect missing-content queries, while teams usually reach for treat all failures as model errors.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way content gaps closed measures it.

**What success looks like.** Offline: Judge-human agreement and Diagnosis accuracy on labelled failures. Online: Resolution rate and Content gaps closed. The launch is judged on "Resolution rate" while "Content gaps closed" must not get worse.

## Objective, loss and constraints

**Business objective.** Monitor retrieval relevance, groundedness and user outcomes of RAG apps in production, spotting content gaps and regressions.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{grounded},p)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{grounded} | The label: 1 if the answer is supported by the retrieved sources. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |

**Hard constraints**

- Online sampling cost
- Privacy of queries
- Per-tenant indexes
- Actionable diagnostics

## The approach in one paragraph

Start with thumbs-up and thumbs-down ratings. Then earn the move to sampled online evaluation with retrieval/generation diagnosis, groundedness checks and content-gap reports to doc owners, and only if it beats the baseline on Judge-human agreement and Diagnosis accuracy on labelled failures after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Retrieval hit rate on judged queries | Gold passage in top-k. Retrieval health. Guard against: labels. |
| Add Groundedness rate | Answers supported by retrieved text. Hallucination. Guard against: nLI. |
| Add Unanswerable-query rate | Queries with no relevant doc. Content gap. Guard against: classifier. |
| Run it as one pipeline | Traces (logging), Sampler (stratified), Retrieval judge (LLM), Groundedness judge (NLI), Gap analyser (clustering) and Fix tracking (tickets), with Owner report off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle index update lags | Index freshness SLOs and freshness checks in monitoring. |

**Deliberately not doing**

- Answer length: weak.
- Latency alone: not quality.

**How the approach is proven**

Prove it offline on Judge-human agreement and Diagnosis accuracy on labelled failures using time-ordered splits, then online on "Resolution rate" with "Content gaps closed" as the guardrail. Watch for: Ratings used as quality and Not separating retrieval from generation.

## Baseline and production design

- **Baseline (build this first):** Thumbs-up and thumbs-down ratings.
- **Production design:** Sampled online evaluation with retrieval/generation diagnosis, groundedness checks and content-gap reports to doc owners.

## Why AI, and why this kind

**Why AI.** Monitor retrieval relevance, groundedness and user outcomes of RAG apps in production, spotting content gaps and regressions. The evidence that separates good from bad outcomes (Retrieval hit rate on judged queries, Groundedness rate, Unanswerable-query rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "end-to-end score only" are what teams reach for first, and they fail because fixes differ: retrieval vs prompt vs content. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Sampled online evaluation with retrieval/generation diagnosis, groundedness checks and content-gap reports to doc owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Retrieval hit rate on judged queries, Groundedness rate, Unanswerable-query rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Thumbs-up and thumbs-down ratings | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Sampled online evaluation with retrieval/generation diagnosis, groundedness checks and content-gap reports to doc owners | chosen | Meets the run-window envelope at $0.210 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Resolution rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Ratings used as quality.
- Evaluation trap: Not separating retrieval from generation.
- Index update lags: the retrieval index lags behind content changes, so answers are stale.
- Sensitive queries in logs: user queries stored in logs contain sensitive data and create privacy issues.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
