# Support Ticket Triage & Priority: use-case brief

> Generated from the blueprint `saas/support-ticket-triage-and-priority` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Support Ticket Triage & Priority · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify ticket category, urgency and required skill at creation, and route to the right queue meeting SLA. The system has to run in under 100 milliseconds, inside these limits: SLA tiers, Multilingual and Real-time routing.

**Why it is hard.** The obvious approach is text only, and it fails because priority depends on the customer and context. The second trap is in "Cost": the real signal is asymmetric cost for under-prioritising, while teams usually reach for symmetric accuracy.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $12.2K a month. A mistake is expensive in the way time to first response measures it.

**What success looks like.** Offline: Macro-F1 and urgency recall and Routing accuracy. Online: SLA breach rate and Time to first response. The launch is judged on "SLA breach rate" while "Time to first response" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify ticket category, urgency and required skill at creation, and route to the right queue meeting SLA.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{category}}+\lambda\,\mathrm{OrdinalCE}_{\text{urgency}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{category}} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{OrdinalCE}_{\text{urgency}} | Ordinal cross-entropy: cross-entropy that treats classes as ordered, so predicting far from the true grade costs more than predicting next to it. |

**Hard constraints**

- SLA tiers
- Multilingual
- Real-time routing
- Explainable

## The approach in one paragraph

Start with keyword rules and manual triage. Then earn the move to fine-tuned encoder with account-context features, calibrated urgency, incident linking and skills-based routing, and only if it beats the baseline on Macro-F1 and urgency recall and Routing accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Account tier and SLA | Contract tier. Priority. Guard against: cRM. |
| Add Incident linkage | Active incident on product. Grouping. Guard against: status. |
| Add Urgency language | Classifier. Urgency. Guard against: calibration. |
| Run it as one pipeline | Ticket creation (helpdesk), Language detector (model), Classifier (encoder with context), Incident linker (similarity), Routing engine (skills and SLA) and Resolution outcomes (labels), with Agent queue off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle incident causes a flood of near-identical tickets | Incident clustering and bulk handling. |

**Deliberately not doing**

- Ticket length: weak.
- Customer name: none.

**How the approach is proven**

Prove it offline on Macro-F1 and urgency recall and Routing accuracy using time-ordered splits, then online on "SLA breach rate" with "Time to first response" as the guardrail. Watch for: Labels from past misrouted tickets and Evaluating without account context.

## Baseline and production design

- **Baseline (build this first):** Keyword rules and manual triage.
- **Production design:** Fine-tuned encoder with account-context features, calibrated urgency, incident linking and skills-based routing.

## Why AI, and why this kind

**Why AI.** Classify ticket category, urgency and required skill at creation, and route to the right queue meeting SLA. The evidence that separates good from bad outcomes (Account tier and SLA, Incident linkage, Urgency language) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "text only" are what teams reach for first, and they fail because priority depends on the customer and context. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Fine-tuned encoder with account-context features, calibrated urgency, incident linking and skills-based routing.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Account tier and SLA, Incident linkage, Urgency language and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword rules and manual triage | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Fine-tuned encoder with account-context features, calibrated urgency, incident linking and skills-based routing | chosen | Meets the 80 ms envelope at $0.679 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (SLA breach rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels from past misrouted tickets.
- Evaluation trap: Evaluating without account context.
- Incident causes a flood of near-identical tickets: queue overwhelmed.
- New product area with no history: a new product area has no labelled tickets so the classifier misroutes them to the wrong queue.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
