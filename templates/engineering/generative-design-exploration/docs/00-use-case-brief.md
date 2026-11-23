# Generative Design Exploration: use-case brief

> Generated from the blueprint `engineering/generative-design-exploration` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Generative Design Exploration · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Generate and rank design options against stated loads, materials, cost and manufacturing limits so engineers explore more alternatives, then verify and choose with their own analysis. The system has to run as a scheduled batch job, inside these limits: Options meet every stated constraint before ranking, Engineers verify the chosen option by independent analysis and Each option shows its assumptions.

**Why it is hard.** The obvious approach is a single metric, and it fails because one metric can hide failure modes. The second trap is in "Constraint": the real signal is hard code and manufacturing limits, while teams usually reach for soft preferences.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.8K a month. A mistake is expensive in the way material use measures it.

**What success looks like.** Offline: Constraint satisfaction, Solver agreement on top options and Option diversity. Online: Design iteration time, Material use and Late design changes. The launch is judged on "Design iteration time" while "Material use" must not get worse.

## Objective, loss and constraints

**Business objective.** Generate and rank design options against stated loads, materials, cost and manufacturing limits so engineers explore more alternatives, then verify and choose with their own analysis.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Options meet every stated constraint before ranking
- Engineers verify the chosen option by independent analysis
- Each option shows its assumptions
- Generation of 500 options in 1 hour
- Licensed engineer approves the design

## The approach in one paragraph

Start with engineers sketching a few options by hand and testing the best, because it is the usual practice. Then earn the move to a generative tool that searches within hard constraints, evaluates options with validated solvers and presents ranked designs with assumptions for the engineer to verify, and only if it beats the baseline on Constraint satisfaction and Solver agreement on top options after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Load cases | Forces, moments and conditions. Core. Guard against: from the design brief. |
| Add Material properties | Strength and stiffness. Core. Guard against: from the materials database. |
| Add Manufacturing constraints | Process and tolerance limits. Constraint. Guard against: from standards. |
| Run it as one pipeline | Brief and constraint capture (design tool), Option generation (optimiser), Solver evaluation (finite element tools), Constraint filter (rules), Ranked options (viewer), Engineer verification (independent analysis) and Design record (document system). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle unrealistic geometry | Manufacturability checks. |

**Deliberately not doing**

- Designer name: personal data.
- File name: weak link.
- Colour scheme: irrelevant.

**How the approach is proven**

Prove it offline on Constraint satisfaction, Solver agreement on top options and Option diversity using time-ordered splits, then online on "Design iteration time" with "Material use" as the guardrail. Watch for: A single metric, Soft limits and Unverified options.

## Baseline and production design

- **Baseline (build this first):** Engineers sketching a few options by hand and testing the best, because it is the usual practice.
- **Production design:** A generative tool that searches within hard constraints, evaluates options with validated solvers and presents ranked designs with assumptions for the engineer to verify.

## Why AI, and why this kind

**Why AI.** Generate and rank design options against stated loads, materials, cost and manufacturing limits so engineers explore more alternatives, then verify and choose with their own analysis. The evidence that separates good from bad outcomes (Load cases, Material properties, Manufacturing constraints) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A single metric" are what teams reach for first, and they fail because one metric can hide failure modes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: A generative tool that searches within hard constraints, evaluates options with validated solvers and presents ranked designs with assumptions for the engineer to verify.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Load cases, Material properties, Manufacturing constraints and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Engineers sketching a few options by hand and testing the best, because it is the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A generative tool that searches within hard constraints, evaluates options with validated solvers and presents ranked designs with assumptions for the engineer to verify | chosen | Meets the run-window envelope at $0.040 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Design iteration time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: A single metric.
- Evaluation trap: Soft limits.
- Unrealistic geometry: the option cannot be manufactured.
- Missing load case: an important case is absent.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
