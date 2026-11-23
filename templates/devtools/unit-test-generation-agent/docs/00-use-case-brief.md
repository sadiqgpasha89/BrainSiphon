# Unit Test Generation Agent: use-case brief

> Generated from the blueprint `devtools/unit-test-generation-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Unit Test Generation Agent · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Generate unit tests for untested code that compile, pass, increase coverage and catch real changes in behaviour, then offer them in a pull request for engineers. The system has to run as a scheduled batch job, inside these limits: Tests must compile, pass and fail when behaviour is broken, Engineers review each pull request and Agent runs in a sandbox.

**Why it is hard.** The obvious approach is coverage numbers, and it fails because coverage can be gamed by empty assertions. The second trap is in "Review": the real signal is human review of intent, while teams usually reach for auto-merge.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $3.4K a month. A mistake is expensive in the way escaped defects measures it.

**What success looks like.** Offline: Mutation score of generated tests, Pass and stability rate and Reviewer acceptance. Online: Coverage of critical code, Escaped defects and Test maintenance cost. The launch is judged on "Coverage of critical code" while "Escaped defects" must not get worse.

## Objective, loss and constraints

**Business objective.** Generate unit tests for untested code that compile, pass, increase coverage and catch real changes in behaviour, then offer them in a pull request for engineers.

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

- Tests must compile, pass and fail when behaviour is broken
- Engineers review each pull request
- Agent runs in a sandbox
- No tests that only assert the current output blindly
- 3K repositories

## The approach in one paragraph

Start with developers writing tests by hand and template generators, because they are the standard methods. Then earn the move to an agent that proposes tests, runs them in a sandbox, checks mutation score and flakiness and opens a pull request with the evidence, and only if it beats the baseline on Mutation score of generated tests and Pass and stability rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Coverage gap | Uncovered branches. Target. Guard against: from coverage tools. |
| Add Mutation score | Share of injected faults caught. Quality. Guard against: from mutation testing. |
| Add Compile and run result | Pass or fail. Gate. Guard against: from the sandbox. |
| Run it as one pipeline | Coverage gap analysis (coverage tools), Test drafting (coding agent), Compile and run in sandbox (sandbox), Mutation check (mutation tool), Pull request (code host) and Flake monitoring (CI), with Engineer review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle hidden dependencies | Fakes or skip with a note. |

**Deliberately not doing**

- Developer name: personal data.
- File name wording: weak link.
- Commit time: irrelevant.

**How the approach is proven**

Prove it offline on Mutation score of generated tests, Pass and stability rate and Reviewer acceptance using time-ordered splits, then online on "Coverage of critical code" with "Escaped defects" as the guardrail. Watch for: Coverage as the goal, Auto-merge and Assertions of current output only.

## Baseline and production design

- **Baseline (build this first):** Developers writing tests by hand and template generators, because they are the standard methods.
- **Production design:** An agent that proposes tests, runs them in a sandbox, checks mutation score and flakiness and opens a pull request with the evidence.

## Why AI, and why this kind

**Why AI.** Generate unit tests for untested code that compile, pass, increase coverage and catch real changes in behaviour, then offer them in a pull request for engineers. The evidence that separates good from bad outcomes (Coverage gap, Mutation score, Compile and run result) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "coverage numbers" are what teams reach for first, and they fail because coverage can be gamed by empty assertions. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: An agent that proposes tests, runs them in a sandbox, checks mutation score and flakiness and opens a pull request with the evidence.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Coverage gap, Mutation score, Compile and run result and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Developers writing tests by hand and template generators, because they are the standard methods | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An agent that proposes tests, runs them in a sandbox, checks mutation score and flakiness and opens a pull request with the evidence | chosen | Meets the run-window envelope at $0.038 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Coverage of critical code) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Coverage as the goal.
- Evaluation trap: Auto-merge.
- Hidden dependencies: tests need a database.
- Tests that mirror bugs: they assert wrong behaviour.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
