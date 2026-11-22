# Provider Data Quality & Entity Resolution: use-case brief

> Generated from the blueprint `healthcare/provider-data-quality-entity-resolution` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Data Quality & Entity Resolution · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Resolve duplicate and conflicting provider identities across credentialing, HR, EHR, scheduling, payer and directory systems and give data stewards ranked candidate merges with provenance. The system has to run as a scheduled batch job, inside these limits: A merge is never made on fuzzy name similarity alone and needs a strong identifier or steward approval, Source lineage and survivorship rules are preserved for every field and Data stewards approve merges and corrections.

**Why it is hard.** The obvious approach is name similarity, and it fails because common names create false merges that corrupt credentials and billing. The second trap is in "Blocking": the real signal is multi-key blocking that keeps recall high, while teams usually reach for one key.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way steward decisions per hour measures it.

**What success looks like.** Offline: Pairwise precision and recall at the steward threshold, Cluster purity and completeness and False-merge rate on a stewarded audit sample. Online: Duplicate provider rate, Steward decisions per hour and Downstream correction tickets. The launch is judged on "Duplicate provider rate" while "Steward decisions per hour" must not get worse.

## Objective, loss and constraints

**Business objective.** Resolve duplicate and conflicting provider identities across credentialing, HR, EHR, scheduling, payer and directory systems and give data stewards ranked candidate merges with provenance.

**Training objective.** `\mathcal{L}=-\sum_{(i,j)}\big[\,m_{ij}\log p_{ij}+(1-m_{ij})\log(1-p_{ij})\,\big]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{(i,j)} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| m_{ij} | Steward-confirmed truth for a pair of records: 1 if records i and j are the same provider and 0 if they are not. |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_{ij} | The model's probability that records i and j are the same provider. |

**Hard constraints**

- A merge is never made on fuzzy name similarity alone and needs a strong identifier or steward approval
- Source lineage and survivorship rules are preserved for every field
- Data stewards approve merges and corrections
- Unmerge is supported and audited
- Resolves 5M provider records across 12 systems in a nightly batch
- Match scores are calibrated per attribute

## The approach in one paragraph

Start with deterministic match on national provider ID with a manual duplicate report. Then earn the move to probabilistic record linkage with blocking and calibrated pairwise models, graph-based clustering with transitivity checks, rule-based survivorship per field and a steward workbench with merge, split and audit, and only if it beats the baseline on Pairwise precision and recall at the steward threshold and Cluster purity and completeness after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Identifier agreement | Exact match on strong identifiers with check-digit validation. The strongest evidence of identity. Guard against: validate against the authoritative registry. |
| Add Name and alias similarity | Phonetic and token similarity with alias tables. Handles spelling and transliteration. Guard against: never used alone. |
| Add Affiliation and address overlap | Shared facility, address and specialty. Corroborates identity. Guard against: dated and weighted by recency. |
| Run it as one pipeline | Record intake and standardisation (batch extracts), Blocking and candidate generator (multi-key blocking), Pairwise match model (gradient boosting with calibration), Cluster resolver (graph connected components) and Survivorship rules (field authority rules), with Data steward review and Golden record and audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle two providers with the same name and specialty | Identifier conflict rules that block a merge. |

**Deliberately not doing**

- Provider photo or biography text: irrelevant to identity.
- Record creation order: an artefact of systems.
- Source system name alone: not an identity attribute.

**How the approach is proven**

Prove it offline on Pairwise precision and recall at the steward threshold, Cluster purity and completeness and False-merge rate on a stewarded audit sample using time-ordered splits, then online on "Duplicate provider rate" with "Steward decisions per hour" as the guardrail. Watch for: Evaluating on random pairs instead of hard near-duplicates, Counting transitive merges as correct and Ignoring unmerge cost.

## Baseline and production design

- **Baseline (build this first):** Deterministic match on national provider ID with a manual duplicate report.
- **Production design:** Probabilistic record linkage with blocking and calibrated pairwise models, graph-based clustering with transitivity checks, rule-based survivorship per field and a steward workbench with merge, split and audit.

## Why AI, and why this kind

**Why AI.** Resolve duplicate and conflicting provider identities across credentialing, HR, EHR, scheduling, payer and directory systems and give data stewards ranked candidate merges with provenance. The evidence that separates good from bad outcomes (Identifier agreement, Name and alias similarity, Affiliation and address overlap) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "name similarity" are what teams reach for first, and they fail because common names create false merges that corrupt credentials and billing. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Probabilistic record linkage with blocking and calibrated pairwise models, graph-based clustering with transitivity checks, rule-based survivorship per field and a steward workbench with merge, split and audit.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Identifier agreement, Name and alias similarity, Affiliation and address overlap and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Deterministic match on national provider ID with a manual duplicate report | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Probabilistic record linkage with blocking and calibrated pairwise models, graph-based clustering with transitivity checks, rule-based survivorship per field and a steward workbench with merge, split and audit | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Duplicate provider rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on random pairs instead of hard near-duplicates.
- Evaluation trap: Counting transitive merges as correct.
- Two providers with the same name and specialty: a false merge risk.
- Provider changes name: a true match looks like a mismatch.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
