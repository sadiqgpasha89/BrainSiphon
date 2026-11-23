# API Breaking Change Detection: use-case brief

> Generated from the blueprint `devtools/api-breaking-change-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** API Breaking Change Detection · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect changes in API schemas and behaviour that would break consumers and warn authors in the pull request with the list of affected clients. The system has to run as a scheduled batch job, inside these limits: Breaking changes flagged in the pull request, Affected consumers listed from traces and registries and Owners decide on exceptions.

**Why it is hard.** The obvious approach is textual diffs, and it fails because text diffs miss semantic breaks. The second trap is in "Impact": the real signal is real consumers from traffic, while teams usually reach for all possible clients.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way consumer incidents measures it.

**What success looks like.** Offline: Detection of seeded breaking changes, Consumer discovery recall and False warnings. Online: Breaking changes reaching production, Consumer incidents and Review time on API changes. The launch is judged on "Breaking changes reaching production" while "Consumer incidents" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect changes in API schemas and behaviour that would break consumers and warn authors in the pull request with the list of affected clients.

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

- Breaking changes flagged in the pull request
- Affected consumers listed from traces and registries
- Owners decide on exceptions
- Check within 3 minutes
- 20K APIs

## The approach in one paragraph

Start with manual review of API changes and versioning rules, because it is the standard governance. Then earn the move to a schema compatibility checker combined with traffic-based consumer discovery and contract tests that comments on the pull request with impact, and only if it beats the baseline on Detection of seeded breaking changes and Consumer discovery recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Schema diff classification | Removed, renamed or type-changed fields. Core. Guard against: from schema tools. |
| Add Consumer usage | Clients calling the changed field. Impact. Guard against: from traces. |
| Add Version and deprecation state | Planned deprecation. Context. Guard against: from the registry. |
| Run it as one pipeline | Schema extraction (pull request), Diff classification (compatibility rules), Consumer lookup (tracing and registry), Contract tests (CI), Impact comment (code host), Exception workflow (API owners) and Release tracking (API registry). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle behavioural change | Contract tests and example checks. |

**Deliberately not doing**

- Author name: personal data.
- Branch name: an artefact.
- File path: weak link.

**How the approach is proven**

Prove it offline on Detection of seeded breaking changes, Consumer discovery recall and False warnings using time-ordered splits, then online on "Breaking changes reaching production" with "Consumer incidents" as the guardrail. Watch for: Textual diffs only, Ignoring real consumers and Gates with no exception path.

## Baseline and production design

- **Baseline (build this first):** Manual review of API changes and versioning rules, because it is the standard governance.
- **Production design:** A schema compatibility checker combined with traffic-based consumer discovery and contract tests that comments on the pull request with impact.

## Why AI, and why this kind

**Why AI.** Detect changes in API schemas and behaviour that would break consumers and warn authors in the pull request with the list of affected clients. The evidence that separates good from bad outcomes (Schema diff classification, Consumer usage, Version and deprecation state) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "textual diffs" are what teams reach for first, and they fail because text diffs miss semantic breaks. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A schema compatibility checker combined with traffic-based consumer discovery and contract tests that comments on the pull request with impact.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Schema diff classification, Consumer usage, Version and deprecation state and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual review of API changes and versioning rules, because it is the standard governance | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A schema compatibility checker combined with traffic-based consumer discovery and contract tests that comments on the pull request with impact | chosen | Meets the run-window envelope at $0.182 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Breaking changes reaching production) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Textual diffs only.
- Evaluation trap: Ignoring real consumers.
- Behavioural change: the schema is unchanged but behaviour differs.
- Unknown consumers: external clients exist.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
