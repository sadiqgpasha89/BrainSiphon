# Personalised Onboarding Paths: use-case brief

> Generated from the blueprint `saas/personalized-onboarding-paths` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Personalised Onboarding Paths · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Tailor onboarding steps and templates to each new user or team to reach first value faster. The system has to run in under 100 milliseconds, inside these limits: Quick decisions per step, Role and goal context and Experimentation.

**Why it is hard.** The obvious approach is checklist completion, and it fails because completed steps may not equal value. The second trap is in "Context": the real signal is role and use-case conditioning, while teams usually reach for one-size onboarding.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $12.3K a month. A mistake is expensive in the way week-4 retention measures it.

**What success looks like.** Offline: Off-policy value for activation and Template recommendation NDCG. Online: Time to first value and Week-4 retention. The launch is judged on "Time to first value" while "Week-4 retention" must not get worse.

## Objective, loss and constraints

**Business objective.** Tailor onboarding steps and templates to each new user or team to reach first value faster.

**Training objective.** `\max_\pi\;\mathbb{E}\!\left[\sum_t\gamma^t\,\mathbb{1}[\text{activation}]\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_\pi | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \gamma^t | Discount factor: earlier activation is worth more. |
| \mathbb{1} | Indicator: equals 1 when the condition in the brackets is true and 0 otherwise. |
| \text{activation} | Whether the new user reaches the activation milestone. |

**Hard constraints**

- Quick decisions per step
- Role and goal context
- Experimentation
- Avoid overwhelming users

## The approach in one paragraph

Start with single onboarding checklist for everyone. Then earn the move to contextual bandit selecting next-best onboarding step and template, with activation reward and holdouts, and only if it beats the baseline on Off-policy value for activation and Template recommendation NDCG after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Declared role and goal | Survey answers. Personalisation. Guard against: consent. |
| Add Early action sequence | First-session actions. Intent. Guard against: window. |
| Add Template similarity to successful teams | Embedding similarity. Recommendation. Guard against: data. |
| Run it as one pipeline | Signup context (app), User features (feature store), Candidate steps (catalogue), Bandit selector (Thompson), Onboarding UI (in-app), Experiment platform (holdout) and Activation labels (warehouse). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle cold-start users with no context | Short intake survey and contextual priors. |

**Deliberately not doing**

- Referrer: weak.
- Browser: weak.

**How the approach is proven**

Prove it offline on Off-policy value for activation and Template recommendation NDCG using time-ordered splits, then online on "Time to first value" with "Week-4 retention" as the guardrail. Watch for: Rewarding checklist completion and Non-random step exposure.

## Baseline and production design

- **Baseline (build this first):** Single onboarding checklist for everyone.
- **Production design:** Contextual bandit selecting next-best onboarding step and template, with activation reward and holdouts.

## Why AI, and why this kind

**Why AI.** Tailor onboarding steps and templates to each new user or team to reach first value faster. The evidence that separates good from bad outcomes (Declared role and goal, Early action sequence, Template similarity to successful teams) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "checklist completion" are what teams reach for first, and they fail because completed steps may not equal value. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Contextual bandit selecting next-best onboarding step and template, with activation reward and holdouts.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Declared role and goal, Early action sequence, Template similarity to successful teams and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Single onboarding checklist for everyone | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Contextual bandit selecting next-best onboarding step and template, with activation reward and holdouts | chosen | Meets the 80 ms envelope at $0.136 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to first value) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Rewarding checklist completion.
- Evaluation trap: Non-random step exposure.
- Cold-start users with no context: generic choices.
- Overloaded onboarding: too many onboarding steps overwhelm new users and they bounce before reaching value.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
