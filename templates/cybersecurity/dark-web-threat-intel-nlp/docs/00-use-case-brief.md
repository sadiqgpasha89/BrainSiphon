# Dark-Web & Underground Threat Intelligence: use-case brief

> Generated from the blueprint `cybersecurity/dark-web-threat-intel-nlp` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dark-Web & Underground Threat Intelligence · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Mine forums, marketplaces and chat channels for credential leaks, access sales and planned attacks relevant to the organisation. The system has to run as a scheduled batch job, inside these limits: Legal and ethical collection, Multilingual slang and Source reliability.

**Why it is hard.** The obvious approach is keyword alerts on brand name, and it fails because brand keywords produce huge noise. The second trap is in "Reliability": the real signal is source and actor credibility scoring, while teams usually reach for equal trust in all posts.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.9K a month. A mistake is expensive in the way false incident escalations measures it.

**What success looks like.** Offline: Entity extraction F1 and Precision of high-priority alerts. Online: Time from leak post to action and False incident escalations. The launch is judged on "Time from leak post to action" while "False incident escalations" must not get worse.

## Objective, loss and constraints

**Business objective.** Mine forums, marketplaces and chat channels for credential leaks, access sales and planned attacks relevant to the organisation.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{NER}}+\lambda\,\mathrm{CE}_{\text{relevance}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{NER}} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |

**Hard constraints**

- Legal and ethical collection
- Multilingual slang
- Source reliability
- Rapid takedown of sources

## The approach in one paragraph

Start with keyword monitoring services. Then earn the move to multilingual slang-aware NER with relevance ranking, actor-reputation graph and leak validation against internal records, and only if it beats the baseline on Entity extraction F1 and Precision of high-priority alerts after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Entity match with confidence | Company, domain and employee matches. Relevance. Guard against: entity linking. |
| Add Actor reputation | Past verified claims. Credibility. Guard against: actor graph. |
| Add Leak freshness and uniqueness | Novelty vs known dumps. Value. Guard against: dedup. |
| Run it as one pipeline | Collection (legal crawlers and feeds), Language detection and translation (NLP), Entity extraction and linking (transformer), Relevance and credibility scorer (GBDT), Leak validator (internal hash check) and Takedown actions (response), with CTI analyst off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle slang and code words evolve | Continual lexicon updates and active learning. |

**Deliberately not doing**

- Post length: weak.
- Forum popularity: weak.

**How the approach is proven**

Prove it offline on Entity extraction F1 and Precision of high-priority alerts using time-ordered splits, then online on "Time from leak post to action" with "False incident escalations" as the guardrail. Watch for: Gold data from sanitised English posts and Ignoring deceptive posts.

## Baseline and production design

- **Baseline (build this first):** Keyword monitoring services.
- **Production design:** Multilingual slang-aware NER with relevance ranking, actor-reputation graph and leak validation against internal records.

## Why AI, and why this kind

**Why AI.** Mine forums, marketplaces and chat channels for credential leaks, access sales and planned attacks relevant to the organisation. The evidence that separates good from bad outcomes (Entity match with confidence, Actor reputation, Leak freshness and uniqueness) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "keyword alerts on brand name" are what teams reach for first, and they fail because brand keywords produce huge noise. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Multilingual slang-aware NER with relevance ranking, actor-reputation graph and leak validation against internal records.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Entity match with confidence, Actor reputation, Leak freshness and uniqueness and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword monitoring services | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multilingual slang-aware NER with relevance ranking, actor-reputation graph and leak validation against internal records | chosen | Meets the run-window envelope at $2.07 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time from leak post to action) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Gold data from sanitised English posts.
- Evaluation trap: Ignoring deceptive posts.
- Slang and code words evolve: entity extraction misses.
- Fake leaks to extort: wasted incident response.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
