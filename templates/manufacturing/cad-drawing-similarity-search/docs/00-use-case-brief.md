# CAD and Drawing Similarity Search: use-case brief

> Generated from the blueprint `manufacturing/cad-drawing-similarity-search` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** CAD and Drawing Similarity Search · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find similar existing parts and drawings from a new sketch, model or description so engineers reuse designs and avoid creating duplicates. The system has to run interactively, within a few seconds, inside these limits: Search within 3 s over 5M drawings, Access control follows the PLM permissions and Results show the similarity reason.

**Why it is hard.** The obvious approach is shape alone, and it fails because shape matches with different material or tolerance are not reuse. The second trap is in "Access": the real signal is permission checks at query time, while teams usually reach for index-time filtering only.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $14.5K a month. A mistake is expensive in the way new part numbers avoided measures it.

**What success looks like.** Offline: Recall at ten on judged reuse cases, Constraint match precision and Latency at p95. Online: Part reuse rate, New part numbers avoided and Time to find a design. The launch is judged on "Part reuse rate" while "New part numbers avoided" must not get worse.

## Objective, loss and constraints

**Business objective.** Find similar existing parts and drawings from a new sketch, model or description so engineers reuse designs and avoid creating duplicates.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{RankLoss} | Ranking loss: penalises placing a less relevant item above a more relevant one. |

**Hard constraints**

- Search within 3 s over 5M drawings
- Access control follows the PLM permissions
- Results show the similarity reason
- No export of restricted designs

## The approach in one paragraph

Start with text search on part numbers and descriptions in the PLM, because engineers use it today. Then earn the move to a multimodal embedding index over shape, drawing text and attributes with a re-ranker on manufacturing constraints, permission-aware retrieval and an explanation of the match, and only if it beats the baseline on Recall at ten on judged reuse cases and Constraint match precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Shape embedding similarity | Embedding of the 3D shape or drawing. Candidate retrieval. Guard against: normalise scale. |
| Add Material and process match | Same material and manufacturing process. Reuse feasibility. Guard against: from attributes. |
| Add Tolerance and standard compatibility | Tolerance class and standard. Fit. Guard against: from drawings. |
| Run it as one pipeline | Query intake (PLM and CAD plugin), Shape and text embedding (encoder), Candidate retrieval (vector index), Constraint re-ranking (gradient boosting), Permission filter (PLM access service) and Result display (CAD plugin), with Reuse feedback off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle poor sketch | Ask for attributes and show nearest examples. |

**Deliberately not doing**

- Drawing file name: an artefact.
- Author name: irrelevant.
- File size: an artefact.

**How the approach is proven**

Prove it offline on Recall at ten on judged reuse cases, Constraint match precision and Latency at p95 using time-ordered splits, then online on "Part reuse rate" with "New part numbers avoided" as the guardrail. Watch for: Shape-only matching, Index-time permissions and Using clicks as relevance.

## Baseline and production design

- **Baseline (build this first):** Text search on part numbers and descriptions in the PLM, because engineers use it today.
- **Production design:** A multimodal embedding index over shape, drawing text and attributes with a re-ranker on manufacturing constraints, permission-aware retrieval and an explanation of the match.

## Why AI, and why this kind

**Why AI.** Find similar existing parts and drawings from a new sketch, model or description so engineers reuse designs and avoid creating duplicates. The evidence that separates good from bad outcomes (Shape embedding similarity, Material and process match, Tolerance and standard compatibility) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "shape alone" are what teams reach for first, and they fail because shape matches with different material or tolerance are not reuse. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A multimodal embedding index over shape, drawing text and attributes with a re-ranker on manufacturing constraints, permission-aware retrieval and an explanation of the match.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Shape embedding similarity, Material and process match, Tolerance and standard compatibility and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Text search on part numbers and descriptions in the PLM, because engineers use it today | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A multimodal embedding index over shape, drawing text and attributes with a re-ranker on manufacturing constraints, permission-aware retrieval and an explanation of the match | chosen | Meets the 2500 ms envelope at $0.538 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Part reuse rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Shape-only matching.
- Evaluation trap: Index-time permissions.
- Poor sketch: the query is ambiguous.
- Restricted design: the user lacks access.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
