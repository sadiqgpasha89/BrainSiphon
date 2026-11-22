# Provider Data Quality & Entity Resolution: how well the starter fits

> Generated from the blueprint `healthcare/provider-data-quality-entity-resolution` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `graph` (Entity resolution and link clustering) · **Fit:** adaptable · **Problem type:** `entity-resolution`

The `graph` engine implements a neighbouring problem. This use case is `entity-resolution`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter.

## Traps the synthetic data plants

- Linking everything that shares any value
- Ignoring how rare a shared value is
- Evaluating on clusters the model has seen
- Forgetting that clustering is transitive

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make before you rely on it

- Score "Pairwise precision and recall at the steward threshold" and "Cluster purity and completeness" instead of the kit metrics

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Entity resolution and record linkage: Resolve duplicate and conflicting provider identities across credentialing, HR, EHR, scheduling, payer and directory systems and give data stewards ranked candidate merg… | Entity resolution and record linkage | match |  |
| label | Whether two records refer to the same real-world entity | A pair of records is positive when both belong to the same hidden true cluster; clusters are connected components over the pairs the model links | match |  |
| validation | Group-separated split, evaluated on pairs and on the resulting clusters | Group-separated split with blocking and transitivity tests and a check on the largest cluster | match |  |
| metrics | Pairwise precision and recall at the steward threshold; Cluster purity and completeness; False-merge rate on a stewarded audit sample | Pair precision and recall, with the size of the largest cluster | adapt | Score "Pairwise precision and recall at the steward threshold" and "Cluster purity and completeness" instead of the kit metrics |
| data | Records with shared and near-matching attributes | Records with shared attributes (names, devices, addresses) that link them into groups | match |  |
| model | Baseline: Deterministic match on national provider ID with a manual duplicate report. Production: Probabilistic record linkage with blocking and calibrated pairwise models, graph-based clustering with transi… | Rarity-weighted pair features with a pair classifier, clustered by connected components | match |  |
| serving | Scheduled batch run | Offline scripts only: no incremental linking service or merge workflow | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Record intake and standardisation (batch extracts); Blocking and candidate generator (multi-key blocking); Data steward review (human): a person in the loop; Golden record and audit log (master data hub) | None. Runs locally on synthetic records | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
