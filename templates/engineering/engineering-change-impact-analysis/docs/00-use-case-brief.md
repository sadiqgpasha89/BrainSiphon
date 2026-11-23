# Engineering Change Impact Analysis: use-case brief

> Generated from the blueprint `engineering/engineering-change-impact-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Engineering Change Impact Analysis · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate which drawings, parts, tests, suppliers and schedules a proposed change affects so change boards decide with the full impact. The system has to run interactively, within a few seconds, inside these limits: Impacted items shown with the path from the change, Change board decides and Cost and schedule effect shown as ranges.

**Why it is hard.** The obvious approach is text search, and it fails because text misses indirect links. The second trap is in "Output": the real signal is impact list with confidence, while teams usually reach for a single number.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $12.3K a month. A mistake is expensive in the way change cycle time measures it.

**What success looks like.** Offline: Impact recall against past changes, Cost estimate error and Owner accuracy. Online: Late discovered impacts, Change cycle time and Rework from changes. The launch is judged on "Late discovered impacts" while "Change cycle time" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate which drawings, parts, tests, suppliers and schedules a proposed change affects so change boards decide with the full impact.

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

- Impacted items shown with the path from the change
- Change board decides
- Cost and schedule effect shown as ranges
- Analysis within 2 minutes
- 1M linked items

## The approach in one paragraph

Start with engineers tracing impact by hand with part lists and email, because it is the usual practice. Then earn the move to a graph-based analysis that walks dependencies from the change, estimates cost and schedule ranges and lists items and owners for the change board, and only if it beats the baseline on Impact recall against past changes and Cost estimate error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Item dependency graph | Parts, drawings and tests linked. Core. Guard against: from the PLM. |
| Add Change type and size | Scope of the change. Scale. Guard against: from the request. |
| Add Supplier and lead time data | Procurement impact. Impact. Guard against: from procurement. |
| Run it as one pipeline | Change request (PLM), Dependency traversal (graph database), Text link suggestion (NLP), Cost and schedule estimate (models) and Board decision (change board), with Impact report and Outcome feedback off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing links | Flag unlinked items. |

**Deliberately not doing**

- Requester name: personal data.
- Change number: an identifier.
- Document template: an artefact.

**How the approach is proven**

Prove it offline on Impact recall against past changes, Cost estimate error and Owner accuracy using time-ordered splits, then online on "Late discovered impacts" with "Change cycle time" as the guardrail. Watch for: Text-only impact, Single number impact and Automatic approval.

## Baseline and production design

- **Baseline (build this first):** Engineers tracing impact by hand with part lists and email, because it is the usual practice.
- **Production design:** A graph-based analysis that walks dependencies from the change, estimates cost and schedule ranges and lists items and owners for the change board.

## Why AI, and why this kind

**Why AI.** Estimate which drawings, parts, tests, suppliers and schedules a proposed change affects so change boards decide with the full impact. The evidence that separates good from bad outcomes (Item dependency graph, Change type and size, Supplier and lead time data) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "text search" are what teams reach for first, and they fail because text misses indirect links. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A graph-based analysis that walks dependencies from the change, estimates cost and schedule ranges and lists items and owners for the change board.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Item dependency graph, Change type and size, Supplier and lead time data and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Engineers tracing impact by hand with part lists and email, because it is the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A graph-based analysis that walks dependencies from the change, estimates cost and schedule ranges and lists items and owners for the change board | chosen | Meets the 2500 ms envelope at $0.273 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Late discovered impacts) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Text-only impact.
- Evaluation trap: Single number impact.
- Missing links: the structure is incomplete.
- Cascading change: changes trigger further changes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
