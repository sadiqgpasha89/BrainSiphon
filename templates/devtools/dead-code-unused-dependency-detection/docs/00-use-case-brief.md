# Dead Code and Unused Dependency Detection: use-case brief

> Generated from the blueprint `devtools/dead-code-unused-dependency-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dead Code and Unused Dependency Detection · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find code, feature flags and dependencies that are no longer used by combining static analysis with production usage data, and propose safe removals for owners to approve. The system has to run as a scheduled batch job, inside these limits: Removal proposals include runtime evidence over 90 days, Owners approve every removal and Reflection and plugin entry points handled.

**Why it is hard.** The obvious approach is static analysis alone, and it fails because reflection and plugins hide real use. The second trap is in "Risk": the real signal is a staged removal with rollback, while teams usually reach for deleting at once.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.7K a month. A mistake is expensive in the way vulnerable unused dependencies removed measures it.

**What success looks like.** Offline: Precision of removal proposals, Regressions after removal and Saved maintenance. Online: Lines and dependencies removed, Vulnerable unused dependencies removed and Incidents from removals. The launch is judged on "Lines and dependencies removed" while "Vulnerable unused dependencies removed" must not get worse.

## Objective, loss and constraints

**Business objective.** Find code, feature flags and dependencies that are no longer used by combining static analysis with production usage data, and propose safe removals for owners to approve.

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

- Removal proposals include runtime evidence over 90 days
- Owners approve every removal
- Reflection and plugin entry points handled
- Weekly scan of 40M lines

## The approach in one paragraph

Start with developers removing code they happen to notice, because it is the common practice. Then earn the move to a reachability analysis merged with production coverage and flag state that ranks removals by risk and saving and opens staged pull requests for owners, and only if it beats the baseline on Precision of removal proposals and Regressions after removal after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Static reachability | Whether code is reachable from entry points. Core. Guard against: from analysis. |
| Add Runtime coverage in production | Executed code over 90 days. Evidence. Guard against: from profiling. |
| Add Dependency import usage | Declared versus used packages. Dependencies. Guard against: from build tools. |
| Run it as one pipeline | Static analysis (repositories), Production coverage join (profiling data), Flag and dependency check (flag service and build tools), Removal ranking (rules), Removal pull request (code host) and Post-removal monitoring (observability), with Owner review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle rare scheduled job | Calendar-aware windows and owner checks. |

**Deliberately not doing**

- Developer name: personal data.
- File age alone: weak link.
- Comment text: weak link.

**How the approach is proven**

Prove it offline on Precision of removal proposals, Regressions after removal and Saved maintenance using time-ordered splits, then online on "Lines and dependencies removed" with "Vulnerable unused dependencies removed" as the guardrail. Watch for: Static analysis alone, Immediate deletion and Lines deleted as the goal.

## Baseline and production design

- **Baseline (build this first):** Developers removing code they happen to notice, because it is the common practice.
- **Production design:** A reachability analysis merged with production coverage and flag state that ranks removals by risk and saving and opens staged pull requests for owners.

## Why AI, and why this kind

**Why AI.** Find code, feature flags and dependencies that are no longer used by combining static analysis with production usage data, and propose safe removals for owners to approve. The evidence that separates good from bad outcomes (Static reachability, Runtime coverage in production, Dependency import usage) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "static analysis alone" are what teams reach for first, and they fail because reflection and plugins hide real use. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A reachability analysis merged with production coverage and flag state that ranks removals by risk and saving and opens staged pull requests for owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Static reachability, Runtime coverage in production, Dependency import usage and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Developers removing code they happen to notice, because it is the common practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A reachability analysis merged with production coverage and flag state that ranks removals by risk and saving and opens staged pull requests for owners | chosen | Meets the run-window envelope at $0.092 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Lines and dependencies removed) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Static analysis alone.
- Evaluation trap: Immediate deletion.
- Rare scheduled job: the code runs once a year.
- Reflection use: code is called by name.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
