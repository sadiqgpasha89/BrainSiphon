# Cloud Misconfiguration & Drift Detection: use-case brief

> Generated from the blueprint `cybersecurity/cloud-misconfiguration-and-drift` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cloud Misconfiguration & Drift Detection · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find risky cloud configurations (public buckets, open security groups) and rank them by exposure and data sensitivity. The system has to run as a scheduled batch job, inside these limits: Millions of resources, Continuous change and Business exceptions.

**Why it is hard.** The obvious approach is finding counts, and it fails because a public bucket with logs is lower risk than one with PII. The second trap is in "Drift": the real signal is detect configuration changes via event stream, while teams usually reach for periodic full scans.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way open exposures measures it.

**What success looks like.** Offline: Precision at top risk findings and Coverage of real incidents. Online: Mean time to remediate critical exposures and Open exposures. The launch is judged on "Mean time to remediate critical exposures" while "Open exposures" must not get worse.

## Objective, loss and constraints

**Business objective.** Find risky cloud configurations (public buckets, open security groups) and rank them by exposure and data sensitivity.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{exposure})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| w | A weight that scales how much a particular example, class or term counts in the loss. |
| \text{exposure} | How exposed the resource is (for example, public internet access); w makes errors on exposed resources cost more. |

**Hard constraints**

- Millions of resources
- Continuous change
- Business exceptions
- Fix ownership

## The approach in one paragraph

Start with cIS benchmark rule scanner. Then earn the move to event-driven posture graph with exposure and data-sensitivity scoring and ML-based owner attribution for tickets, and only if it beats the baseline on Precision at top risk findings and Coverage of real incidents after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Internet reachability | Network path from internet. Exposure. Guard against: graph. |
| Add Data classification | Sensitivity of stored data. Impact. Guard against: dLP tags. |
| Add Change event recency | Time since misconfiguration was introduced. Urgency. Guard against: event logs. |
| Run it as one pipeline | Posture graph (graph store), Exposure analyser (reachability engine), Risk scorer (GBDT), Owner attribution (tags and history), Ticketing (ITSM) and Remediation status (labels), with Cloud config and audit logs off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle intentional public bucket for a website | Exception registry with expiry. |

**Deliberately not doing**

- Resource name: none.
- Tag count: weak.

**How the approach is proven**

Prove it offline on Precision at top risk findings and Coverage of real incidents using time-ordered splits, then online on "Mean time to remediate critical exposures" with "Open exposures" as the guardrail. Watch for: Evaluating on rule hits only and Ignoring ownership resolution errors.

## Baseline and production design

- **Baseline (build this first):** CIS benchmark rule scanner.
- **Production design:** Event-driven posture graph with exposure and data-sensitivity scoring and ML-based owner attribution for tickets.

## Why AI, and why this kind

**Why AI.** Find risky cloud configurations (public buckets, open security groups) and rank them by exposure and data sensitivity. The evidence that separates good from bad outcomes (Internet reachability, Data classification, Change event recency) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "finding counts" are what teams reach for first, and they fail because A public bucket with logs is lower risk than one with PII. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Event-driven posture graph with exposure and data-sensitivity scoring and ML-based owner attribution for tickets.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Internet reachability, Data classification, Change event recency and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: CIS benchmark rule scanner | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Event-driven posture graph with exposure and data-sensitivity scoring and ML-based owner attribution for tickets | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mean time to remediate critical exposures) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on rule hits only.
- Evaluation trap: Ignoring ownership resolution errors.
- Intentional public bucket for a website: intentionally public buckets keep firing alerts and bury the genuinely risky exposures.
- Ephemeral resources exist for minutes: scans miss exposure.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
