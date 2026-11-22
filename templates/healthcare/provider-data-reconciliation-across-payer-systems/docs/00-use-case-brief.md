# Provider Data Reconciliation Across Payer Systems: use-case brief

> Generated from the blueprint `healthcare/provider-data-reconciliation-across-payer-systems` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Data Reconciliation Across Payer Systems · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Reconcile provider identity, demographics, specialties, affiliations, contract status and effective dates across payer, credentialing, claims and directory systems, and give data stewards matched records, conflicts, source-of-truth recommendations and a temporal history. The system has to run as a scheduled batch job, inside these limits: The data steward approves merges and authoritative-field rules and the tool never merges records or writes to a source system on its own, Identifiers are used first and fuzzy matches go to review with a threshold and Survivorship rules are explicit and versioned.

**Why it is hard.** The obvious approach is name similarity, and it fails because names collide and change. The second trap is in "Matching": the real signal is fuzzy matches above a threshold reviewed, while teams usually reach for auto-merge.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.6K a month. A mistake is expensive in the way steward time per conflict measures it.

**What success looks like.** Offline: Pair precision and recall on steward-labelled pairs, Cluster purity and completeness and Wrong-merge rate (must be near zero). Online: Share of records reconciled without manual work, Steward time per conflict and Directory and claims mismatches. The launch is judged on "Share of records reconciled without manual work" while "Steward time per conflict" must not get worse.

## Objective, loss and constraints

**Business objective.** Reconcile provider identity, demographics, specialties, affiliations, contract status and effective dates across payer, credentialing, claims and directory systems, and give data stewards matched records, conflicts, source-of-truth recommendations and a temporal history.

**Training objective.** `\mathcal{L}=-\sum_{(a,b)}\left[y_{ab}\log \hat p_{ab}+(1-y_{ab})\log(1-\hat p_{ab})\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{(a,b)} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| y_{ab} | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per action or arm a) |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \hat{p}_{ab} | The model's estimated probability, after calibration where one is applied. (one value per action or arm a) |

**Hard constraints**

- The data steward approves merges and authoritative-field rules and the tool never merges records or writes to a source system on its own
- Identifiers are used first and fuzzy matches go to review with a threshold
- Survivorship rules are explicit and versioned
- Every merge is reversible and keeps the source values and dates
- Reconciles 4M provider records across 6 systems monthly
- Provider data is access controlled

## The approach in one paragraph

Start with stewards compare provider records between two systems in a spreadsheet. Then earn the move to identifier-first matching with a pairwise classifier for candidates, graph-based cluster reconciliation, survivorship rules by field and source authority, effective-dated history and a steward workbench with reversible merges, and only if it beats the baseline on Pair precision and recall on steward-labelled pairs and Cluster purity and completeness after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Identifier agreement | Agreement of NPIs and other identifiers across records. Strongest link evidence. Guard against: source records. |
| Add Attribute similarity | Similarity of name, address, specialty and affiliation. Candidate evidence. Guard against: normalised fields. |
| Add Graph consistency | Whether linked records form a consistent cluster. Flags transitive errors. Guard against: cluster at scoring. |
| Run it as one pipeline | Source extract intake (governed extracts), Standardiser and blocker (normalisation and blocking rules), Pairwise matcher (gradient boosting), Cluster reconciler (graph connected components), Survivorship engine (versioned rules) and Data steward approval (human), with Golden record and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle shared practice address | Identifier-first rules and a review threshold. |

**Deliberately not doing**

- Record creation order: artefact.
- System identifier format: label.
- Practice marketing text: not identity.

**How the approach is proven**

Prove it offline on Pair precision and recall on steward-labelled pairs, Cluster purity and completeness and Wrong-merge rate (must be near zero) using time-ordered splits, then online on "Share of records reconciled without manual work" with "Steward time per conflict" as the guardrail. Watch for: Auto-merging fuzzy matches, Using latest-wins survivorship and Overwriting history.

## Baseline and production design

- **Baseline (build this first):** Stewards compare provider records between two systems in a spreadsheet.
- **Production design:** Identifier-first matching with a pairwise classifier for candidates, graph-based cluster reconciliation, survivorship rules by field and source authority, effective-dated history and a steward workbench with reversible merges.

## Why AI, and why this kind

**Why AI.** Reconcile provider identity, demographics, specialties, affiliations, contract status and effective dates across payer, credentialing, claims and directory systems, and give data stewards matched records, conflicts, source-of-truth recommendations and a temporal history. The evidence that separates good from bad outcomes (Identifier agreement, Attribute similarity, Graph consistency) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "name similarity" are what teams reach for first, and they fail because names collide and change. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Identifier-first matching with a pairwise classifier for candidates, graph-based cluster reconciliation, survivorship rules by field and source authority, effective-dated history and a steward workbench with reversible merges.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Identifier agreement, Attribute similarity, Graph consistency and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Stewards compare provider records between two systems in a spreadsheet | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Identifier-first matching with a pairwise classifier for candidates, graph-based cluster reconciliation, survivorship rules by field and source authority, effective-dated history and a steward workbench with reversible merges | chosen | Meets the run-window envelope at $0.091 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Share of records reconciled without manual work) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Auto-merging fuzzy matches.
- Evaluation trap: Using latest-wins survivorship.
- Shared practice address: different providers look alike.
- Provider changes name: records appear unrelated.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
