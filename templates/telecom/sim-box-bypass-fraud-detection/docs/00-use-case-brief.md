# SIM-Box & Bypass Fraud Detection: use-case brief

> Generated from the blueprint `telecom/sim-box-bypass-fraud-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SIM-Box & Bypass Fraud Detection · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect SIM-box and interconnect bypass fraud from call patterns and network signalling, so illegal termination of international calls is found and blocked. The system has to run as a scheduled batch job, inside these limits: Features from call detail records only and never call content, Analyst confirmation before blocking a subscriber and Evidence pack for regulator and carrier disputes.

**Why it is hard.** The obvious approach is total call minutes, and it fails because heavy genuine users look busy too. The second trap is in "Network": the real signal is groups of lines sharing a cell, device or time pattern, while teams usually reach for single line analysis.

**Scale and stakes.** At 10 million users this is about 72.0M model-touching events a day, 833 requests per second on average and 833 at peak, at an estimated $4.4K a month. A mistake is expensive in the way revenue recovered measures it.

**What success looks like.** Offline: Precision of confirmed fraud lines, Recall at fixed analyst capacity and Cluster purity. Online: Bypass minutes blocked, Revenue recovered and False blocks of genuine lines. The launch is judged on "Bypass minutes blocked" while "Revenue recovered" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect SIM-box and interconnect bypass fraud from call patterns and network signalling, so illegal termination of international calls is found and blocked.

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

- Features from call detail records only and never call content
- Analyst confirmation before blocking a subscriber
- Evidence pack for regulator and carrier disputes
- Daily scoring for 50M lines

## The approach in one paragraph

Start with rules on outbound call fan-out and low inbound ratios, because fraud teams already use them. Then earn the move to a graph and tabular model scoring lines and clusters from CDR aggregates and device data, with a ranked analyst queue, test call integration and a case file generator, and only if it beats the baseline on Precision of confirmed fraud lines and Recall at fixed analyst capacity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Call fan-out and reciprocity | Distinct destinations versus inbound calls ratio. Classic bypass pattern. Guard against: window per line. |
| Add Cell and device concentration | Many active SIMs in one cell and device cluster. Farm signal. Guard against: use anonymised device groups. |
| Add Call duration profile | Share of very short and fixed-length calls. Automated dialling. Guard against: compare with the segment. |
| Run it as one pipeline | CDR ingestion (mediation feed), Line aggregates (batch features), Graph construction (graph store), Fraud model (gradient boosting and graph embeddings), Cluster ranking (scoring) and Block action (network control), with Analyst review and test calls off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle legitimate call centre | Verified business flags and a separate segment. |

**Deliberately not doing**

- Subscriber name: irrelevant and private.
- Plan name alone: weak link.
- Number prefix alone: easily changed.

**How the approach is proven**

Prove it offline on Precision of confirmed fraud lines, Recall at fixed analyst capacity and Cluster purity using time-ordered splits, then online on "Bypass minutes blocked" with "Revenue recovered" as the guardrail. Watch for: Per-line analysis only, Blocking without evidence and Using call content.

## Baseline and production design

- **Baseline (build this first):** Rules on outbound call fan-out and low inbound ratios, because fraud teams already use them.
- **Production design:** A graph and tabular model scoring lines and clusters from CDR aggregates and device data, with a ranked analyst queue, test call integration and a case file generator.

## Why AI, and why this kind

**Why AI.** Detect SIM-box and interconnect bypass fraud from call patterns and network signalling, so illegal termination of international calls is found and blocked. The evidence that separates good from bad outcomes (Call fan-out and reciprocity, Cell and device concentration, Call duration profile) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "total call minutes" are what teams reach for first, and they fail because heavy genuine users look busy too. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A graph and tabular model scoring lines and clusters from CDR aggregates and device data, with a ranked analyst queue, test call integration and a case file generator.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Call fan-out and reciprocity, Cell and device concentration, Call duration profile and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rules on outbound call fan-out and low inbound ratios, because fraud teams already use them | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A graph and tabular model scoring lines and clusters from CDR aggregates and device data, with a ranked analyst queue, test call integration and a case file generator | chosen | Meets the run-window envelope at $0.0020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Bypass minutes blocked) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Per-line analysis only.
- Evaluation trap: Blocking without evidence.
- Legitimate call centre: patterns look like bypass.
- Fraudsters rotate SIMs: line scores reset when SIMs rotate.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
