# Customer Data Platform Identity Resolution: use-case brief

> Generated from the blueprint `saas/cdp-identity-resolution-saas` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Customer Data Platform Identity Resolution · **Domain:** saas · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Resolve anonymous and known identifiers into unified customer profiles for analytics and activation with explainable merges. The system has to run as a scheduled batch job, inside these limits: Deterministic first, Privacy and consent and Unmerge capability.

**Why it is hard.** The obvious approach is aggressive probabilistic merging, and it fails because bad merges contaminate profiles. The second trap is in "Explainability": the real signal is link evidence retained for each merge, while teams usually reach for opaque clusters.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way activation match rate measures it.

**What success looks like.** Offline: Merge precision at fixed recall and Unmerge rate. Online: Profile accuracy and Activation match rate. The launch is judged on "Profile accuracy" while "Activation match rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Resolve anonymous and known identifiers into unified customer profiles for analytics and activation with explainable merges.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{same person})+\lambda\,\mathrm{TransitivityPenalty}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{same person} | The label: 1 if two customer records belong to the same person. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{TransitivityPenalty} | Penalty when matches contradict each other: if A matches B and B matches C, then A should match C. |

**Hard constraints**

- Deterministic first
- Privacy and consent
- Unmerge capability
- Scale to billions of events

## The approach in one paragraph

Start with merge profiles by email. Then earn the move to deterministic graph clustering with confidence-scored probabilistic links, conflict checks, evidence retention and unmerge workflows, and only if it beats the baseline on Merge precision at fixed recall and Unmerge rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Deterministic identifier match | Email, user ID. Strong link. Guard against: hashing. |
| Add Device-session co-occurrence | Repeated shared sessions. Probabilistic. Guard against: windows. |
| Add Conflict signals | Contradictory attributes. Prevent bad merges. Guard against: rules. |
| Run it as one pipeline | Events and identifiers (stream), Link scorer (GBDT), Conflict checker (rules), Graph clustering (connected components), Profile store (unified profiles), Data steward (human) and Activation (destinations). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle shared family email merges different people | Role-based email detection and conflict checks. |

**Deliberately not doing**

- IP alone: shared networks.
- User agent: weak.

**How the approach is proven**

Prove it offline on Merge precision at fixed recall and Unmerge rate using time-ordered splits, then online on "Profile accuracy" with "Activation match rate" as the guardrail. Watch for: Evaluating with deterministic links only and Ignoring unmerge costs.

## Baseline and production design

- **Baseline (build this first):** Merge profiles by email.
- **Production design:** Deterministic graph clustering with confidence-scored probabilistic links, conflict checks, evidence retention and unmerge workflows.

## Why AI, and why this kind

**Why AI.** Resolve anonymous and known identifiers into unified customer profiles for analytics and activation with explainable merges. The evidence that separates good from bad outcomes (Deterministic identifier match, Device-session co-occurrence, Conflict signals) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "aggressive probabilistic merging" are what teams reach for first, and they fail because bad merges contaminate profiles. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Deterministic graph clustering with confidence-scored probabilistic links, conflict checks, evidence retention and unmerge workflows.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Deterministic identifier match, Device-session co-occurrence, Conflict signals and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Merge profiles by email | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Deterministic graph clustering with confidence-scored probabilistic links, conflict checks, evidence retention and unmerge workflows | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Profile accuracy) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating with deterministic links only.
- Evaluation trap: Ignoring unmerge costs.
- Shared family email merges different people: marketing misfires.
- Consent withdrawal: profile data must be removed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
