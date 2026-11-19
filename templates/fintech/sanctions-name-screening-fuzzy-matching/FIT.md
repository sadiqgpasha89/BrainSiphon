# Sanctions Name Screening with Fuzzy Matching: how well the starter fits

> Generated from the blueprint `fintech/sanctions-name-screening-fuzzy-matching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

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

- Score "Recall at fixed review volume" and "False-hit rate per 1000 screens" instead of the kit metrics
- Replace the kit's models with the blueprint's: Two-stage: candidate generation with n-gram ANN index then a cross-encoder re-ranker trained on adj…

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Entity resolution and record linkage: Screen payments and customers against sanctions lists with high recall across transliterations while cutting false hits by 60% | Entity resolution and record linkage | match |  |
| label | Whether two records refer to the same real-world entity | A pair of records is positive when both belong to the same hidden true cluster; clusters are connected components over the pairs the model links | match |  |
| validation | Group-separated split, evaluated on pairs and on the resulting clusters | Group-separated split with blocking and transitivity tests and a check on the largest cluster | match |  |
| metrics | Recall at fixed review volume; False-hit rate per 1000 screens | Pair precision and recall, with the size of the largest cluster | adapt | Score "Recall at fixed review volume" and "False-hit rate per 1000 screens" instead of the kit metrics |
| data | Records with shared and near-matching attributes | Records with shared attributes (names, devices, addresses) that link them into groups | match |  |
| model | Baseline: Jaro-Winkler with token-sort and a fixed threshold. Production: Two-stage: candidate generation with n-gram ANN index then a cross-encoder re-ranker trained on adjudicated h… | Rarity-weighted pair features with a pair classifier, clustered by connected components | adapt | Replace the kit's models with the blueprint's: Two-stage: candidate generation with n-gram ANN index then a cross-encoder re-ranker trained on adj… |
| serving | Online decision inside about 100 milliseconds (p99 80 ms) | Offline scripts only: no incremental linking service or merge workflow | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Screening API (gRPC); Name normaliser (transliteration and cleaning); Candidate generation (n-gram ANN); Compliance queue (adjudication): a person in the loop; Adjudication labels (feedback store) | None. Runs locally on synthetic records | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
