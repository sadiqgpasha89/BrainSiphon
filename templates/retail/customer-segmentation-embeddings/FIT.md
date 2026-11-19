# Behavioural Customer Segmentation with Embeddings: how well the starter fits

> Generated from the blueprint `retail/customer-segmentation-embeddings` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `cluster` (Clustering and segmentation with scaling, outliers and drift) · **Fit:** exact · **Problem type:** `clustering-segmentation`

The `cluster` engine implements this problem type (`clustering-segmentation`) as it is. Its synthetic data, split, metrics and tests are the ones this use case needs, with your signals mapped onto the engine's features.

## Traps the synthetic data plants

- One feature in thousands dwarfing the rest
- Outliers that capture a cluster
- Overlapping segments, so silhouette picks a coarse k
- A segment mix that shifts in the last period

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make

None required for the mechanics. Replace the synthetic generator with your extract, and keep the split, the leakage tests and the gates.
