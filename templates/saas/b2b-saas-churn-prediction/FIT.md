# B2B SaaS Churn Prediction: how well the starter fits

> Generated from the blueprint `saas/b2b-saas-churn-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `survival` (Time-to-event with censoring) · **Fit:** exact · **Problem type:** `survival-time-to-event`

The `survival` engine implements this problem type (`survival-time-to-event`) as it is. Its synthetic data, split, metrics and tests are the ones this use case needs, with your signals mapped onto the engine's features.

## Traps the synthetic data plants

- Administrative censoring that grows for recent cohorts
- Drop-out before the event
- Treating censored subjects as non-events

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make

None required for the mechanics. Replace the synthetic generator with your extract, and keep the split, the leakage tests and the gates.
