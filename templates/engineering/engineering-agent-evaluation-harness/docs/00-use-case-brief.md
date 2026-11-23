# Engineering Agent Evaluation Harness: use-case brief

> Generated from the blueprint `engineering/engineering-agent-evaluation-harness` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Engineering Agent Evaluation Harness · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Evaluate engineering assistants and agents on real past questions, reviews and calculations with expert answers, safety checks and cost so changes are judged on evidence before rollout. The system has to run as a scheduled batch job, inside these limits: Tasks built from real past work with expert-approved answers, Results by discipline and task type and Calculation correctness checked by tools.

**Why it is hard.** The obvious approach is model-written answers, and it fails because the model may grade itself wrongly. The second trap is in "Metrics": the real signal is correctness, citation, safety and cost, while teams usually reach for fluency.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $3.4K a month. A mistake is expensive in the way cost per solved task measures it.

**What success looks like.** Offline: Agreement of harness scores with later outcomes, Variance across runs and Task coverage. Online: Project regressions caught before rollout, Cost per solved task and Agent changes shipped with evidence. The launch is judged on "Project regressions caught before rollout" while "Cost per solved task" must not get worse.

## Objective, loss and constraints

**Business objective.** Evaluate engineering assistants and agents on real past questions, reviews and calculations with expert answers, safety checks and cost so changes are judged on evidence before rollout.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| x | The input features describing one example (what the model sees). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Tasks built from real past work with expert-approved answers
- Results by discipline and task type
- Calculation correctness checked by tools
- Re-run on every agent change
- 2K tasks

## The approach in one paragraph

Start with spot checks by senior engineers, because they are the common evidence. Then earn the move to a harness that replays curated tasks in a sandbox, grades with expert answers and tool checks, tracks safety and cost and gates rollout on regression thresholds, and only if it beats the baseline on Agreement of harness scores with later outcomes and Variance across runs after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Answer correctness | Match to expert answer. Core. Guard against: from the harness. |
| Add Calculation verification | Tool recomputation result. Core. Guard against: from calculators. |
| Add Citation accuracy | Clause and edition correctness. Quality. Guard against: from the standards library. |
| Run it as one pipeline | Task curation (past project work), Project sandbox run (agent platform), Automated grading (rules and calculators), Expert sampling (review tool), Safety check (gateway logs) and Project task refresh (quarterly), with Report and gate off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle stale standards | Edition tagging. |

**Deliberately not doing**

- Task author: irrelevant.
- Run id: an identifier.
- Model name alone: needs outcome data.

**How the approach is proven**

Prove it offline on Agreement of harness scores with later outcomes, Variance across runs and Task coverage using time-ordered splits, then online on "Project regressions caught before rollout" with "Cost per solved task" as the guardrail. Watch for: Model-written answers as truth, Fluency as quality and Textbook-only tasks.

## Baseline and production design

- **Baseline (build this first):** Spot checks by senior engineers, because they are the common evidence.
- **Production design:** A harness that replays curated tasks in a sandbox, grades with expert answers and tool checks, tracks safety and cost and gates rollout on regression thresholds.

## Why AI, and why this kind

**Why AI.** Evaluate engineering assistants and agents on real past questions, reviews and calculations with expert answers, safety checks and cost so changes are judged on evidence before rollout. The evidence that separates good from bad outcomes (Answer correctness, Calculation verification, Citation accuracy) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model-written answers" are what teams reach for first, and they fail because the model may grade itself wrongly. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A harness that replays curated tasks in a sandbox, grades with expert answers and tool checks, tracks safety and cost and gates rollout on regression thresholds.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Answer correctness, Calculation verification, Citation accuracy and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Spot checks by senior engineers, because they are the common evidence | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A harness that replays curated tasks in a sandbox, grades with expert answers and tool checks, tracks safety and cost and gates rollout on regression thresholds | chosen | Meets the run-window envelope at $0.038 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Project regressions caught before rollout) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Model-written answers as truth.
- Evaluation trap: Fluency as quality.
- Stale standards: tasks use old code editions.
- Non-determinism: results vary across runs.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
