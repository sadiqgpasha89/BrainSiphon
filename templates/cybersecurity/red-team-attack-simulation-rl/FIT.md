# Automated Red-Team Attack Simulation: how well the starter fits

> Generated from the blueprint `cybersecurity/red-team-attack-simulation-rl` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `control` (Sequential control: pacing, throttling and limits under delay and shocks) · **Fit:** exact · **Problem type:** `sequential-control-simulation`

The `control` engine implements this problem type (`sequential-control-simulation`) as it is. Its synthetic data, split, metrics and tests are the ones this use case needs, with your signals mapped onto the engine's features.

## Traps the synthetic data plants

- Feedback delay
- An outage and a surge inside the day
- A hard cap where overshoot is worse than undershoot
- Gains high enough to make the controller jitter

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make

None required for the mechanics. Replace the synthetic generator with your extract, and keep the split, the leakage tests and the gates.
