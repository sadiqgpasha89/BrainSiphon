# Trade Compliance: Denied-Party & Export Control Screening: use-case brief

> Generated from the blueprint `supply-chain/trade-compliance-denied-party-screening` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Trade Compliance: Denied-Party & Export Control Screening · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Screen shipment parties, vessels and end users against restricted lists and ownership chains with high recall and manageable false hits. The system has to run in under 100 milliseconds, inside these limits: Near-100% recall on listed parties, 50% ownership rule and List updates within hours.

**Why it is hard.** The obvious approach is name matching only, and it fails because restricted parties hide behind subsidiaries. The second trap is in "Matching": the real signal is transliteration-robust fuzzy matching, while teams usually reach for exact match.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $12.3K a month. A mistake is expensive in the way violations avoided measures it.

**What success looks like.** Offline: Recall at fixed review volume and Ownership chain accuracy. Online: False-hit workload and Violations avoided. The launch is judged on "False-hit workload" while "Violations avoided" must not get worse.

## Objective, loss and constraints

**Business objective.** Screen shipment parties, vessels and end users against restricted lists and ownership chains with high recall and manageable false hits.

**Training objective.** `\mathcal{L}=\mathrm{Triplet}+\lambda\,\mathrm{BCE}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Triplet} | Triplet loss: requires an anchor to be closer to a matching example than to a non-matching one by a margin. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |

**Hard constraints**

- Near-100% recall on listed parties
- 50% ownership rule
- List updates within hours
- Evidence retention

## The approach in one paragraph

Start with exact and edit-distance matching against lists. Then earn the move to candidate generation by n-gram ANN, cross-encoder re-ranker, ownership graph engine and case management with decision audit, and only if it beats the baseline on Recall at fixed review volume and Ownership chain accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Fuzzy name similarity | Learned embedding similarity. Candidate hits. Guard against: alias coverage. |
| Add Ownership share to restricted parties | Aggregated percentage. 50% rule. Guard against: registry data. |
| Add Country and goods risk | Destination and ECCN risk. Context. Guard against: version. |
| Run it as one pipeline | Shipment party data (TMS), Name normaliser (transliteration), Candidate retrieval (n-gram ANN), Re-ranker (cross-encoder), Ownership graph check (registry graph) and Compliance officer (human), with Decision audit off the critical path. |
| Optimise the right thing | The objective weighs triplet loss: requires an anchor to be closer to a matching example than to a non-matching one by a margin, so the model is trained on the cost of the decision and not on a generic score. |
| Handle list update adds many entities | Streaming index update and re-screening of open shipments. |

**Deliberately not doing**

- Document language: none.
- Shipment weight: none.

**How the approach is proven**

Prove it offline on Recall at fixed review volume and Ownership chain accuracy using time-ordered splits, then online on "False-hit workload" with "Violations avoided" as the guardrail. Watch for: Test on easy names and No evaluation on ownership-evasion cases.

## Baseline and production design

- **Baseline (build this first):** Exact and edit-distance matching against lists.
- **Production design:** Candidate generation by n-gram ANN, cross-encoder re-ranker, ownership graph engine and case management with decision audit.

## Why AI, and why this kind

**Why AI.** Screen shipment parties, vessels and end users against restricted lists and ownership chains with high recall and manageable false hits. The evidence that separates good from bad outcomes (Fuzzy name similarity, Ownership share to restricted parties, Country and goods risk) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "name matching only" are what teams reach for first, and they fail because restricted parties hide behind subsidiaries. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Candidate generation by n-gram ANN, cross-encoder re-ranker, ownership graph engine and case management with decision audit.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Fuzzy name similarity, Ownership share to restricted parties, Country and goods risk and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Exact and edit-distance matching against lists | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Candidate generation by n-gram ANN, cross-encoder re-ranker, ownership graph engine and case management with decision audit | chosen | Meets the 80 ms envelope at $0.272 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (False-hit workload) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test on easy names.
- Evaluation trap: No evaluation on ownership-evasion cases.
- List update adds many entities: index lag causes missed hits.
- Registry data gaps for ownership: missing registry records break the ownership chain so a restricted parent is not found.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
