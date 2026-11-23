# Feature Flag Risk and Cleanup: use-case brief

> Generated from the blueprint `devtools/feature-flag-risk-cleanup` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Feature Flag Risk and Cleanup · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find stale flags, risky flag combinations and flags that block deployments, and propose safe cleanup so code paths do not pile up. The system has to run as a scheduled batch job, inside these limits: Cleanup proposals include code locations, Owners approve removal and Flag combinations tested for conflicts.

**Why it is hard.** The obvious approach is flag age alone, and it fails because old flags may still matter. The second trap is in "Risk": the real signal is interacting flags in the same code path, while teams usually reach for single flag checks.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way incidents from flags measures it.

**What success looks like.** Offline: Precision of stale flag proposals, Regression rate after removal and Interaction detection. Online: Stale flags removed, Incidents from flags and Code paths removed. The launch is judged on "Stale flags removed" while "Incidents from flags" must not get worse.

## Objective, loss and constraints

**Business objective.** Find stale flags, risky flag combinations and flags that block deployments, and propose safe cleanup so code paths do not pile up.

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

- Cleanup proposals include code locations
- Owners approve removal
- Flag combinations tested for conflicts
- Weekly scan of 100K flags

## The approach in one paragraph

Start with periodic flag audits by teams, because it is the usual practice. Then earn the move to a flag analyser using evaluation data and code references to find stale flags and interaction risks and open removal pull requests for owners, and only if it beats the baseline on Precision of stale flag proposals and Regression rate after removal after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Flag evaluation variance | Whether all users get the same result. Staleness. Guard against: from the flag service. |
| Add Code references | Places that read the flag. Impact. Guard against: from code search. |
| Add Age and owner activity | Time since changes. Priority. Guard against: from the flag service. |
| Run it as one pipeline | Flag evaluation data (flag service), Code reference search (code index), Stale flag detection (rules), Interaction analysis (graph analysis), Removal pull request (code host) and Cleanup tracking (dashboard), with Owner review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle kill-switch flags | Flag type allow-list. |

**Deliberately not doing**

- Developer name: personal data.
- Flag description wording: weak link.
- Environment name: an artefact.

**How the approach is proven**

Prove it offline on Precision of stale flag proposals, Regression rate after removal and Interaction detection using time-ordered splits, then online on "Stale flags removed" with "Incidents from flags" as the guardrail. Watch for: Age-only cleanup, Single-flag checks and Immediate deletion.

## Baseline and production design

- **Baseline (build this first):** Periodic flag audits by teams, because it is the usual practice.
- **Production design:** A flag analyser using evaluation data and code references to find stale flags and interaction risks and open removal pull requests for owners.

## Why AI, and why this kind

**Why AI.** Find stale flags, risky flag combinations and flags that block deployments, and propose safe cleanup so code paths do not pile up. The evidence that separates good from bad outcomes (Flag evaluation variance, Code references, Age and owner activity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "flag age alone" are what teams reach for first, and they fail because old flags may still matter. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A flag analyser using evaluation data and code references to find stale flags and interaction risks and open removal pull requests for owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Flag evaluation variance, Code references, Age and owner activity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Periodic flag audits by teams, because it is the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A flag analyser using evaluation data and code references to find stale flags and interaction risks and open removal pull requests for owners | chosen | Meets the run-window envelope at $0.182 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Stale flags removed) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Age-only cleanup.
- Evaluation trap: Single-flag checks.
- Kill-switch flags: flags are meant to stay.
- Per-customer flags: evaluation varies by customer.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
