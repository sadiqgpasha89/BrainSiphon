# Adaptive Learning Path Recommendation: use-case brief

> Generated from the blueprint `edtech/adaptive-learning-path-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Adaptive Learning Path Recommendation · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend the next activity for each learner that maximises mastery gain while sustaining engagement and respecting prerequisites. The system has to run in under 100 milliseconds, inside these limits: Prerequisite graph, Curriculum standards and 50 ms.

**Why it is hard.** The obvious approach is click-through or time-on-task, and it fails because engagement-optimised paths are entertaining but don't teach. The second trap is in "Structure": the real signal is prerequisite graph constraints, while teams usually reach for pure collaborative filtering.

**Scale and stakes.** At 10 million users this is about 60.0M model-touching events a day, 694 requests per second on average and 4.2K at peak, at an estimated $22.6K a month. A mistake is expensive in the way completion and retention measures it.

**What success looks like.** Offline: Off-policy estimate of learning gain and Prerequisite violation rate. Online: Mastery gain per week and Completion and retention. The launch is judged on "Mastery gain per week" while "Completion and retention" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend the next activity for each learner that maximises mastery gain while sustaining engagement and respecting prerequisites.

**Training objective.** `\max_\pi\;\mathbb{E}\!\left[\sum_t \gamma^t\,\Delta\text{mastery}_t\right]\ \text{s.t. prerequisites}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_\pi | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \gamma^t | Discount factor for later learning gains. |
| \Delta | The change in mastery at step t. |
| \text{mastery}_t | The learner's mastery of skills; Delta mastery_t is how much it improves at step t. |

**Hard constraints**

- Prerequisite graph
- Curriculum standards
- 50 ms
- Explainable to teachers

## The approach in one paragraph

Start with fixed sequence by curriculum with teacher assignments. Then earn the move to contextual bandit over eligible activities using KT mastery estimates, prerequisite masks and learning-gain reward from pre/post assessments, and only if it beats the baseline on Off-policy estimate of learning gain and Prerequisite violation rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Zone of proximal development fit | Probability of success near 70%. Productive difficulty. Guard against: calibrated KT. |
| Add Prerequisite satisfaction | Mastery of required skills. Readiness. Guard against: graph. |
| Add Recent frustration indicators | Quick abandon and repeated failures. Fatigue. Guard against: event features. |
| Run it as one pipeline | Learner state (KT service), Eligible activity filter (prerequisite graph), Candidate scorer (GBDT), Bandit policy (Thompson sampling), Activity delivery (app) and Learning-gain labels (assessments), with Teacher constraints off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle mastery estimates wrong for a learner | Confidence-aware selection and diagnostic checks. |

**Deliberately not doing**

- Content popularity: rich-get-richer.
- Device type: weak.

**How the approach is proven**

Prove it offline on Off-policy estimate of learning gain and Prerequisite violation rate using time-ordered splits, then online on "Mastery gain per week" with "Completion and retention" as the guardrail. Watch for: Optimising engagement instead of learning and Offline evaluation with confounded assignments.

## Baseline and production design

- **Baseline (build this first):** Fixed sequence by curriculum with teacher assignments.
- **Production design:** Contextual bandit over eligible activities using KT mastery estimates, prerequisite masks and learning-gain reward from pre/post assessments.

## Why AI, and why this kind

**Why AI.** Recommend the next activity for each learner that maximises mastery gain while sustaining engagement and respecting prerequisites. The evidence that separates good from bad outcomes (Zone of proximal development fit, Prerequisite satisfaction, Recent frustration indicators) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "click-through or time-on-task" are what teams reach for first, and they fail because engagement-optimised paths are entertaining but don't teach. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Contextual bandit over eligible activities using KT mastery estimates, prerequisite masks and learning-gain reward from pre/post assessments.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Zone of proximal development fit, Prerequisite satisfaction, Recent frustration indicators and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed sequence by curriculum with teacher assignments | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Contextual bandit over eligible activities using KT mastery estimates, prerequisite masks and learning-gain reward from pre/post assessments | chosen | Meets the 80 ms envelope at $0.013 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mastery gain per week) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Optimising engagement instead of learning.
- Evaluation trap: Offline evaluation with confounded assignments.
- Mastery estimates wrong for a learner: path too easy or too hard.
- Teacher assigns different content: system and teacher fight.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
