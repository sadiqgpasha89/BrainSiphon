# Alert Noise Reduction & Routing: use-case brief

> Generated from the blueprint `saas/alert-noise-reduction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Alert Noise Reduction & Routing · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Deduplicate, correlate and route alerts to the right on-call, cutting pages per engineer without missing real incidents. The system has to run in under 100 milliseconds, inside these limits: Never suppress true critical alerts, Explainable suppression and Ownership mapping.

**Why it is hard.** The obvious approach is static severity, and it fails because many high-severity alerts are ignored. The second trap is in "Safety": the real signal is suppression with audits and never for top-severity, while teams usually reach for aggressive auto-suppress.

**Scale and stakes.** At 10 million users this is about 300.0M model-touching events a day, 3.5K requests per second on average and 20.8K at peak, at an estimated $22.7K a month. A mistake is expensive in the way mean time to acknowledge measures it.

**What success looks like.** Offline: Precision of suppression at zero missed critical and Page reduction. Online: Pages per on-call shift and Mean time to acknowledge. The launch is judged on "Pages per on-call shift" while "Mean time to acknowledge" must not get worse.

## Objective, loss and constraints

**Business objective.** Deduplicate, correlate and route alerts to the right on-call, cutting pages per engineer without missing real incidents.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{actionable},p)+\lambda\,\mathrm{ClusterPurity}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{actionable} | The label: 1 if an alert led to action by an engineer, 0 if it was noise. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ClusterPurity} | Penalty when a cluster of grouped alerts mixes unrelated alerts. |

**Hard constraints**

- Never suppress true critical alerts
- Explainable suppression
- Ownership mapping
- Real-time

## The approach in one paragraph

Start with static severity routing and manual muting. Then earn the move to actionability model with correlation grouping and ownership resolution, with a safe-suppression policy and audit reports, and only if it beats the baseline on Precision of suppression at zero missed critical and Page reduction after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Historical actionability | Share of past alerts acted upon. Noise. Guard against: matured labels. |
| Add Correlation with change events | Alerts following deploys. Grouping. Guard against: feed. |
| Add Ownership confidence | Service-to-team mapping. Routing. Guard against: catalogue. |
| Run it as one pipeline | Alert stream (monitoring), Entity and ownership resolver (service catalogue), Actionability model (GBDT), Correlator (graph clustering), Suppression policy (safe rules) and On-call routing (pager), with Feedback off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle suppressed alert type becomes critical | Suppression audits and critical-class exemptions. |

**Deliberately not doing**

- Alert text: duplicates rule.
- Host: variable.

**How the approach is proven**

Prove it offline on Precision of suppression at zero missed critical and Page reduction using time-ordered splits, then online on "Pages per on-call shift" with "Mean time to acknowledge" as the guardrail. Watch for: Treating un-acked alerts as noise and Evaluating without critical-miss audit.

## Baseline and production design

- **Baseline (build this first):** Static severity routing and manual muting.
- **Production design:** Actionability model with correlation grouping and ownership resolution, with a safe-suppression policy and audit reports.

## Why AI, and why this kind

**Why AI.** Deduplicate, correlate and route alerts to the right on-call, cutting pages per engineer without missing real incidents. The evidence that separates good from bad outcomes (Historical actionability, Correlation with change events, Ownership confidence) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "static severity" are what teams reach for first, and they fail because many high-severity alerts are ignored. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Actionability model with correlation grouping and ownership resolution, with a safe-suppression policy and audit reports.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Historical actionability, Correlation with change events, Ownership confidence and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static severity routing and manual muting | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Actionability model with correlation grouping and ownership resolution, with a safe-suppression policy and audit reports | chosen | Meets the 80 ms envelope at $0.0025 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Pages per on-call shift) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating un-acked alerts as noise.
- Evaluation trap: Evaluating without critical-miss audit.
- Suppressed alert type becomes critical: incident missed.
- Ownership catalogue out of date: pages go to the wrong team.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
