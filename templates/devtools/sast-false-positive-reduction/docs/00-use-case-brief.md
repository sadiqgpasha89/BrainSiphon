# Static Analysis False Positive Reduction: use-case brief

> Generated from the blueprint `devtools/sast-false-positive-reduction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Static Analysis False Positive Reduction · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Reduce noise from static analysis by ranking findings by the likelihood that engineers will confirm them, using code context and past triage decisions, while keeping all findings available. The system has to run interactively, within a few seconds, inside these limits: Hidden findings stay one click away, Recall of true vulnerabilities above 98% at the shown threshold and Security team reviews threshold changes.

**Why it is hard.** The obvious approach is developer dismissals, and it fails because dismissals can be rushed. The second trap is in "Safety": the real signal is recall of true issues at a fixed review load, while teams usually reach for fewer alerts.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $12.3K a month. A mistake is expensive in the way true vulnerabilities missed measures it.

**What success looks like.** Offline: Recall of true vulnerabilities, Reduction in alerts shown and Calibration. Online: Alerts per pull request, True vulnerabilities missed and Developer dismissal rate. The launch is judged on "Alerts per pull request" while "True vulnerabilities missed" must not get worse.

## Objective, loss and constraints

**Business objective.** Reduce noise from static analysis by ranking findings by the likelihood that engineers will confirm them, using code context and past triage decisions, while keeping all findings available.

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

- Hidden findings stay one click away
- Recall of true vulnerabilities above 98% at the shown threshold
- Security team reviews threshold changes
- Weekly retraining
- 5M findings per quarter

## The approach in one paragraph

Start with scanner severity and manual triage by security engineers, because it is the standard process. Then earn the move to a ranking model trained on security triage outcomes with a recall-focused threshold, a hidden-findings view and drift monitoring by rule, and only if it beats the baseline on Recall of true vulnerabilities and Reduction in alerts shown after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Rule and language | The analysis rule and language. Base rate. Guard against: from the scanner. |
| Add Data flow evidence | Whether tainted data reaches the sink. Core. Guard against: from analysis. |
| Add Code context embedding | Semantic context. Support. Guard against: from a code model. |
| Run it as one pipeline | Finding intake (static analysis), Feature build (code context), Ranker (gradient boosting), Threshold policy (rules) and Developer view (pull request), with Triage feedback and Recall audit off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new rule | Show all findings for new rules. |

**Deliberately not doing**

- Developer name: personal data.
- Finding id: an identifier.
- File name: an artefact.

**How the approach is proven**

Prove it offline on Recall of true vulnerabilities, Reduction in alerts shown and Calibration using time-ordered splits, then online on "Alerts per pull request" with "True vulnerabilities missed" as the guardrail. Watch for: Hiding alerts silently, Developer dismissals as truth and Alert reduction as the goal.

## Baseline and production design

- **Baseline (build this first):** Scanner severity and manual triage by security engineers, because it is the standard process.
- **Production design:** A ranking model trained on security triage outcomes with a recall-focused threshold, a hidden-findings view and drift monitoring by rule.

## Why AI, and why this kind

**Why AI.** Reduce noise from static analysis by ranking findings by the likelihood that engineers will confirm them, using code context and past triage decisions, while keeping all findings available. The evidence that separates good from bad outcomes (Rule and language, Data flow evidence, Code context embedding) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "developer dismissals" are what teams reach for first, and they fail because dismissals can be rushed. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A ranking model trained on security triage outcomes with a recall-focused threshold, a hidden-findings view and drift monitoring by rule.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Rule and language, Data flow evidence, Code context embedding and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Scanner severity and manual triage by security engineers, because it is the standard process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A ranking model trained on security triage outcomes with a recall-focused threshold, a hidden-findings view and drift monitoring by rule | chosen | Meets the 2500 ms envelope at $0.273 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Alerts per pull request) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Hiding alerts silently.
- Evaluation trap: Developer dismissals as truth.
- New rule: no triage history exists.
- Label drift: triage standards change.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
