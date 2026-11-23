# Defect-Prone Change Prediction: use-case brief

> Generated from the blueprint `devtools/defect-prone-change-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Defect-Prone Change Prediction · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate which changes are most likely to cause defects from the size, files, history and tests so reviewers and testers spend extra care there, with no scoring of authors. The system has to run as a scheduled batch job, inside these limits: Change-level risk with drivers, No author-level scores and Used for review depth and test choice only.

**Why it is hard.** The obvious approach is revert counts only, and it fails because many bugs are fixed without reverts. The second trap is in "Fairness": the real signal is features about the code and process, while teams usually reach for features about the author.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way review time on high-risk changes measures it.

**What success looks like.** Offline: Calibration, Recall at review capacity and Stability across repositories. Online: Escaped defects, Review time on high-risk changes and Incidents from changes. The launch is judged on "Escaped defects" while "Review time on high-risk changes" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate which changes are most likely to cause defects from the size, files, history and tests so reviewers and testers spend extra care there, with no scoring of authors.

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

- Change-level risk with drivers
- No author-level scores
- Used for review depth and test choice only
- Calibrated probabilities
- 500K changes per month

## The approach in one paragraph

Start with large changes get extra review by policy, because it is the common rule. Then earn the move to a calibrated change-risk model on code and process features that sets review depth and test selection, with a fairness check against author features, and only if it beats the baseline on Calibration and Recall at review capacity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Change size and spread | Lines and files touched. Risk. Guard against: from the diff. |
| Add File defect history | Past bug fixes in the files. Risk. Guard against: from the tracker. |
| Add Test changes and coverage | Tests added with the change. Mitigation. Guard against: from CI. |
| Run it as one pipeline | Change data extraction (version control), Feature build (code metrics), Risk model (gradient boosting), Calibration (isotonic fit), Dashboard for teams (BI) and Outcome tracking (monthly), with Review policy off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new repository | Language-level priors. |

**Deliberately not doing**

- Author name: personal data.
- Author tenure: an unfair proxy.
- Commit time: weak link.

**How the approach is proven**

Prove it offline on Calibration, Recall at review capacity and Stability across repositories using time-ordered splits, then online on "Escaped defects" with "Review time on high-risk changes" as the guardrail. Watch for: Author-level scoring, Reverts as the only label and Ignoring label delay.

## Baseline and production design

- **Baseline (build this first):** Large changes get extra review by policy, because it is the common rule.
- **Production design:** A calibrated change-risk model on code and process features that sets review depth and test selection, with a fairness check against author features.

## Why AI, and why this kind

**Why AI.** Estimate which changes are most likely to cause defects from the size, files, history and tests so reviewers and testers spend extra care there, with no scoring of authors. The evidence that separates good from bad outcomes (Change size and spread, File defect history, Test changes and coverage) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "revert counts only" are what teams reach for first, and they fail because many bugs are fixed without reverts. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A calibrated change-risk model on code and process features that sets review depth and test selection, with a fairness check against author features.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Change size and spread, File defect history, Test changes and coverage and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Large changes get extra review by policy, because it is the common rule | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A calibrated change-risk model on code and process features that sets review depth and test selection, with a fairness check against author features | chosen | Meets the run-window envelope at $0.038 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Escaped defects) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Author-level scoring.
- Evaluation trap: Reverts as the only label.
- New repository: no defect history.
- Mass refactor: size is large but safe.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
