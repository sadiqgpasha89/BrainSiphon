# Test Gap Analysis from Changes and Coverage: use-case brief

> Generated from the blueprint `devtools/test-gap-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Test Gap Analysis from Changes and Coverage · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find recently changed or high-risk code that has little test coverage so teams add tests where they matter most. The system has to run as a scheduled batch job, inside these limits: Gaps ranked by change risk and coverage, Links to the exact functions and Teams decide what to test.

**Why it is hard.** The obvious approach is low coverage everywhere, and it fails because cold code does not need first attention. The second trap is in "Evidence": the real signal is coverage and change history, while teams usually reach for coverage alone.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way coverage of risky code measures it.

**What success looks like.** Offline: Defect capture in top-ranked gaps, Ranking stability and Team acceptance. Online: Escaped defects in high-churn code, Coverage of risky code and Test effort per defect avoided. The launch is judged on "Escaped defects in high-churn code" while "Coverage of risky code" must not get worse.

## Objective, loss and constraints

**Business objective.** Find recently changed or high-risk code that has little test coverage so teams add tests where they matter most.

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

- Gaps ranked by change risk and coverage
- Links to the exact functions
- Teams decide what to test
- Weekly run for 5K repositories

## The approach in one paragraph

Start with coverage percentage targets by repository, because they are the common governance. Then earn the move to a ranking of untested hot code with links to functions and suggested test types, delivered to team backlogs, and only if it beats the baseline on Defect capture in top-ranked gaps and Ranking stability after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Coverage by function | Tested share. Gap. Guard against: from coverage tools. |
| Add Churn | Changes per period. Importance. Guard against: from version control. |
| Add Defect history | Bugs in the function. Risk. Guard against: from the tracker. |
| Run it as one pipeline | Coverage and change data (CI and version control), Risk join (service catalogue), Gap ranking (rules and model), Test suggestions (LLM), Team backlog (issue tracker) and Progress tracking (BI), with Review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle generated code | Exclusions. |

**Deliberately not doing**

- Developer name: personal data.
- Language alone: weak link.
- File size: weak link.

**How the approach is proven**

Prove it offline on Defect capture in top-ranked gaps, Ranking stability and Team acceptance using time-ordered splits, then online on "Escaped defects in high-churn code" with "Coverage of risky code" as the guardrail. Watch for: Coverage percentage targets, Ignoring change history and Whole-repository reports.

## Baseline and production design

- **Baseline (build this first):** Coverage percentage targets by repository, because they are the common governance.
- **Production design:** A ranking of untested hot code with links to functions and suggested test types, delivered to team backlogs.

## Why AI, and why this kind

**Why AI.** Find recently changed or high-risk code that has little test coverage so teams add tests where they matter most. The evidence that separates good from bad outcomes (Coverage by function, Churn, Defect history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "low coverage everywhere" are what teams reach for first, and they fail because cold code does not need first attention. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A ranking of untested hot code with links to functions and suggested test types, delivered to team backlogs.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Coverage by function, Churn, Defect history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Coverage percentage targets by repository, because they are the common governance | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A ranking of untested hot code with links to functions and suggested test types, delivered to team backlogs | chosen | Meets the run-window envelope at $0.038 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Escaped defects in high-churn code) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Coverage percentage targets.
- Evaluation trap: Ignoring change history.
- Generated code: coverage is misleading.
- Integration-only coverage: unit coverage looks low.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
