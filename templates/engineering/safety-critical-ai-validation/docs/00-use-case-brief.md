# Safety-Critical AI Validation: use-case brief

> Generated from the blueprint `engineering/safety-critical-ai-validation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Safety-Critical AI Validation · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Validate AI models used near safety-critical engineering decisions with independent test sets, failure analysis and operating limits so only models with documented evidence are released for use. The system has to run as a scheduled batch job, inside these limits: Independent test data never used in training, Validation report required before release and Operating limits documented and enforced.

**Why it is hard.** The obvious approach is training performance, and it fails because training metrics overstate reality. The second trap is in "Scope": the real signal is documented operating domain, while teams usually reach for any use.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $2.0K a month. A mistake is expensive in the way field failures measures it.

**What success looks like.** Offline: Performance by condition, Failure coverage and Calibration. Online: Models released without evidence, Field failures and Time to validate. The launch is judged on "Models released without evidence" while "Field failures" must not get worse.

## Objective, loss and constraints

**Business objective.** Validate AI models used near safety-critical engineering decisions with independent test sets, failure analysis and operating limits so only models with documented evidence are released for use.

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

- Independent test data never used in training
- Validation report required before release
- Operating limits documented and enforced
- Revalidation after data or model changes
- Safety officer signs off every release within 10 working days

## The approach in one paragraph

Start with developer testing and review by a senior engineer, because it is the common practice. Then earn the move to a validation process with independent datasets, failure analysis, domain limits and sign-off gates that also monitors live drift and triggers revalidation, and only if it beats the baseline on Performance by condition and Failure coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Held-out performance by condition | Accuracy across conditions. Core. Guard against: from validation. |
| Add Failure case catalogue | Known failure modes. Core. Guard against: from analysis. |
| Add Operating domain coverage | Conditions tested. Limit. Guard against: from test design. |
| Run it as one pipeline | Intended use definition (safety case), Independent test set build (data team), Validation run (test harness), Failure analysis (engineers), Release with limits (model registry) and Drift monitoring (monitoring), with Safety review and sign-off off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle rare conditions | Targeted tests. |

**Deliberately not doing**

- Developer name: personal data.
- Model architecture: not evidence.
- Training run id: an identifier.

**How the approach is proven**

Prove it offline on Performance by condition, Failure coverage and Calibration using time-ordered splits, then online on "Models released without evidence" with "Field failures" as the guardrail. Watch for: Training metrics as evidence, Any-use release and Self-release.

## Baseline and production design

- **Baseline (build this first):** Developer testing and review by a senior engineer, because it is the common practice.
- **Production design:** A validation process with independent datasets, failure analysis, domain limits and sign-off gates that also monitors live drift and triggers revalidation.

## Why AI, and why this kind

**Why AI.** Validate AI models used near safety-critical engineering decisions with independent test sets, failure analysis and operating limits so only models with documented evidence are released for use. The evidence that separates good from bad outcomes (Held-out performance by condition, Failure case catalogue, Operating domain coverage) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "training performance" are what teams reach for first, and they fail because training metrics overstate reality. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A validation process with independent datasets, failure analysis, domain limits and sign-off gates that also monitors live drift and triggers revalidation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Held-out performance by condition, Failure case catalogue, Operating domain coverage and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Developer testing and review by a senior engineer, because it is the common practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A validation process with independent datasets, failure analysis, domain limits and sign-off gates that also monitors live drift and triggers revalidation | chosen | Meets the run-window envelope at $0.023 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Models released without evidence) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training metrics as evidence.
- Evaluation trap: Any-use release.
- Rare conditions: the test set lacks edge cases.
- Distribution shift: the field differs from tests.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
