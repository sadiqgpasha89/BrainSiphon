# Cross-Device Graph for Measurement: use-case brief

> Generated from the blueprint `adtech/cross-device-graph` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cross-Device Graph for Measurement · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Link devices belonging to the same person or household to unify reach, frequency and attribution measurement. The system has to run as a scheduled batch job, inside these limits: Privacy law compliance, Probabilistic links labelled as such and Quality metrics per link type.

**Why it is hard.** The obvious approach is maximal link recall, and it fails because wrong links inflate reach and break attribution. The second trap is in "Scope": the real signal is household vs person vs device levels, while teams usually reach for single ambiguous cluster.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way overlap with panel measures it.

**What success looks like.** Offline: Link precision and recall on panel truth and Reach estimation error. Online: Reach measurement accuracy and Overlap with panel. The launch is judged on "Reach measurement accuracy" while "Overlap with panel" must not get worse.

## Objective, loss and constraints

**Business objective.** Link devices belonging to the same person or household to unify reach, frequency and attribution measurement.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{linked})+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{linked} | The label: 1 if two devices belong to the same person or household, 0 if not. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Privacy law compliance
- Probabilistic links labelled as such
- Quality metrics per link type
- Daily refresh

## The approach in one paragraph

Start with iP-matching households. Then earn the move to link prediction GNN with deterministic anchors, calibrated confidence and cluster-size constraints, and only if it beats the baseline on Link precision and recall on panel truth and Reach estimation error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Shared login events | Authenticated co-occurrence. Gold-standard links. Guard against: hashing. |
| Add IP co-occurrence over time | Repeated shared networks. Probabilistic. Guard against: public IP filter. |
| Add Behavioural similarity | Co-browsing patterns. Soft evidence. Guard against: consent. |
| Run it as one pipeline | Device event logs (lake), Deterministic anchor extractor (rules), Candidate generation (blocking), Link scorer (GNN), Constrained clusterer (community detection) and Graph API (service), with Quality audit off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle large shared networks (offices) | Cluster size caps and edge down-weighting. |

**Deliberately not doing**

- Device brand: weak.
- Screen resolution: weak.

**How the approach is proven**

Prove it offline on Link precision and recall on panel truth and Reach estimation error using time-ordered splits, then online on "Reach measurement accuracy" with "Overlap with panel" as the guardrail. Watch for: Evaluating on deterministic links only and Static graph evaluated over time.

## Baseline and production design

- **Baseline (build this first):** IP-matching households.
- **Production design:** Link prediction GNN with deterministic anchors, calibrated confidence and cluster-size constraints.

## Why AI, and why this kind

**Why AI.** Link devices belonging to the same person or household to unify reach, frequency and attribution measurement. The evidence that separates good from bad outcomes (Shared login events, IP co-occurrence over time, Behavioural similarity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "maximal link recall" are what teams reach for first, and they fail because wrong links inflate reach and break attribution. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Link prediction GNN with deterministic anchors, calibrated confidence and cluster-size constraints.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Shared login events, IP co-occurrence over time, Behavioural similarity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: IP-matching households | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Link prediction GNN with deterministic anchors, calibrated confidence and cluster-size constraints | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Reach measurement accuracy) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on deterministic links only.
- Evaluation trap: Static graph evaluated over time.
- Large shared networks (offices): large shared networks merge unrelated devices into mega-clusters that wreck frequency counts.
- Device resale: old links persist.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
