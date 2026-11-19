# Feature-Flag Progressive Rollout with Guardrails: use-case brief

> Generated from the blueprint `saas/feature-flag-rollout-safety` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Feature-Flag Progressive Rollout with Guardrails · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Automatically ramp feature flags while monitoring guardrail metrics, rolling back at the first statistically credible harm. The system has to run interactively, within a few seconds, inside these limits: Guardrail metrics across many teams, Low false rollbacks and Interaction between flags.

**Why it is hard.** The obvious approach is peek at p-values, and it fails because peeking inflates false rollback rates. The second trap is in "Interaction": the real signal is detect interference between concurrent flags, while teams usually reach for evaluate flags independently.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.6K a month. A mistake is expensive in the way rollout time measures it.

**What success looks like.** Offline: False rollback rate and detection power in simulation and Time to full ramp. Online: Bad-change blast radius and Rollout time. The launch is judged on "Bad-change blast radius" while "Rollout time" must not get worse.

## Objective, loss and constraints

**Business objective.** Automatically ramp feature flags while monitoring guardrail metrics, rolling back at the first statistically credible harm.

**Training objective.** `\max\;\text{ramp speed}\ \text{s.t. }\Pr(\text{harm}>\delta)\le\alpha\ \text{(sequential testing)}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \text{ramp speed} | How quickly the feature is rolled out to more users, which the policy tries to maximise. |
| \Pr | Probability of the event written inside the brackets. |
| \text{harm} | The measured harm of the new feature, such as higher errors. |
| \delta | The largest harm that is acceptable. |
| \alpha | The acceptable probability of exceeding that harm. |

**Hard constraints**

- Guardrail metrics across many teams
- Low false rollbacks
- Interaction between flags
- Audit trail

## The approach in one paragraph

Start with manual percentage increases by engineers. Then earn the move to automated ramp controller using sequential tests on guardrail metrics with SRM checks and interaction detection, and only if it beats the baseline on False rollback rate and detection power in simulation and Time to full ramp after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Guardrail metric deltas | Error rate, latency, conversion deltas. Harm. Guard against: metric definitions. |
| Add Exposure balance | SRM check on exposure. Data quality. Guard against: assignment. |
| Add Concurrent-flag overlap | Flags active on same users. Interaction. Guard against: registry. |
| Run it as one pipeline | Flag service (SDK), Exposure logging (events), Metric computation (stream), Sequential tester (always-valid), Ramp controller (policy), Auto rollback (flag service) and Rollout history (audit). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle metric pipeline delay | Fast proxy metrics and delay-aware thresholds. |

**Deliberately not doing**

- Flag name: none.
- Owner: none.

**How the approach is proven**

Prove it offline on False rollback rate and detection power in simulation and Time to full ramp using time-ordered splits, then online on "Bad-change blast radius" with "Rollout time" as the guardrail. Watch for: Peeking without correction and Single-flag analysis.

## Baseline and production design

- **Baseline (build this first):** Manual percentage increases by engineers.
- **Production design:** Automated ramp controller using sequential tests on guardrail metrics with SRM checks and interaction detection.

## Why AI, and why this kind

**Why AI.** Automatically ramp feature flags while monitoring guardrail metrics, rolling back at the first statistically credible harm. The evidence that separates good from bad outcomes (Guardrail metric deltas, Exposure balance, Concurrent-flag overlap) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "peek at p-values" are what teams reach for first, and they fail because peeking inflates false rollback rates. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Automated ramp controller using sequential tests on guardrail metrics with SRM checks and interaction detection.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Guardrail metric deltas, Exposure balance, Concurrent-flag overlap and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual percentage increases by engineers | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Automated ramp controller using sequential tests on guardrail metrics with SRM checks and interaction detection | chosen | Meets the 2500 ms envelope at $0.041 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Bad-change blast radius) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Peeking without correction.
- Evaluation trap: Single-flag analysis.
- Metric pipeline delay: harm detected late.
- Novelty effect early in ramp: false positives or negatives.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
