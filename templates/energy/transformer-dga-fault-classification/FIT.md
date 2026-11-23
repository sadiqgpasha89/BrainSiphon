# Transformer DGA Fault Classification: how well the starter fits

> Generated from the blueprint `energy/transformer-dga-fault-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `multiclass` (Multi-class classification with group leakage and a drifting prior) · **Fit:** exact · **Problem type:** `multiclass-classification`

The `multiclass` engine implements this problem type (`multiclass-classification`) as it is. Its synthetic data, split, metrics and tests are the ones this use case needs, with your signals mapped onto the engine's features.

## Traps the synthetic data plants

- Repeat entities on both sides of a random split
- A confusable class pair with label noise
- A rare class that becomes common

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make

None required for the mechanics. Replace the synthetic generator with your extract, and keep the split, the leakage tests and the gates.
