# Part Master Deduplication: use-case brief

> Generated from the blueprint `manufacturing/part-master-deduplication` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Part Master Deduplication · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find duplicate and near-duplicate parts across plants and systems so purchasing and engineering consolidate part numbers and reduce cost and inventory. The system has to run as a scheduled batch job, inside these limits: Merges proposed never applied automatically, Stewards approve each cluster and Safety-relevant parts need engineering review.

**Why it is hard.** The obvious approach is description text alone, and it fails because descriptions vary wildly. The second trap is in "Cluster": the real signal is transitive consistency across a cluster, while teams usually reach for pairwise matches only.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 1 at peak, at an estimated $1.9K a month. A mistake is expensive in the way inventory reduction measures it.

**What success looks like.** Offline: Pair precision and recall on labelled sets, Cluster purity and Steward acceptance rate. Online: Parts consolidated, Inventory reduction and Purchase price variance. The launch is judged on "Parts consolidated" while "Inventory reduction" must not get worse.

## Objective, loss and constraints

**Business objective.** Find duplicate and near-duplicate parts across plants and systems so purchasing and engineering consolidate part numbers and reduce cost and inventory.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Merges proposed never applied automatically
- Stewards approve each cluster
- Safety-relevant parts need engineering review
- 5M part records

## The approach in one paragraph

Start with exact and fuzzy matching on description and manufacturer part number, because it is the common cleansing step. Then earn the move to a blocking and pairwise match model with attribute and text features, graph clustering with transitivity checks and a steward review queue with savings estimates, and only if it beats the baseline on Pair precision and recall on labelled sets and Cluster purity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Attribute match | Agreement of dimensions, material and standard. Core evidence. Guard against: normalised units. |
| Add Text embedding similarity | Semantic similarity of descriptions. Recall. Guard against: multilingual. |
| Add Supplier part cross-reference | Shared supplier part numbers. Strong evidence. Guard against: from purchasing. |
| Run it as one pipeline | Part record extraction (ERP and PLM), Normalisation (units and attributes), Blocking and pairwise match (model), Graph clustering (transitive closure), Savings estimate (cost model) and Merge execution (master data process), with Steward review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle look-alike parts | Attribute conflicts block merges. |

**Deliberately not doing**

- Part creator: irrelevant.
- Creation date: weak link.
- Plant code: an identifier.

**How the approach is proven**

Prove it offline on Pair precision and recall on labelled sets, Cluster purity and Steward acceptance rate using time-ordered splits, then online on "Parts consolidated" with "Inventory reduction" as the guardrail. Watch for: Description-only matching, No transitivity check and Automatic merges.

## Baseline and production design

- **Baseline (build this first):** Exact and fuzzy matching on description and manufacturer part number, because it is the common cleansing step.
- **Production design:** A blocking and pairwise match model with attribute and text features, graph clustering with transitivity checks and a steward review queue with savings estimates.

## Why AI, and why this kind

**Why AI.** Find duplicate and near-duplicate parts across plants and systems so purchasing and engineering consolidate part numbers and reduce cost and inventory. The evidence that separates good from bad outcomes (Attribute match, Text embedding similarity, Supplier part cross-reference) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "description text alone" are what teams reach for first, and they fail because descriptions vary wildly. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A blocking and pairwise match model with attribute and text features, graph clustering with transitivity checks and a steward review queue with savings estimates.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Attribute match, Text embedding similarity, Supplier part cross-reference and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Exact and fuzzy matching on description and manufacturer part number, because it is the common cleansing step | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A blocking and pairwise match model with attribute and text features, graph clustering with transitivity checks and a steward review queue with savings estimates | chosen | Meets the run-window envelope at $1.03 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Parts consolidated) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Description-only matching.
- Evaluation trap: No transitivity check.
- Look-alike parts: similar but different specifications.
- Multilingual descriptions: text similarity fails.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
