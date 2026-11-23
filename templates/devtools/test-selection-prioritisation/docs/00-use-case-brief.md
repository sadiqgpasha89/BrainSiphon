# Test Selection and Prioritisation: use-case brief

> Generated from the blueprint `devtools/test-selection-prioritisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Test Selection and Prioritisation · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose and order the tests most likely to fail for a given change so developers get failures sooner and pipelines run fewer tests safely. The system has to run interactively, within a few seconds, inside these limits: Catch at least 99% of failing changes within the selected tests, Full suite still runs before release and Selection within 5 s.

**Why it is hard.** The obvious approach is tests skipped, and it fails because skipped tests may hide failures. The second trap is in "Safety": the real signal is a full run before release, while teams usually reach for selection only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.8K a month. A mistake is expensive in the way time to first failure measures it.

**What success looks like.** Offline: Failure catch rate at the time budget, Miss rate on full runs and Time saved. Online: CI time, Time to first failure and Escaped failures. The launch is judged on "CI time" while "Time to first failure" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose and order the tests most likely to fail for a given change so developers get failures sooner and pipelines run fewer tests safely.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{RankLoss} | Ranking loss: penalises placing a less relevant item above a more relevant one. |

**Hard constraints**

- Catch at least 99% of failing changes within the selected tests
- Full suite still runs before release
- Selection within 5 s
- Safety net of random tests
- 200M test executions per month

## The approach in one paragraph

Start with run all tests on every change or fixed subsets by directory, because they are the common setups. Then earn the move to a selection model on change and history features with a random safety sample, a full run at merge or release and monitoring of the miss rate, and only if it beats the baseline on Failure catch rate at the time budget and Miss rate on full runs after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Files changed and test mapping | Tests linked to changed files. Core. Guard against: from coverage maps. |
| Add Historical failure rate | Past failures of the test. Prior. Guard against: from CI. |
| Add Change risk | Risk indicators of the change. Context. Guard against: from the risk model. |
| Run it as one pipeline | Change analysis (code host), Coverage mapping (test impact analysis), Failure model (gradient boosting), Selection and ordering (rules), CI run (pipeline), Miss monitoring (full runs) and Retraining (weekly). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle test environment changes | Environment tags and full runs. |

**Deliberately not doing**

- Developer name: personal data.
- Test name wording: weak link.
- Branch name: an artefact.

**How the approach is proven**

Prove it offline on Failure catch rate at the time budget, Miss rate on full runs and Time saved using time-ordered splits, then online on "CI time" with "Time to first failure" as the guardrail. Watch for: Selection with no full run, Learning from flaky failures and Skipped-test counts as success.

## Baseline and production design

- **Baseline (build this first):** Run all tests on every change or fixed subsets by directory, because they are the common setups.
- **Production design:** A selection model on change and history features with a random safety sample, a full run at merge or release and monitoring of the miss rate.

## Why AI, and why this kind

**Why AI.** Choose and order the tests most likely to fail for a given change so developers get failures sooner and pipelines run fewer tests safely. The evidence that separates good from bad outcomes (Files changed and test mapping, Historical failure rate, Change risk) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "tests skipped" are what teams reach for first, and they fail because skipped tests may hide failures. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A selection model on change and history features with a random safety sample, a full run at merge or release and monitoring of the miss rate.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Files changed and test mapping, Historical failure rate, Change risk and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Run all tests on every change or fixed subsets by directory, because they are the common setups | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A selection model on change and history features with a random safety sample, a full run at merge or release and monitoring of the miss rate | chosen | Meets the 2500 ms envelope at $0.042 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (CI time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Selection with no full run.
- Evaluation trap: Learning from flaky failures.
- Test environment changes: failures occur with no code link.
- New tests: the new tests have no failure history.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
