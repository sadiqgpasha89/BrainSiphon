# Attachment Sandbox Triage: use-case brief

> Generated from the blueprint `cybersecurity/email-attachment-sandbox-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Attachment Sandbox Triage · **Domain:** cybersecurity · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Decide which attachments need expensive sandbox detonation, and classify them quickly using static and visual document features. The system has to run interactively, within a few seconds, inside these limits: Sandbox cost and queue limits, Delivery delay budget and Evasive documents.

**Why it is hard.** The obvious approach is detonate everything, and it fails because capacity limits delays and cost. The second trap is in "Rendering": the real signal is render documents and use visual models for lure detection, while teams usually reach for metadata only.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $40.7K a month. A mistake is expensive in the way mail delay time measures it.

**What success looks like.** Offline: Detonation-worthy recall at fixed capacity and Verdict latency. Online: Malicious attachments delivered and Mail delay time. The launch is judged on "Malicious attachments delivered" while "Mail delay time" must not get worse.

## Objective, loss and constraints

**Business objective.** Decide which attachments need expensive sandbox detonation, and classify them quickly using static and visual document features.

**Training objective.** `\mathcal{L}=\mathrm{CE}(y,p)+\lambda\,\mathrm{CostAwareDetonation}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{CostAwareDetonation} | Penalty that accounts for the time and money cost of running a file in the sandbox, so only files worth detonating are sent. |

**Hard constraints**

- Sandbox cost and queue limits
- Delivery delay budget
- Evasive documents
- Zero-day documents

## The approach in one paragraph

Start with aV scan plus detonate all executable attachments. Then earn the move to static plus visual features with cost-aware sandbox scheduling and fast verdict caching by content hash, and only if it beats the baseline on Detonation-worthy recall at fixed capacity and Verdict latency after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Macro and embedded-object flags | VBA, OLE, scripts. Active content. Guard against: parsing. |
| Add Rendered-page lure score | CNN on rendered first page. Social engineering. Guard against: rendering fidelity. |
| Add Sender reputation and file prevalence | Rarity of the file. Zero-day proxy. Guard against: data. |
| Run it as one pipeline | Attachment extraction (mail gateway), Static parser (document analysis), Visual lure model (CNN), Detonation scheduler (cost-aware policy), Sandbox (VM fleet) and Verdict cache (hash store), with Analyst feedback off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle sandbox-evasive malware waits for user interaction | Interaction simulation and multi-stage analysis. |

**Deliberately not doing**

- File name: trivial to change.
- File size: weak.

**How the approach is proven**

Prove it offline on Detonation-worthy recall at fixed capacity and Verdict latency using time-ordered splits, then online on "Malicious attachments delivered" with "Mail delay time" as the guardrail. Watch for: Training on labelled detonation outcomes only (selection bias) and Static datasets without evasion.

## Baseline and production design

- **Baseline (build this first):** AV scan plus detonate all executable attachments.
- **Production design:** Static plus visual features with cost-aware sandbox scheduling and fast verdict caching by content hash.

## Why AI, and why this kind

**Why AI.** Decide which attachments need expensive sandbox detonation, and classify them quickly using static and visual document features. The evidence that separates good from bad outcomes (Macro and embedded-object flags, Rendered-page lure score, Sender reputation and file prevalence) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "detonate everything" are what teams reach for first, and they fail because capacity limits delays and cost. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Static plus visual features with cost-aware sandbox scheduling and fast verdict caching by content hash.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Macro and embedded-object flags, Rendered-page lure score, Sender reputation and file prevalence and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: AV scan plus detonate all executable attachments | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Static plus visual features with cost-aware sandbox scheduling and fast verdict caching by content hash | chosen | Meets the 2500 ms envelope at $0.226 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Malicious attachments delivered) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on labelled detonation outcomes only (selection bias).
- Evaluation trap: Static datasets without evasion.
- Sandbox-evasive malware waits for user interaction: malware that waits for user interaction never detonates and gets a benign verdict.
- Queue backlog during attack waves: delivery delays.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
