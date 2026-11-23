# Flaky Test Detection and Quarantine: use-case brief

> Generated from the blueprint `devtools/ci-flaky-test-quarantine` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Flaky Test Detection and Quarantine · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify tests that fail intermittently, estimate their cost and quarantine or fix them so CI results are trusted and engineers stop re-running pipelines. The system has to run as a scheduled batch job, inside these limits: Flaky classification with evidence from reruns, Quarantine with an owner and a deadline and Quarantined tests still run and report.

**Why it is hard.** The obvious approach is failures after changes, and it fails because those are real failures. The second trap is in "Action": the real signal is owner ticket with a deadline, while teams usually reach for silent skip.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way cI trust surveys measures it.

**What success looks like.** Offline: Precision and recall of flake labels, Time saved in CI and Quarantine duration. Online: Reruns per pipeline, CI trust surveys and Time to fix flakes. The launch is judged on "Reruns per pipeline" while "CI trust surveys" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify tests that fail intermittently, estimate their cost and quarantine or fix them so CI results are trusted and engineers stop re-running pipelines.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Flaky classification with evidence from reruns
- Quarantine with an owner and a deadline
- Quarantined tests still run and report
- Daily analysis of 20M test results

## The approach in one paragraph

Start with retry-on-failure and manual flaky lists, because they are the common handling. Then earn the move to a flip-rate detector with cause hints and quarantine rules that keep tests running in the background and open tickets with deadlines, and only if it beats the baseline on Precision and recall of flake labels and Time saved in CI after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Pass-fail flip rate on same commit | Outcome changes without code change. Core. Guard against: from CI. |
| Add Time and resource correlation | Failures with load or time. Cause. Guard against: from CI. |
| Add Test age and dependencies | External services and timing use. Cause. Guard against: from analysis. |
| Run it as one pipeline | Test result ingestion (CI), Flip detection (statistics), Cause hints (rules and model), Quarantine decision (policy), Owner ticket (issue tracker), Dashboards (BI) and Outcome tracking (weekly). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle infrastructure outage | Outage correlation to avoid false flakes. |

**Deliberately not doing**

- Developer name: personal data.
- Test name wording: weak link.
- Branch name: an artefact.

**How the approach is proven**

Prove it offline on Precision and recall of flake labels, Time saved in CI and Quarantine duration using time-ordered splits, then online on "Reruns per pipeline" with "CI trust surveys" as the guardrail. Watch for: Silent skips, Treating every failure as a flake and No owner or deadline.

## Baseline and production design

- **Baseline (build this first):** Retry-on-failure and manual flaky lists, because they are the common handling.
- **Production design:** A flip-rate detector with cause hints and quarantine rules that keep tests running in the background and open tickets with deadlines.

## Why AI, and why this kind

**Why AI.** Identify tests that fail intermittently, estimate their cost and quarantine or fix them so CI results are trusted and engineers stop re-running pipelines. The evidence that separates good from bad outcomes (Pass-fail flip rate on same commit, Time and resource correlation, Test age and dependencies) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "failures after changes" are what teams reach for first, and they fail because those are real failures. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A flip-rate detector with cause hints and quarantine rules that keep tests running in the background and open tickets with deadlines.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Pass-fail flip rate on same commit, Time and resource correlation, Test age and dependencies and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Retry-on-failure and manual flaky lists, because they are the common handling | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A flip-rate detector with cause hints and quarantine rules that keep tests running in the background and open tickets with deadlines | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Reruns per pipeline) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Silent skips.
- Evaluation trap: Treating every failure as a flake.
- Infrastructure outage: many tests fail at once.
- New test: too few runs exist to judge.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
