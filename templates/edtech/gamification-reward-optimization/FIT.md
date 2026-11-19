# Gamification & Reward Optimisation: how well the starter fits

> Generated from the blueprint `edtech/gamification-reward-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `bandit` (Decisions from logged data with off-policy evaluation) · **Fit:** exact · **Problem type:** `off-policy-decisioning`

The `bandit` engine implements this problem type (`off-policy-decisioning`) as it is. Its synthetic data, split, metrics and tests are the ones this use case needs, with your signals mapped onto the engine's features.

## Traps the synthetic data plants

- Evaluating a new policy on the rows where it agrees with the old one
- Not logging propensities
- Trusting the highest-variance estimator
- Shipping a policy that only looks better offline

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make

None required for the mechanics. Replace the synthetic generator with your extract, and keep the split, the leakage tests and the gates.

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Decisions from logged data (bandits, off-policy evaluation): Tune badges, streaks and rewards to increase sustained learning effort without manipulative or anxiety-inducing design | Decisions from logged data (bandits, off-policy evaluation) | match |  |
| label | The best action per context, learned from logged decisions with known selection probabilities | The reward is 1 if the chosen action succeeded and 0 otherwise; only the chosen action's reward is observed and its selection probability is logged | match |  |
| validation | Offline off-policy estimators checked against randomised traffic | Logged decisions with propensities; offline estimators compared with the hidden true value of each policy | match |  |
| metrics | Off-policy estimate of learning gain; Guardrail violations | Policy value and the error of four off-policy estimators | match |  |
| data | Logged context, action, propensity and reward | Logged context, action, propensity and reward rows | match |  |
| model | Baseline: Fixed points per activity and streak bonuses. Production: Contextual bandit over reward schemes with wellbeing guardrails, long holdouts and learning-gain reward | A reward model and a learned policy against the best constant action | match |  |
| serving | Scheduled batch run | Offline scripts only: no decision service, exploration controller or live experiment | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Activity events (stream); Learner features (store) | None. Runs locally on synthetic logged decisions | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
