# Cloud Misconfiguration Detection: use-case brief

> Generated from the blueprint `it-ops/cloud-misconfiguration-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cloud Misconfiguration Detection · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find risky cloud settings such as public storage, open ports and weak identity rules and rank them by exposure and data sensitivity, opening fixes through infrastructure code. The system has to run as a scheduled batch job, inside these limits: Exposed critical findings alerted within 1 hour, Fixes proposed as code changes and Owners approve.

**Why it is hard.** The obvious approach is rule severity alone, and it fails because severity ignores exposure. The second trap is in "Fix": the real signal is a pull request to infrastructure code, while teams usually reach for a console change.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way time to fix measures it.

**What success looks like.** Offline: Rank accuracy on confirmed exposures, Rule coverage and Fix acceptance. Online: Exposed critical resources, Time to fix and Repeat findings. The launch is judged on "Exposed critical resources" while "Time to fix" must not get worse.

## Objective, loss and constraints

**Business objective.** Find risky cloud settings such as public storage, open ports and weak identity rules and rank them by exposure and data sensitivity, opening fixes through infrastructure code.

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

- Exposed critical findings alerted within 1 hour
- Fixes proposed as code changes
- Owners approve
- Findings cite the resource and rule
- 2M resources

## The approach in one paragraph

Start with periodic scans with severity-ordered lists, because they are the standard tooling. Then earn the move to a posture engine that adds exposure and data context to scanner findings, ranks them and opens fix pull requests for owners, and only if it beats the baseline on Rank accuracy on confirmed exposures and Rule coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Internet exposure | Whether the resource is reachable. Core. Guard against: from network analysis. |
| Add Data sensitivity | Classification of stored data. Impact. Guard against: from the data catalogue. |
| Add Identity permissions | Wildcard and cross-account access. Risk. Guard against: from identity analysis. |
| Run it as one pipeline | Resource and setting collection (cloud APIs), Rule evaluation (policy as code), Exposure and data join (graph), Priority model (gradient boosting), Fix pull request (code host) and Closure check (rescan), with Owner review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle intentional exposure | Exception register with expiry. |

**Deliberately not doing**

- Resource id: an identifier.
- Scanner name: weak link.
- Owner name: personal data.

**How the approach is proven**

Prove it offline on Rank accuracy on confirmed exposures, Rule coverage and Fix acceptance using time-ordered splits, then online on "Exposed critical resources" with "Time to fix" as the guardrail. Watch for: Severity-only ranking, Console-only fixes and Findings with no context.

## Baseline and production design

- **Baseline (build this first):** Periodic scans with severity-ordered lists, because they are the standard tooling.
- **Production design:** A posture engine that adds exposure and data context to scanner findings, ranks them and opens fix pull requests for owners.

## Why AI, and why this kind

**Why AI.** Find risky cloud settings such as public storage, open ports and weak identity rules and rank them by exposure and data sensitivity, opening fixes through infrastructure code. The evidence that separates good from bad outcomes (Internet exposure, Data sensitivity, Identity permissions) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "rule severity alone" are what teams reach for first, and they fail because severity ignores exposure. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A posture engine that adds exposure and data context to scanner findings, ranks them and opens fix pull requests for owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Internet exposure, Data sensitivity, Identity permissions and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Periodic scans with severity-ordered lists, because they are the standard tooling | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A posture engine that adds exposure and data context to scanner findings, ranks them and opens fix pull requests for owners | chosen | Meets the run-window envelope at $0.038 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Exposed critical resources) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Severity-only ranking.
- Evaluation trap: Console-only fixes.
- Intentional exposure: a public site is meant to be public.
- Multi-account sprawl: accounts have no owner.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
