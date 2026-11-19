# Pricing & Packaging Optimisation: how well the starter fits

> Generated from the blueprint `saas/pricing-and-packaging-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `bandit` (Decisions from logged data with off-policy evaluation) · **Fit:** adaptable · **Problem type:** `off-policy-decisioning`

The `bandit` engine implements a neighbouring problem. This use case is `off-policy-decisioning`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter.

## Traps the synthetic data plants

- Evaluating a new policy on the rows where it agrees with the old one
- Not logging propensities
- Trusting the highest-variance estimator
- Shipping a policy that only looks better offline

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make before you rely on it

- Replace the kit's models with the blueprint's: Hierarchical choice model combining conjoint, test and usage data with segment-level optimisation a…

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Decisions from logged data (bandits, off-policy evaluation): Estimate willingness-to-pay and feature value to design plans, limits and price points that maximise revenue and satisfaction | Decisions from logged data (bandits, off-policy evaluation) | match |  |
| label | The best action per context, learned from logged decisions with known selection probabilities | The reward is 1 if the chosen action succeeded and 0 otherwise; only the chosen action's reward is observed and its selection probability is logged | match |  |
| validation | Offline off-policy estimators checked against randomised traffic | Logged decisions with propensities; offline estimators compared with the hidden true value of each policy | match |  |
| metrics | Backtested revenue under counterfactual prices; Choice model calibration | Policy value and the error of four off-policy estimators | match |  |
| data | Logged context, action, propensity and reward | Logged context, action, propensity and reward rows | match |  |
| model | Baseline: Competitor-based and cost-plus pricing. Production: Hierarchical choice model combining conjoint, test and usage data with segment-level optimisation and grandfa… | A reward model and a learned policy against the best constant action | adapt | Replace the kit's models with the blueprint's: Hierarchical choice model combining conjoint, test and usage data with segment-level optimisation a… |
| serving | Scheduled batch run | Offline scripts only: no decision service, exploration controller or live experiment | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Conjoint and test results (research) | None. Runs locally on synthetic logged decisions | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
