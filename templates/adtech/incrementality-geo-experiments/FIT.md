# Geo Experiments & Incrementality Testing: how well the starter fits

> Generated from the blueprint `adtech/incrementality-geo-experiments` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `uplift` (Treatment effect and causal measurement with known ground truth) · **Fit:** adaptable · **Problem type:** `causal-measurement`

The `uplift` engine implements a neighbouring problem. This use case is `causal-measurement`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter.

## Traps the synthetic data plants

- Treatment assigned on a variable that also drives the outcome
- A randomised holdout to evaluate honestly
- Heterogeneous effect including a harmed group

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make before you rely on it

None required for the mechanics. Replace the synthetic generator with your extract, and keep the split, the leakage tests and the gates.
