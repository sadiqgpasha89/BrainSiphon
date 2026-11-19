# Mastery-Based Curriculum Sequencing: use-case brief

> Generated from the blueprint `edtech/mastery-curriculum-sequencing-rl` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Mastery-Based Curriculum Sequencing · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Learn long-horizon curriculum sequences that maximise mastery across a skill graph, accounting for prerequisites and forgetting. The system has to run as a scheduled batch job, inside these limits: Offline learning from logs, Safety (no harmful sequences) and Interpretability for teachers.

**Why it is hard.** The obvious approach is trust the simulator, and it fails because student simulators are crude. The second trap is in "Safety": the real signal is conservative offline RL, while teams usually reach for online exploration on children.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way teacher override rate measures it.

**What success looks like.** Offline: Doubly robust value estimate and Prerequisite violation rate. Online: Mastery gain vs control and Teacher override rate. The launch is judged on "Mastery gain vs control" while "Teacher override rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Learn long-horizon curriculum sequences that maximise mastery across a skill graph, accounting for prerequisites and forgetting.

**Training objective.** `\max_\pi\;\mathbb{E}\!\left[\sum_t\gamma^t\,\Delta\mathrm{mastery}_t\right]\ \text{s.t. prerequisite DAG}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_\pi | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \gamma^t | Discount factor for later improvements. |
| \Delta | The change in mastery at step t. |
| \mathrm{mastery}_t | The learner's mastery of skills; Delta mastery_t is the improvement at step t. |

**Hard constraints**

- Offline learning from logs
- Safety (no harmful sequences)
- Interpretability for teachers
- Simulators are imperfect

## The approach in one paragraph

Start with fixed curriculum order. Then earn the move to conservative offline RL (CQL) with KT-based state, prerequisite masks and teacher-in-the-loop constraints, and only if it beats the baseline on Doubly robust value estimate and Prerequisite violation rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Prerequisite readiness | Mastery of parent skills. Gate. Guard against: dAG. |
| Add Forgetting-adjusted mastery | Decayed mastery. Review timing. Guard against: memory model. |
| Add Expected gain of an activity | Model-estimated gain. Reward. Guard against: kT. |
| Run it as one pipeline | Learner logs (lakehouse), Learner state (KT features), Offline RL trainer (CQL), Safety constraints (prerequisite masks), Policy service (sequencing API) and A/B and holdouts (outcomes), with Teacher review off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle distribution shift when the policy changes behaviour | Pessimism and gradual rollout with monitoring. |

**Deliberately not doing**

- Activity popularity: feedback loop.
- Learner ID: none.

**How the approach is proven**

Prove it offline on Doubly robust value estimate and Prerequisite violation rate using time-ordered splits, then online on "Mastery gain vs control" with "Teacher override rate" as the guardrail. Watch for: Simulator trained on the same logs as the policy and Ignoring confounding by teacher assignment.

## Baseline and production design

- **Baseline (build this first):** Fixed curriculum order.
- **Production design:** Conservative offline RL (CQL) with KT-based state, prerequisite masks and teacher-in-the-loop constraints.

## Why AI, and why this kind

**Why AI.** Learn long-horizon curriculum sequences that maximise mastery across a skill graph, accounting for prerequisites and forgetting. The evidence that separates good from bad outcomes (Prerequisite readiness, Forgetting-adjusted mastery, Expected gain of an activity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "trust the simulator" are what teams reach for first, and they fail because student simulators are crude. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Conservative offline RL (CQL) with KT-based state, prerequisite masks and teacher-in-the-loop constraints.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Prerequisite readiness, Forgetting-adjusted mastery, Expected gain of an activity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed curriculum order | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Conservative offline RL (CQL) with KT-based state, prerequisite masks and teacher-in-the-loop constraints | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mastery gain vs control) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Simulator trained on the same logs as the policy.
- Evaluation trap: Ignoring confounding by teacher assignment.
- Distribution shift when the policy changes behaviour: value estimates wrong.
- Simulator optimism: policy looks better than real.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
