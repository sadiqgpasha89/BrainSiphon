# Cross-Device Graph for Measurement: how well the starter fits

> Generated from the blueprint `adtech/cross-device-graph` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `graph` (Entity resolution and link clustering) · **Fit:** exact · **Problem type:** `entity-resolution`

The `graph` engine implements this problem type (`entity-resolution`) as it is. Its synthetic data, split, metrics and tests are the ones this use case needs, with your signals mapped onto the engine's features.

## Traps the synthetic data plants

- Linking everything that shares any value
- Ignoring how rare a shared value is
- Evaluating on clusters the model has seen
- Forgetting that clustering is transitive

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make

None required for the mechanics. Replace the synthetic generator with your extract, and keep the split, the leakage tests and the gates.

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Entity resolution and record linkage: Link devices belonging to the same person or household to unify reach, frequency and attribution measurement | Entity resolution and record linkage | match |  |
| label | Whether two records refer to the same real-world entity | A pair of records is positive when both belong to the same hidden true cluster; clusters are connected components over the pairs the model links | match |  |
| validation | Group-separated split, evaluated on pairs and on the resulting clusters | Group-separated split with blocking and transitivity tests and a check on the largest cluster | match |  |
| metrics | Link precision and recall on panel truth; Reach estimation error | Pair precision and recall, with the size of the largest cluster | match |  |
| data | Records with shared and near-matching attributes | Records with shared attributes (names, devices, addresses) that link them into groups | match |  |
| model | Baseline: IP-matching households. Production: Link prediction GNN with deterministic anchors, calibrated confidence and cluster-size constraints | Rarity-weighted pair features with a pair classifier, clustered by connected components | match |  |
| serving | Scheduled batch run | Offline scripts only: no incremental linking service or merge workflow | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Device event logs (lake); Candidate generation (blocking); Graph API (service); Quality audit (ground-truth panels) | None. Runs locally on synthetic records | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
