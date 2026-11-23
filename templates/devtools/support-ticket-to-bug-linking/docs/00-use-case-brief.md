# Support Ticket to Bug Linking: use-case brief

> Generated from the blueprint `devtools/support-ticket-to-bug-linking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Support Ticket to Bug Linking · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Link customer support tickets to the engineering bugs behind them so engineering sees real customer impact and support sees fix status. The system has to run interactively, within a few seconds, inside these limits: Customer personal data removed before linking, Links suggested for agents to confirm and Impact counts by bug.

**Why it is hard.** The obvious approach is same product area, and it fails because areas contain many bugs. The second trap is in "Privacy": the real signal is redacted ticket text, while teams usually reach for customer identity in engineering tools.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $12.2K a month. A mistake is expensive in the way bugs prioritised by customer impact measures it.

**What success looks like.** Offline: Precision at three, Redaction recall and Impact count accuracy. Online: Time to link, Bugs prioritised by customer impact and Duplicate tickets. The launch is judged on "Time to link" while "Bugs prioritised by customer impact" must not get worse.

## Objective, loss and constraints

**Business objective.** Link customer support tickets to the engineering bugs behind them so engineering sees real customer impact and support sees fix status.

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

- Customer personal data removed before linking
- Links suggested for agents to confirm
- Impact counts by bug
- Linking within 5 s
- 1M tickets per year

## The approach in one paragraph

Start with support agents searching the bug tracker by keywords, because it is the usual process. Then earn the move to a linking model with redaction, a suggestion UI for agents and an impact dashboard for product teams that shows counts by bug and tier, and only if it beats the baseline on Precision at three and Redaction recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Error message and version match | Reported error and version. Strong evidence. Guard against: from extraction. |
| Add Text similarity to bug reports | Embedding similarity. Candidate. Guard against: from the model. |
| Add Product area and feature | Classified area. Filter. Guard against: from classification. |
| Run it as one pipeline | Ticket intake (support platform), Redaction (pattern and model), Candidate retrieval (embeddings), Link ranking (learned ranker), Agent confirmation (support UI), Impact dashboard (BI) and Fix status sync (tracker). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle no matching bug | Suggest a new bug with a draft. |

**Deliberately not doing**

- Customer name: personal data.
- Agent name: irrelevant.
- Ticket channel: weak link.

**How the approach is proven**

Prove it offline on Precision at three, Redaction recall and Impact count accuracy using time-ordered splits, then online on "Time to link" with "Bugs prioritised by customer impact" as the guardrail. Watch for: Customer identity in bug trackers, Area-only matching and Auto-linking without review.

## Baseline and production design

- **Baseline (build this first):** Support agents searching the bug tracker by keywords, because it is the usual process.
- **Production design:** A linking model with redaction, a suggestion UI for agents and an impact dashboard for product teams that shows counts by bug and tier.

## Why AI, and why this kind

**Why AI.** Link customer support tickets to the engineering bugs behind them so engineering sees real customer impact and support sees fix status. The evidence that separates good from bad outcomes (Error message and version match, Text similarity to bug reports, Product area and feature) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "same product area" are what teams reach for first, and they fail because areas contain many bugs. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A linking model with redaction, a suggestion UI for agents and an impact dashboard for product teams that shows counts by bug and tier.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Error message and version match, Text similarity to bug reports, Product area and feature and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Support agents searching the bug tracker by keywords, because it is the usual process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A linking model with redaction, a suggestion UI for agents and an impact dashboard for product teams that shows counts by bug and tier | chosen | Meets the 2500 ms envelope at $0.680 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to link) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Customer identity in bug trackers.
- Evaluation trap: Area-only matching.
- No matching bug: the issue is new.
- Many tickets one bug: ticket counts for one bug jump suddenly after a release.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
