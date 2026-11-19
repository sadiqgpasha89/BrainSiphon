# Unit Test & PR Description Generation: use-case brief

> Generated from the blueprint `saas/test-generation-and-pr-description` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Unit Test & PR Description Generation · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Generate meaningful unit tests and PR descriptions from code changes, validated by execution and coverage. The system has to run interactively, within a few seconds, inside these limits: Tests must compile and pass, Meaningful assertions and Flaky avoidance.

**Why it is hard.** The obvious approach is accept generated text, and it fails because tests that always pass are worthless. The second trap is in "Value": the real signal is mutation-detected faults not coverage, while teams usually reach for line coverage.

**Scale and stakes.** At 10 million users this is about 15.0M model-touching events a day, 174 requests per second on average and 1.0K at peak, at an estimated $2.37M a month. A mistake is expensive in the way test maintenance cost measures it.

**What success looks like.** Offline: Pass rate and mutation score and Developer acceptance rate. Online: Defects caught by generated tests and Test maintenance cost. The launch is judged on "Defects caught by generated tests" while "Test maintenance cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Generate meaningful unit tests and PR descriptions from code changes, validated by execution and coverage.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{code})+\lambda\,\mathrm{TestFailure}`

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
| \text{code} | The code change the tests and description are written for. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{TestFailure} | Penalty when the generated tests do not run or fail on correct code. |

**Hard constraints**

- Tests must compile and pass
- Meaningful assertions
- Flaky avoidance
- Security of code

## The approach in one paragraph

Start with template-based test scaffolds. Then earn the move to generate-execute-repair loop with mutation testing feedback and flaky-test filters, plus change-aware PR summaries, and only if it beats the baseline on Pass rate and mutation score and Developer acceptance rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Compile and pass rate | Generated tests that run. Reliability. Guard against: cI. |
| Add Mutation score | Killed mutants share. Fault detection. Guard against: mutation tool. |
| Add Coverage delta | New covered lines. Effect. Guard against: coverage tool. |
| Run it as one pipeline | Code change (PR), Context retriever (related code), Test generator (LLM), Executor (sandbox CI), Repair loop (error feedback) and Quality filter (mutation and flakiness), with Developer review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle generated tests assert current buggy behaviour | Spec-based prompts and review of behaviour changes. |

**Deliberately not doing**

- Test count: quantity.
- Comment verbosity: cosmetic.

**How the approach is proven**

Prove it offline on Pass rate and mutation score and Developer acceptance rate using time-ordered splits, then online on "Defects caught by generated tests" with "Test maintenance cost" as the guardrail. Watch for: Rewarding coverage and Ignoring flaky outcomes.

## Baseline and production design

- **Baseline (build this first):** Template-based test scaffolds.
- **Production design:** Generate-execute-repair loop with mutation testing feedback and flaky-test filters, plus change-aware PR summaries.

## Why AI, and why this kind

**Why AI.** Generate meaningful unit tests and PR descriptions from code changes, validated by execution and coverage. The evidence that separates good from bad outcomes (Compile and pass rate, Mutation score, Coverage delta) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "accept generated text" are what teams reach for first, and they fail because tests that always pass are worthless. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Generate-execute-repair loop with mutation testing feedback and flaky-test filters, plus change-aware PR summaries.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Compile and pass rate, Mutation score, Coverage delta and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Template-based test scaffolds | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Generate-execute-repair loop with mutation testing feedback and flaky-test filters, plus change-aware PR summaries | chosen | Meets the 2500 ms envelope at $5.26 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Defects caught by generated tests) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Rewarding coverage.
- Evaluation trap: Ignoring flaky outcomes.
- Generated tests assert current buggy behaviour: bugs encoded as expected.
- Tests rely on timing or network: flaky tests added.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
