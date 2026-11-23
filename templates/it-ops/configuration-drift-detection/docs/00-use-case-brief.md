# Configuration Drift Detection: use-case brief

> Generated from the blueprint `it-ops/configuration-drift-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Configuration Drift Detection · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Compare running configuration with the approved baseline from infrastructure code, detect drift and classify it as harmless, risky or unauthorised for owners to fix or accept. The system has to run as a scheduled batch job, inside these limits: Drift reports within 1 hour of detection, Security-relevant drift alerted to security and Owners decide to revert or accept.

**Why it is hard.** The obvious approach is last seen state, and it fails because the last seen state may already be wrong. The second trap is in "Class": the real signal is risk by setting and target, while teams usually reach for all drift equal.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way time to reconcile measures it.

**What success looks like.** Offline: Drift detection recall, Risk classification accuracy and False drift rate. Online: Unmanaged drift, Time to reconcile and Incidents from drift. The launch is judged on "Unmanaged drift" while "Time to reconcile" must not get worse.

## Objective, loss and constraints

**Business objective.** Compare running configuration with the approved baseline from infrastructure code, detect drift and classify it as harmless, risky or unauthorised for owners to fix or accept.

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

- Drift reports within 1 hour of detection
- Security-relevant drift alerted to security
- Owners decide to revert or accept
- Remediation through code, not consoles
- 500K configuration items

## The approach in one paragraph

Start with periodic audits with scripts per platform, because they are the common practice. Then earn the move to a scanner that diffs actual state against code, links drift to change records, scores risk and opens revert pull requests or exception requests for owners, and only if it beats the baseline on Drift detection recall and Risk classification accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Setting difference | Declared versus actual value. Core. Guard against: from scans. |
| Add Setting sensitivity | Security or availability relevance. Risk. Guard against: from policy. |
| Add Change record link | Whether a change explains the drift. Authorisation. Guard against: from ITSM. |
| Run it as one pipeline | State collection (cloud and device APIs), Baseline diff (infrastructure code), Change record match (ITSM), Risk classification (rules and model), Revert pull request (code host) and Drift trend (weekly), with Owner review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle auto-managed settings | Ignore lists by setting. |

**Deliberately not doing**

- Resource name: an identifier.
- Scanner name: weak link.
- Owner name: personal data.

**How the approach is proven**

Prove it offline on Drift detection recall, Risk classification accuracy and False drift rate using time-ordered splits, then online on "Unmanaged drift" with "Time to reconcile" as the guardrail. Watch for: Last seen state as baseline, Equal treatment of all drift and Console remediation.

## Baseline and production design

- **Baseline (build this first):** Periodic audits with scripts per platform, because they are the common practice.
- **Production design:** A scanner that diffs actual state against code, links drift to change records, scores risk and opens revert pull requests or exception requests for owners.

## Why AI, and why this kind

**Why AI.** Compare running configuration with the approved baseline from infrastructure code, detect drift and classify it as harmless, risky or unauthorised for owners to fix or accept. The evidence that separates good from bad outcomes (Setting difference, Setting sensitivity, Change record link) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "last seen state" are what teams reach for first, and they fail because the last seen state may already be wrong. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A scanner that diffs actual state against code, links drift to change records, scores risk and opens revert pull requests or exception requests for owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Setting difference, Setting sensitivity, Change record link and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Periodic audits with scripts per platform, because they are the common practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A scanner that diffs actual state against code, links drift to change records, scores risk and opens revert pull requests or exception requests for owners | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unmanaged drift) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Last seen state as baseline.
- Evaluation trap: Equal treatment of all drift.
- Auto-managed settings: the platform changes values itself.
- Emergency fix: engineers fix production by hand.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
