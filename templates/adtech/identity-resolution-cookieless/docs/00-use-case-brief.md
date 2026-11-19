# Identity Resolution in a Cookieless World: use-case brief

> Generated from the blueprint `adtech/identity-resolution-cookieless` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Identity Resolution in a Cookieless World · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Link devices and first-party identifiers into privacy-compliant identity clusters for measurement and addressability. The system has to run as a scheduled batch job, inside these limits: Consent and privacy law, Deterministic and probabilistic linking and Fraud resistance.

**Why it is hard.** The obvious approach is aggressive probabilistic merging, and it fails because false merges attribute actions to the wrong person. The second trap is in "Stability": the real signal is stable cluster IDs across updates, while teams usually reach for rebuild IDs each run.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.6K a month. A mistake is expensive in the way frequency capping accuracy measures it.

**What success looks like.** Offline: Link precision and recall on deterministic holdout and Cluster purity. Online: Match rate and Frequency capping accuracy. The launch is judged on "Match rate" while "Frequency capping accuracy" must not get worse.

## Objective, loss and constraints

**Business objective.** Link devices and first-party identifiers into privacy-compliant identity clusters for measurement and addressability.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{same person})+\lambda\,\mathrm{TransitivityPenalty}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{same person} | The label: 1 if two device or identity records belong to the same person, 0 if not. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{TransitivityPenalty} | Penalty when links contradict each other: if A matches B and B matches C, then A should match C. |

**Hard constraints**

- Consent and privacy law
- Deterministic and probabilistic linking
- Fraud resistance
- Cluster stability

## The approach in one paragraph

Start with cookie syncing and last-touch matching. Then earn the move to graph-based identity clustering with link confidence, constrained clustering to avoid merging large components, and consent-aware filters, and only if it beats the baseline on Link precision and recall on deterministic holdout and Cluster purity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Deterministic link strength | Shared login or hashed email. Strong evidence. Guard against: hash salting. |
| Add Co-occurrence patterns | Shared IP and time patterns. Probabilistic link. Guard against: shared networks. |
| Add Household vs individual score | Probability devices belong to one person. Granularity. Guard against: context. |
| Run it as one pipeline | Identifier events (stream), Consent filter (policy), Link scorer (GBDT), Graph builder (edge store), Constrained clustering (Leiden) and ID service (lookup API), with Quality audits off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle public WiFi merges unrelated users | Down-weight high-degree shared signals. |

**Deliberately not doing**

- IP address alone: shared networks.
- Device model: weak.

**How the approach is proven**

Prove it offline on Link precision and recall on deterministic holdout and Cluster purity using time-ordered splits, then online on "Match rate" with "Frequency capping accuracy" as the guardrail. Watch for: Evaluating on deterministic links that inflate probabilistic accuracy and Ignoring household effects.

## Baseline and production design

- **Baseline (build this first):** Cookie syncing and last-touch matching.
- **Production design:** Graph-based identity clustering with link confidence, constrained clustering to avoid merging large components, and consent-aware filters.

## Why AI, and why this kind

**Why AI.** Link devices and first-party identifiers into privacy-compliant identity clusters for measurement and addressability. The evidence that separates good from bad outcomes (Deterministic link strength, Co-occurrence patterns, Household vs individual score) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "aggressive probabilistic merging" are what teams reach for first, and they fail because false merges attribute actions to the wrong person. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Graph-based identity clustering with link confidence, constrained clustering to avoid merging large components, and consent-aware filters.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Deterministic link strength, Co-occurrence patterns, Household vs individual score and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Cookie syncing and last-touch matching | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Graph-based identity clustering with link confidence, constrained clustering to avoid merging large components, and consent-aware filters | chosen | Meets the run-window envelope at $0.091 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Match rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on deterministic links that inflate probabilistic accuracy.
- Evaluation trap: Ignoring household effects.
- Public WiFi merges unrelated users: giant false clusters.
- User withdraws consent: links must be removed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
