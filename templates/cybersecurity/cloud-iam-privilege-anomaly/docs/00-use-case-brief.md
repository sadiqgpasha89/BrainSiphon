# Cloud IAM Privilege Anomaly & Least-Privilege: use-case brief

> Generated from the blueprint `cybersecurity/cloud-iam-privilege-anomaly` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cloud IAM Privilege Anomaly & Least-Privilege · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect abnormal permission use and recommend least-privilege policies by learning actual usage across identities and roles. The system has to run as a scheduled batch job, inside these limits: No outages from permission removal, Complex trust relationships and Audit logs at scale.

**Why it is hard.** The obvious approach is remove all unused permissions blindly, and it fails because rare but legitimate break-glass permissions get removed. The second trap is in "Paths": the real signal is effective permissions through role chaining, while teams usually reach for direct policies only.

**Scale and stakes.** At 10 million users this is about 15.0M model-touching events a day, 174 requests per second on average and 174 at peak, at an estimated $2.2K a month. A mistake is expensive in the way privilege-escalation findings measures it.

**What success looks like.** Offline: Privilege reduction without breakage in shadow and Anomaly precision. Online: Excess permissions removed and Privilege-escalation findings. The launch is judged on "Excess permissions removed" while "Privilege-escalation findings" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect abnormal permission use and recommend least-privilege policies by learning actual usage across identities and roles.

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

- No outages from permission removal
- Complex trust relationships
- Audit logs at scale
- Role-chaining

## The approach in one paragraph

Start with access-analyser style findings of unused permissions. Then earn the move to identity graph with effective-permission analysis, usage-based right-sizing recommendations and anomaly models on API-call sequences, and only if it beats the baseline on Privilege reduction without breakage in shadow and Anomaly precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Permission use ratio | Used divided by granted permissions. Over-provisioning. Guard against: window length. |
| Add Role-assumption chain depth | Chain length to powerful role. Escalation. Guard against: graph. |
| Add Unusual API call for principal | Rarity of call for this identity. Anomaly. Guard against: baseline. |
| Run it as one pipeline | Identity graph (graph DB), Effective-permission engine (policy analysis), Usage model (baseline stats), Anomaly detector (sequence model), Policy recommender (least-privilege generator) and Engineer approval (human), with Cloud audit logs off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle quarterly job needs permissions rarely used | Long usage windows and staged removal with alerts. |

**Deliberately not doing**

- Policy name: none.
- Number of policies: weak.

**How the approach is proven**

Prove it offline on Privilege reduction without breakage in shadow and Anomaly precision using time-ordered splits, then online on "Excess permissions removed" with "Privilege-escalation findings" as the guardrail. Watch for: Short usage windows and No labelled escalation events.

## Baseline and production design

- **Baseline (build this first):** Access-analyser style findings of unused permissions.
- **Production design:** Identity graph with effective-permission analysis, usage-based right-sizing recommendations and anomaly models on API-call sequences.

## Why AI, and why this kind

**Why AI.** Detect abnormal permission use and recommend least-privilege policies by learning actual usage across identities and roles. The evidence that separates good from bad outcomes (Permission use ratio, Role-assumption chain depth, Unusual API call for principal) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "remove all unused permissions blindly" are what teams reach for first, and they fail because rare but legitimate break-glass permissions get removed. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Identity graph with effective-permission analysis, usage-based right-sizing recommendations and anomaly models on API-call sequences.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Permission use ratio, Role-assumption chain depth, Unusual API call for principal and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Access-analyser style findings of unused permissions | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Identity graph with effective-permission analysis, usage-based right-sizing recommendations and anomaly models on API-call sequences | chosen | Meets the run-window envelope at $0.0049 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Excess permissions removed) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Short usage windows.
- Evaluation trap: No labelled escalation events.
- Quarterly job needs permissions rarely used: removal breaks it.
- Third-party role trust misconfigured: external escalation path.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
