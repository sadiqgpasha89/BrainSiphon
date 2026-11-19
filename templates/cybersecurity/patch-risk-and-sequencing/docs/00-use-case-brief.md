# Patch Risk Prediction & Sequencing: use-case brief

> Generated from the blueprint `cybersecurity/patch-risk-and-sequencing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patch Risk Prediction & Sequencing · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which patches will cause outages and schedule rollouts in rings to cut patch-induced downtime. The system has to run as a scheduled batch job, inside these limits: Change windows, Rollback capability and Dependency graph.

**Why it is hard.** The obvious approach is same ring for all assets, and it fails because critical systems need slower rings. The second trap is in "Dependency": the real signal is software dependency graph, while teams usually reach for per-host patching.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way time to patch critical vulnerabilities measures it.

**What success looks like.** Offline: AUC for patch incident prediction and Simulated downtime reduction. Online: Patch-induced incidents and Time to patch critical vulnerabilities. The launch is judged on "Patch-induced incidents" while "Time to patch critical vulnerabilities" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which patches will cause outages and schedule rollouts in rings to cut patch-induced downtime.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{incident},p)\cdot w(\text{asset criticality})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{incident} | The label: 1 if applying the patch caused an incident, 0 if not. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| w | A weight that scales how much a particular example, class or term counts in the loss. |
| \text{asset criticality} | How important the asset is to the business; w makes mistakes on critical assets cost more. |

**Hard constraints**

- Change windows
- Rollback capability
- Dependency graph
- Compliance deadlines

## The approach in one paragraph

Start with patch Tuesday schedule with fixed rings. Then earn the move to breakage-risk model with dependency-aware ring assignment and automated canary health checks, and only if it beats the baseline on AUC for patch incident prediction and Simulated downtime reduction after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Patch vendor history | Past breakage rate. Risk. Guard against: vendor tags. |
| Add Asset configuration diversity | Uncommon configurations. Breakage. Guard against: inventory. |
| Add Service dependency fan-in | Dependents of the component. Blast radius. Guard against: graph. |
| Run it as one pipeline | Patch catalogue (vendor feeds), Asset and config data (CMDB), Risk model (GBDT), Ring planner (dependency graph), Deployment orchestrator (patch tool) and Health checks (monitors), with Incident feedback off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle zero-day emergency patching | Emergency path with extra monitoring and fast rollback. |

**Deliberately not doing**

- Patch size: weak.
- Release day: weak.

**How the approach is proven**

Prove it offline on AUC for patch incident prediction and Simulated downtime reduction using time-ordered splits, then online on "Patch-induced incidents" with "Time to patch critical vulnerabilities" as the guardrail. Watch for: Incident labels missing for unreported breakages and Ignoring change windows in evaluation.

## Baseline and production design

- **Baseline (build this first):** Patch Tuesday schedule with fixed rings.
- **Production design:** Breakage-risk model with dependency-aware ring assignment and automated canary health checks.

## Why AI, and why this kind

**Why AI.** Predict which patches will cause outages and schedule rollouts in rings to cut patch-induced downtime. The evidence that separates good from bad outcomes (Patch vendor history, Asset configuration diversity, Service dependency fan-in) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "same ring for all assets" are what teams reach for first, and they fail because critical systems need slower rings. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Breakage-risk model with dependency-aware ring assignment and automated canary health checks.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Patch vendor history, Asset configuration diversity, Service dependency fan-in and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Patch Tuesday schedule with fixed rings | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Breakage-risk model with dependency-aware ring assignment and automated canary health checks | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Patch-induced incidents) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Incident labels missing for unreported breakages.
- Evaluation trap: Ignoring change windows in evaluation.
- Zero-day emergency patching: skips safety rings.
- Rare configuration: no historical data.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
