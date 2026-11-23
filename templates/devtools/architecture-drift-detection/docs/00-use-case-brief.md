# Architecture Drift Detection: use-case brief

> Generated from the blueprint `devtools/architecture-drift-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Architecture Drift Detection · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Compare the real dependencies in code and runtime traces with the intended architecture rules and report violations so architects can fix drift before it hardens. The system has to run as a scheduled batch job, inside these limits: Rules written as checks in CI, Violations linked to code and owners and Architects approve exceptions.

**Why it is hard.** The obvious approach is diagrams only, and it fails because diagrams drift. The second trap is in "Evidence": the real signal is static and runtime dependencies, while teams usually reach for one source.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way new violations per month measures it.

**What success looks like.** Offline: Violation precision, Recall on seeded violations and Time to fix. Online: Open violations, New violations per month and Architecture review effort. The launch is judged on "Open violations" while "New violations per month" must not get worse.

## Objective, loss and constraints

**Business objective.** Compare the real dependencies in code and runtime traces with the intended architecture rules and report violations so architects can fix drift before it hardens.

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

- Rules written as checks in CI
- Violations linked to code and owners
- Architects approve exceptions
- Daily scan of 3K services

## The approach in one paragraph

Start with architecture review boards and diagrams, because they are the current governance. Then earn the move to a graph-based checker that merges static and runtime dependencies, evaluates rules as code in CI and reports violations with owners and expiring exceptions, and only if it beats the baseline on Violation precision and Recall on seeded violations after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Static dependency graph | Imports and calls. Structure. Guard against: from code analysis. |
| Add Runtime call graph | Calls seen in traces. Reality. Guard against: from tracing. |
| Add Rule violations | Edges that break rules. Drift. Guard against: from the checker. |
| Run it as one pipeline | Code and trace ingestion (repositories and tracing), Dependency graph build (graph store), Rule evaluation (architecture rules), Exception workflow (architecture board), Owner tickets (issue tracker) and Trend tracking (monthly), with Violation report off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle dynamic calls | Runtime trace merge. |

**Deliberately not doing**

- Developer name: personal data.
- Diagram style: an artefact.
- Module name wording: weak link.

**How the approach is proven**

Prove it offline on Violation precision, Recall on seeded violations and Time to fix using time-ordered splits, then online on "Open violations" with "New violations per month" as the guardrail. Watch for: Diagram-only governance, One dependency source and Permanent waivers.

## Baseline and production design

- **Baseline (build this first):** Architecture review boards and diagrams, because they are the current governance.
- **Production design:** A graph-based checker that merges static and runtime dependencies, evaluates rules as code in CI and reports violations with owners and expiring exceptions.

## Why AI, and why this kind

**Why AI.** Compare the real dependencies in code and runtime traces with the intended architecture rules and report violations so architects can fix drift before it hardens. The evidence that separates good from bad outcomes (Static dependency graph, Runtime call graph, Rule violations) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "diagrams only" are what teams reach for first, and they fail because diagrams drift. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A graph-based checker that merges static and runtime dependencies, evaluates rules as code in CI and reports violations with owners and expiring exceptions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Static dependency graph, Runtime call graph, Rule violations and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Architecture review boards and diagrams, because they are the current governance | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A graph-based checker that merges static and runtime dependencies, evaluates rules as code in CI and reports violations with owners and expiring exceptions | chosen | Meets the run-window envelope at $0.182 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Open violations) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Diagram-only governance.
- Evaluation trap: One dependency source.
- Dynamic calls: static analysis misses links.
- Legitimate exception: a rule needs a workaround.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
