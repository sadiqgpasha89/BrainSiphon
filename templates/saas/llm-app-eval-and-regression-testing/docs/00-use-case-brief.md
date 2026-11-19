# LLM Application Evals & Regression Testing: use-case brief

> Generated from the blueprint `saas/llm-app-eval-and-regression-testing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** LLM Application Evals & Regression Testing · **Domain:** saas · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Maintain golden datasets and automated evaluations so prompt, model and tool changes are gated on measured quality, safety and cost. The system has to run as a scheduled batch job, inside these limits: CI-time evaluation, Calibrated judges and Coverage of failure modes.

**Why it is hard.** The obvious approach is synthetic easy examples, and it fails because easy sets saturate and miss regressions. The second trap is in "Judges": the real signal is calibrate LLM judges to human labels, while teams usually reach for trust judge scores.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.9K a month. A mistake is expensive in the way time to ship prompt changes measures it.

**What success looks like.** Offline: Judge-human agreement and Regression detection power on seeded changes. Online: Bad releases prevented and Time to ship prompt changes. The launch is judged on "Bad releases prevented" while "Time to ship prompt changes" must not get worse.

## Objective, loss and constraints

**Business objective.** Maintain golden datasets and automated evaluations so prompt, model and tool changes are gated on measured quality, safety and cost.

**Training objective.** `\text{score}=\frac{1}{N}\sum_i \mathrm{Judge}(x_i,y_i)\ \text{(calibrated against human labels)}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \text{score} | The overall quality score of the application on the test set. |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |
| N | The number of test cases. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Judge} | The judge's grade for an answer to input x_i, calibrated against human labels. |
| x_i | A test input. |
| y_i | The application's answer. |

**Hard constraints**

- CI-time evaluation
- Calibrated judges
- Coverage of failure modes
- Cost of evaluation

## The approach in one paragraph

Start with manual spot checks before release. Then earn the move to versioned golden sets from production traces, calibrated judges, slice-level regression reports and release gates in CI, and only if it beats the baseline on Judge-human agreement and Regression detection power on seeded changes after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Task success on golden set | Pass rate on curated cases. Quality. Guard against: dataset curation. |
| Add Judge-human agreement | Kappa. Reliability. Guard against: anchor set. |
| Add Regression diff by slice | Slice-level change. Localise. Guard against: slicing. |
| Run it as one pipeline | Production traces (logging), Eval runner (batch inference), Judges (calibrated LLM) and Release gate (CI), with Case curation, Regression report and Human labelling off the critical path. |
| Optimise the right thing | The objective weighs the overall quality score of the application on the test set, so the model is trained on the cost of the decision and not on a generic score. |
| Handle judge model update shifts scores | Pinned judge versions and re-calibration. |

**Deliberately not doing**

- Average score alone: hides slices.
- Number of test cases: quantity.

**How the approach is proven**

Prove it offline on Judge-human agreement and Regression detection power on seeded changes using time-ordered splits, then online on "Bad releases prevented" with "Time to ship prompt changes" as the guardrail. Watch for: Evaluating only on the tuned set and Single aggregate metric.

## Baseline and production design

- **Baseline (build this first):** Manual spot checks before release.
- **Production design:** Versioned golden sets from production traces, calibrated judges, slice-level regression reports and release gates in CI.

## Why AI, and why this kind

**Why AI.** Maintain golden datasets and automated evaluations so prompt, model and tool changes are gated on measured quality, safety and cost. The evidence that separates good from bad outcomes (Task success on golden set, Judge-human agreement, Regression diff by slice) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "synthetic easy examples" are what teams reach for first, and they fail because easy sets saturate and miss regressions. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Versioned golden sets from production traces, calibrated judges, slice-level regression reports and release gates in CI.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Task success on golden set, Judge-human agreement, Regression diff by slice and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual spot checks before release | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Versioned golden sets from production traces, calibrated judges, slice-level regression reports and release gates in CI | chosen | Meets the run-window envelope at $2.07 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Bad releases prevented) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating only on the tuned set.
- Evaluation trap: Single aggregate metric.
- Judge model update shifts scores: regressions appear or hide.
- Dataset contamination via prompt tuning: optimistic scores.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
