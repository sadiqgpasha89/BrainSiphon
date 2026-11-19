# Enterprise Search Relevance: use-case brief

> Generated from the blueprint `saas/enterprise-search-relevance` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Enterprise Search Relevance · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Return the right documents and answers across connected apps (drive, chat, wiki, tickets) respecting each user's permissions. The system has to run in under 100 milliseconds, inside these limits: Permission-aware retrieval, Heterogeneous sources and Freshness within minutes.

**Why it is hard.** The obvious approach is post-filtering results, and it fails because post-filtering leaks existence and wastes top-k slots. The second trap is in "Signals": the real signal is behavioural click and share signals per tenant, while teams usually reach for global popularity.

**Scale and stakes.** At 10 million users this is about 15.0M model-touching events a day, 174 requests per second on average and 1.0K at peak, at an estimated $13.0K a month. A mistake is expensive in the way time to find measures it.

**What success looks like.** Offline: NDCG on tenant query logs and judgments and Permission-leak rate. Online: Search success rate and Time to find. The launch is judged on "Search success rate" while "Time to find" must not get worse.

## Objective, loss and constraints

**Business objective.** Return the right documents and answers across connected apps (drive, chat, wiki, tickets) respecting each user's permissions.

**Training objective.** `\mathcal{L}=\mathrm{ListNet}(s,y)+\lambda\,\mathrm{InfoNCE}(q,d^+)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{ListNet} | ListNet loss: trains a model to reproduce the whole ranked list by matching probability distributions over rankings. |
| s | The model's relevance scores for the candidate documents. |
| y | The relevance labels. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{InfoNCE} | Contrastive loss that pulls queries towards their relevant documents. |
| q | The search query. |
| d^+ | A document: d+ is a relevant document for query q. |

**Hard constraints**

- Permission-aware retrieval
- Heterogeneous sources
- Freshness within minutes
- Tenant isolation

## The approach in one paragraph

Start with keyword search per connector. Then earn the move to aCL-aware hybrid retrieval with learning-to-rank on tenant-specific implicit feedback and freshness-aware indexing, and only if it beats the baseline on NDCG on tenant query logs and judgments and Permission-leak rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Hybrid lexical-semantic score | BM25 plus dense similarity. Relevance. Guard against: fusion. |
| Add Document freshness and activity | Recent edits and views. Currency. Guard against: metadata. |
| Add Personal and team affinity | User's team's interactions. Personalisation. Guard against: privacy. |
| Run it as one pipeline | Query (search API), Query understanding (intent and entities), ACL-aware hybrid retrieval (vector plus BM25), Learning-to-rank (LambdaMART), Result assembly (snippets) and UI (app), with Click feedback off the critical path. |
| Optimise the right thing | The objective weighs listNet loss: trains a model to reproduce the whole ranked list by matching probability distributions over rankings, so the model is trained on the cost of the decision and not on a generic score. |
| Handle permission change not yet propagated | Fast ACL sync and result-time permission checks. |

**Deliberately not doing**

- Document length: weak.
- File type alone: weak.

**How the approach is proven**

Prove it offline on NDCG on tenant query logs and judgments and Permission-leak rate using time-ordered splits, then online on "Search success rate" with "Time to find" as the guardrail. Watch for: Training on click logs with position bias and Ignoring permission checks in evaluation.

## Baseline and production design

- **Baseline (build this first):** Keyword search per connector.
- **Production design:** ACL-aware hybrid retrieval with learning-to-rank on tenant-specific implicit feedback and freshness-aware indexing.

## Why AI, and why this kind

**Why AI.** Return the right documents and answers across connected apps (drive, chat, wiki, tickets) respecting each user's permissions. The evidence that separates good from bad outcomes (Hybrid lexical-semantic score, Document freshness and activity, Personal and team affinity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "post-filtering results" are what teams reach for first, and they fail because post-filtering leaks existence and wastes top-k slots. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: ACL-aware hybrid retrieval with learning-to-rank on tenant-specific implicit feedback and freshness-aware indexing.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Hybrid lexical-semantic score, Document freshness and activity, Personal and team affinity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword search per connector | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| ACL-aware hybrid retrieval with learning-to-rank on tenant-specific implicit feedback and freshness-aware indexing | chosen | Meets the 80 ms envelope at $0.029 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Search success rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on click logs with position bias.
- Evaluation trap: Ignoring permission checks in evaluation.
- Permission change not yet propagated: user sees documents they should not.
- New connector floods low-quality content: relevance drops.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
