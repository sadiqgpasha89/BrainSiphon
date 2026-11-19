# Placement Test & Cold-Start Onboarding: use-case brief

> Generated from the blueprint `edtech/placement-test-and-cold-start-onboarding` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Placement Test & Cold-Start Onboarding · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate a new learner's level in a few questions to place them in the right starting content and initialise the learner model. The system has to run in under 100 milliseconds, inside these limits: Under 10 questions, Frustration risk and Multiple skills.

**Why it is hard.** The obvious approach is fixed placement form, and it fails because fixed forms waste questions. The second trap is in "Prior": the real signal is use registration context as a prior, while teams usually reach for start from zero knowledge.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $3.6K a month. A mistake is expensive in the way early mastery gain measures it.

**What success looks like.** Offline: Placement accuracy vs full test and Questions to target precision. Online: Day-7 retention and Early mastery gain. The launch is judged on "Day-7 retention" while "Early mastery gain" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate a new learner's level in a few questions to place them in the right starting content and initialise the learner model.

**Training objective.** `\min\;\mathbb{E}\!\left[(\hat\theta-\theta)^2\right]\ \text{subject to a question budget}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \hat{\theta} | The estimated model parameters. |
| \theta | The learner's true ability; the hat is the estimate, which should be accurate with as few questions as possible. |

**Hard constraints**

- Under 10 questions
- Frustration risk
- Multiple skills
- Cheating resistance

## The approach in one paragraph

Start with fixed 20-question placement test. Then earn the move to bayesian adaptive placement with IRT item bank, informative priors and early stopping, feeding KT initialisation, and only if it beats the baseline on Placement accuracy vs full test and Questions to target precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Expected information gain per item | EIG of next question. Selection. Guard against: iRT. |
| Add Prior from age and grade | Demographic prior. Initial ability. Guard against: consent. |
| Add Response time pattern | Time per response. Guessing. Guard against: timing. |
| Run it as one pipeline | Registration data (app), Prior builder (priors), Item selector (EIG), Ability estimator (Bayesian update), Stopping rule (precision), Learner model init (KT) and Placement outcome (analytics). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle learners guess randomly | Guessing models and response-time filters. |

**Deliberately not doing**

- Device type: weak.
- Time of day: weak.

**How the approach is proven**

Prove it offline on Placement accuracy vs full test and Questions to target precision using time-ordered splits, then online on "Day-7 retention" with "Early mastery gain" as the guardrail. Watch for: Evaluating on motivated volunteers and Ignoring guessing.

## Baseline and production design

- **Baseline (build this first):** Fixed 20-question placement test.
- **Production design:** Bayesian adaptive placement with IRT item bank, informative priors and early stopping, feeding KT initialisation.

## Why AI, and why this kind

**Why AI.** Estimate a new learner's level in a few questions to place them in the right starting content and initialise the learner model. The evidence that separates good from bad outcomes (Expected information gain per item, Prior from age and grade, Response time pattern) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fixed placement form" are what teams reach for first, and they fail because fixed forms waste questions. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Bayesian adaptive placement with IRT item bank, informative priors and early stopping, feeding KT initialisation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Expected information gain per item, Prior from age and grade, Response time pattern and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed 20-question placement test | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Bayesian adaptive placement with IRT item bank, informative priors and early stopping, feeding KT initialisation | chosen | Meets the 80 ms envelope at $0.133 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Day-7 retention) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on motivated volunteers.
- Evaluation trap: Ignoring guessing.
- Learners guess randomly: ability overestimated.
- Anxious learners abandon the test: lost onboarding.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
