# CMDB Reconciliation and Dependency Mapping: use-case brief

> Generated from the blueprint `it-ops/cmdb-reconciliation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** CMDB Reconciliation and Dependency Mapping · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Keep the configuration database accurate by matching discovered assets, cloud resources and traffic flows to records, proposing merges, owners and dependencies for data stewards to approve. The system has to run as a scheduled batch job, inside these limits: Stewards approve merges and deletions, Match confidence shown and Dependencies derived from observed traffic.

**Why it is hard.** The obvious approach is manual updates, and it fails because manual records go stale. The second trap is in "Control": the real signal is steward approval, while teams usually reach for automatic overwrite.

**Scale and stakes.** At 10 million users this is about 5.0M model-touching events a day, 58 requests per second on average and 58 at peak, at an estimated $2.2K a month. A mistake is expensive in the way incidents with wrong owner measures it.

**What success looks like.** Offline: Match accuracy on audited records, Dependency recall and Steward acceptance. Online: CMDB accuracy, Incidents with wrong owner and Time to find dependencies. The launch is judged on "CMDB accuracy" while "Incidents with wrong owner" must not get worse.

## Objective, loss and constraints

**Business objective.** Keep the configuration database accurate by matching discovered assets, cloud resources and traffic flows to records, proposing merges, owners and dependencies for data stewards to approve.

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

- Stewards approve merges and deletions
- Match confidence shown
- Dependencies derived from observed traffic
- Daily reconciliation of 5M items
- Orphans reported weekly

## The approach in one paragraph

Start with periodic discovery scans and manual clean-up projects, because they are the usual approach. Then earn the move to a reconciliation service that matches discovery, cloud and flow data to CMDB records with confidence, proposes merges and dependencies and tracks data quality by owner team, and only if it beats the baseline on Match accuracy on audited records and Dependency recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Identifier match | Serial, hostname and address match. Core. Guard against: from discovery. |
| Add Observed network flows | Who talks to whom. Dependency. Guard against: from flow logs. |
| Add Cloud tags and ownership | Owner and service tags. Ownership. Guard against: from cloud APIs. |
| Run it as one pipeline | Discovery and cloud ingest (scanners and APIs), Entity matching (model and rules), Dependency inference (flow analysis), Merge and update (CMDB) and Data quality dashboard (BI), with Steward review queue and Quality review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle duplicate hostnames | Use multiple identifiers. |

**Deliberately not doing**

- Asset description: weak link.
- Vendor name alone: weak link.
- Created by: personal data.

**How the approach is proven**

Prove it offline on Match accuracy on audited records, Dependency recall and Steward acceptance using time-ordered splits, then online on "CMDB accuracy" with "Incidents with wrong owner" as the guardrail. Watch for: Automatic overwrite, Manual-only updates and Asset counts as quality.

## Baseline and production design

- **Baseline (build this first):** Periodic discovery scans and manual clean-up projects, because they are the usual approach.
- **Production design:** A reconciliation service that matches discovery, cloud and flow data to CMDB records with confidence, proposes merges and dependencies and tracks data quality by owner team.

## Why AI, and why this kind

**Why AI.** Keep the configuration database accurate by matching discovered assets, cloud resources and traffic flows to records, proposing merges, owners and dependencies for data stewards to approve. The evidence that separates good from bad outcomes (Identifier match, Observed network flows, Cloud tags and ownership) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "manual updates" are what teams reach for first, and they fail because manual records go stale. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A reconciliation service that matches discovery, cloud and flow data to CMDB records with confidence, proposes merges and dependencies and tracks data quality by owner team.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Identifier match, Observed network flows, Cloud tags and ownership and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Periodic discovery scans and manual clean-up projects, because they are the usual approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A reconciliation service that matches discovery, cloud and flow data to CMDB records with confidence, proposes merges and dependencies and tracks data quality by owner team | chosen | Meets the run-window envelope at $0.014 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (CMDB accuracy) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Automatic overwrite.
- Evaluation trap: Manual-only updates.
- Duplicate hostnames: two systems share a name.
- Ephemeral workloads: containers appear and vanish.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
