# Gamification & Reward Optimisation: use-case brief

> Generated from the blueprint `edtech/gamification-reward-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Gamification & Reward Optimisation · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Tune badges, streaks and rewards to increase sustained learning effort without manipulative or anxiety-inducing design. The system has to run as a scheduled batch job, inside these limits: Ethical design for minors, Intrinsic motivation and Fairness.

**Why it is hard.** The obvious approach is daily active users, and it fails because dAU optimisation encourages compulsive design. The second trap is in "Experimentation": the real signal is long holdouts, while teams usually reach for short A/B tests.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 69 at peak, at an estimated $1.7K a month. A mistake is expensive in the way 90-day retention measures it.

**What success looks like.** Offline: Off-policy estimate of learning gain and Guardrail violations. Online: Learning gain per active week and 90-day retention. The launch is judged on "Learning gain per active week" while "90-day retention" must not get worse.

## Objective, loss and constraints

**Business objective.** Tune badges, streaks and rewards to increase sustained learning effort without manipulative or anxiety-inducing design.

**Training objective.** `\max_\pi\;\mathbb{E}\!\left[\sum_t\gamma^t(\text{learning minutes}_t-\kappa\,\text{anxiety signals}_t)\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_\pi | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \gamma^t | Discount factor for later steps. |
| \text{learning minutes}_t | Minutes the learner spends learning at step t. |
| \kappa | How heavily anxiety signals are penalised compared with learning time. |
| \text{anxiety signals}_t | Signs that rewards are making the learner anxious, such as rushed or abandoned sessions. |

**Hard constraints**

- Ethical design for minors
- Intrinsic motivation
- Fairness
- Long-term retention

## The approach in one paragraph

Start with fixed points per activity and streak bonuses. Then earn the move to contextual bandit over reward schemes with wellbeing guardrails, long holdouts and learning-gain reward, and only if it beats the baseline on Off-policy estimate of learning gain and Guardrail violations after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Intrinsic engagement proxy | Voluntary extra practice. Healthy motivation. Guard against: definition. |
| Add Streak anxiety indicators | Drop-off after breaking a streak. Harm. Guard against: event patterns. |
| Add Learning-gain surrogate | Mastery change. Outcome. Guard against: kT. |
| Run it as one pipeline | Activity events (stream), Learner features (store), Reward policy (bandit), Wellbeing guardrail (constraints), Reward delivery (app), Experiment platform (long holdouts) and Learning outcomes (assessments). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle rewards crowd out intrinsic motivation | Fade rewards and measure post-removal behaviour. |

**Deliberately not doing**

- Badge count: vanity metric.
- Session length: not learning.

**How the approach is proven**

Prove it offline on Off-policy estimate of learning gain and Guardrail violations using time-ordered splits, then online on "Learning gain per active week" with "90-day retention" as the guardrail. Watch for: Rewarding time-on-app and Short experiments only.

## Baseline and production design

- **Baseline (build this first):** Fixed points per activity and streak bonuses.
- **Production design:** Contextual bandit over reward schemes with wellbeing guardrails, long holdouts and learning-gain reward.

## Why AI, and why this kind

**Why AI.** Tune badges, streaks and rewards to increase sustained learning effort without manipulative or anxiety-inducing design. The evidence that separates good from bad outcomes (Intrinsic engagement proxy, Streak anxiety indicators, Learning-gain surrogate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "daily active users" are what teams reach for first, and they fail because DAU optimisation encourages compulsive design. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Contextual bandit over reward schemes with wellbeing guardrails, long holdouts and learning-gain reward.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Intrinsic engagement proxy, Streak anxiety indicators, Learning-gain surrogate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed points per activity and streak bonuses | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Contextual bandit over reward schemes with wellbeing guardrails, long holdouts and learning-gain reward | chosen | Meets the run-window envelope at $0.0094 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Learning gain per active week) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Rewarding time-on-app.
- Evaluation trap: Short experiments only.
- Rewards crowd out intrinsic motivation: engagement drops when rewards stop.
- Streak break leads to churn: learners who lose a streak give up entirely, creating a visible drop-off spike.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
