# Sepsis Early-Warning System: how well the starter fits

> Generated from the blueprint `healthcare/sepsis-early-warning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `authored` (Hand-written starter for this use case) · **Fit:** hand-written for this use case · **Problem type:** `time-series-anomaly-detection`

This pack ships a hand-written starter for exactly this use case, with its own data generator, tests and contracts. It is the most complete kind of pack in this repository.

## Traps the synthetic data plants

_none listed_

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make

None required for the mechanics. Replace the synthetic generator with your extract, and keep the split, the leakage tests and the gates.
