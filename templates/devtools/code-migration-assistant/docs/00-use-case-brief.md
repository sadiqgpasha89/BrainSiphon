# Code Migration and Upgrade Assistant: use-case brief

> Generated from the blueprint `devtools/code-migration-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Code Migration and Upgrade Assistant · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Plan and carry out framework, language and library upgrades across many repositories by proposing small verified changes that pass the tests, for owners to review and merge. The system has to run as a scheduled batch job, inside these limits: Each change is a pull request with passing tests, Owners approve every merge and The agent works in a sandbox with a short-lived token.

**Why it is hard.** The obvious approach is generated diff alone, and it fails because plausible code can break behaviour. The second trap is in "Scope": the real signal is small incremental changes, while teams usually reach for one huge rewrite.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 69 at peak, at an estimated $6.6K a month. A mistake is expensive in the way engineer hours per upgrade measures it.

**What success looks like.** Offline: Pass rate of generated changes, Review rejection rate and Regression escapes. Online: Repositories upgraded, Engineer hours per upgrade and Incidents from upgrades. The launch is judged on "Repositories upgraded" while "Engineer hours per upgrade" must not get worse.

## Objective, loss and constraints

**Business objective.** Plan and carry out framework, language and library upgrades across many repositories by proposing small verified changes that pass the tests, for owners to review and merge.

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

- Each change is a pull request with passing tests
- Owners approve every merge
- The agent works in a sandbox with a short-lived token
- Rollback instructions in every change
- 2K repositories

## The approach in one paragraph

Start with codemods and manual upgrade tickets, because they are the common approach. Then earn the move to an agent that analyses usage, applies codemods and model-written edits in a sandbox, runs the test suite, retries on failure and opens a pull request with evidence for the owner, and only if it beats the baseline on Pass rate of generated changes and Review rejection rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Deprecated API usage | Calls to removed or deprecated APIs. Work list. Guard against: from static analysis. |
| Add Test coverage of affected code | Coverage around the change. Risk. Guard against: from coverage reports. |
| Add Build and test result | Pass or fail after the change. Gate. Guard against: from CI. |
| Run it as one pipeline | Usage analysis (static analysis), Change plan (LLM and rules), Edit and build in sandbox (coding agent), Test run (CI), Pull request with evidence (code host) and Rollout tracking (dashboard), with Owner review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle low test coverage | Block and ask for tests first. |

**Deliberately not doing**

- Author name: personal data.
- Commit time: irrelevant.
- Branch name: an artefact.

**How the approach is proven**

Prove it offline on Pass rate of generated changes, Review rejection rate and Regression escapes using time-ordered splits, then online on "Repositories upgraded" with "Engineer hours per upgrade" as the guardrail. Watch for: Automatic merge, One large rewrite and Skipping tests.

## Baseline and production design

- **Baseline (build this first):** Codemods and manual upgrade tickets, because they are the common approach.
- **Production design:** An agent that analyses usage, applies codemods and model-written edits in a sandbox, runs the test suite, retries on failure and opens a pull request with evidence for the owner.

## Why AI, and why this kind

**Why AI.** Plan and carry out framework, language and library upgrades across many repositories by proposing small verified changes that pass the tests, for owners to review and merge. The evidence that separates good from bad outcomes (Deprecated API usage, Test coverage of affected code, Build and test result) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "generated diff alone" are what teams reach for first, and they fail because plausible code can break behaviour. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: An agent that analyses usage, applies codemods and model-written edits in a sandbox, runs the test suite, retries on failure and opens a pull request with evidence for the owner.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Deprecated API usage, Test coverage of affected code, Build and test result and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Codemods and manual upgrade tickets, because they are the common approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An agent that analyses usage, applies codemods and model-written edits in a sandbox, runs the test suite, retries on failure and opens a pull request with evidence for the owner | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Repositories upgraded) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Automatic merge.
- Evaluation trap: One large rewrite.
- Low test coverage: tests do not cover the change.
- Breaking API: behaviour changes subtly.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
