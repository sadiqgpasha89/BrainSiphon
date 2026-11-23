# Duplicate and Near-Duplicate Code Detection: use-case brief

> Generated from the blueprint `devtools/duplicate-code-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Duplicate and Near-Duplicate Code Detection · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find duplicated and near-duplicated logic across repositories and suggest shared libraries or removal, so bugs are fixed once and code size falls. The system has to run as a scheduled batch job, inside these limits: Clusters shown with the files and differences, Owners decide whether to merge and Generated code and licences excluded.

**Why it is hard.** The obvious approach is text equality only, and it fails because renamed code hides duplicates. The second trap is in "Value": the real signal is duplicates that change together, while teams usually reach for any duplicate.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way bugs fixed in many places measures it.

**What success looks like.** Offline: Precision of clone clusters, Recall on seeded clones and Proposal acceptance. Online: Lines removed, Bugs fixed in many places and Time to fix shared logic. The launch is judged on "Lines removed" while "Bugs fixed in many places" must not get worse.

## Objective, loss and constraints

**Business objective.** Find duplicated and near-duplicated logic across repositories and suggest shared libraries or removal, so bugs are fixed once and code size falls.

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

- Clusters shown with the files and differences
- Owners decide whether to merge
- Generated code and licences excluded
- Weekly scan of 50M lines

## The approach in one paragraph

Start with copy-paste detectors in static analysis, because teams use them already. Then earn the move to a clone detector with embeddings and co-change evidence that clusters duplicates, estimates the saving and creates refactoring proposals for owners, and only if it beats the baseline on Precision of clone clusters and Recall on seeded clones after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Token and syntax tree similarity | Structural similarity. Clone detection. Guard against: from parsers. |
| Add Embedding similarity | Semantic similarity. Recall. Guard against: from a code model. |
| Add Co-change history | Files that change together. Value. Guard against: from version control. |
| Run it as one pipeline | Code indexing (repositories), Similarity detection (parsers and embeddings), Clustering (graph clustering), Co-change check (version history), Proposal draft (LLM) and Outcome tracking (quarterly), with Owner review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle generated code | Path exclusions. |

**Deliberately not doing**

- Developer name: personal data.
- Comment text: weak link.
- Formatting: an artefact.

**How the approach is proven**

Prove it offline on Precision of clone clusters, Recall on seeded clones and Proposal acceptance using time-ordered splits, then online on "Lines removed" with "Bugs fixed in many places" as the guardrail. Watch for: Text-equality detectors, Treating all duplicates as bad and Pair lists with no clusters.

## Baseline and production design

- **Baseline (build this first):** Copy-paste detectors in static analysis, because teams use them already.
- **Production design:** A clone detector with embeddings and co-change evidence that clusters duplicates, estimates the saving and creates refactoring proposals for owners.

## Why AI, and why this kind

**Why AI.** Find duplicated and near-duplicated logic across repositories and suggest shared libraries or removal, so bugs are fixed once and code size falls. The evidence that separates good from bad outcomes (Token and syntax tree similarity, Embedding similarity, Co-change history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "text equality only" are what teams reach for first, and they fail because renamed code hides duplicates. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A clone detector with embeddings and co-change evidence that clusters duplicates, estimates the saving and creates refactoring proposals for owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Token and syntax tree similarity, Embedding similarity, Co-change history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Copy-paste detectors in static analysis, because teams use them already | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A clone detector with embeddings and co-change evidence that clusters duplicates, estimates the saving and creates refactoring proposals for owners | chosen | Meets the run-window envelope at $0.208 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Lines removed) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Text-equality detectors.
- Evaluation trap: Treating all duplicates as bad.
- Generated code: duplicates are generated.
- Licensed code: a file is from a third party.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
