# Tax Return Error Detection: use-case brief

> Generated from the blueprint `public-sector/tax-return-error-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Tax Return Error Detection · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect likely errors and omissions in returns before processing so taxpayers can correct them and audits focus on real risk. The system has to run as a scheduled batch job, inside these limits: Prompt to the taxpayer about a possible error rather than a penalty, Auditors review any enforcement case and Selection based on random audits.

**Why it is hard.** The obvious approach is past audit selections, and it fails because past selections bias the model. The second trap is in "Action": the real signal is a correction prompt or review, while teams usually reach for an automatic assessment.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.8K a month. A mistake is expensive in the way taxpayer corrections after prompts measures it.

**What success looks like.** Offline: Precision at audit capacity, Calibration and Detection parity by income group. Online: Tax corrected before refund, Taxpayer corrections after prompts and Audit yield. The launch is judged on "Tax corrected before refund" while "Taxpayer corrections after prompts" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect likely errors and omissions in returns before processing so taxpayers can correct them and audits focus on real risk.

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

- Prompt to the taxpayer about a possible error rather than a penalty
- Auditors review any enforcement case
- Selection based on random audits
- Fairness audited
- 30M returns per year

## The approach in one paragraph

Start with rule-based checks and prior audit selection scores, because they are the current methods. Then earn the move to a calibrated risk model on random audit data with taxpayer prompts for likely mistakes, a review queue for complex cases and fairness monitoring, and only if it beats the baseline on Precision at audit capacity and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Third-party data mismatch | Differences with employer and bank reports. Error. Guard against: from information returns. |
| Add Deduction pattern | Claims relative to peers. Anomaly. Guard against: from returns. |
| Add Prior year change | Change from last year. Plausibility. Guard against: from history. |
| Run it as one pipeline | Return and third-party data (tax system), Feature build (matches and history), Error model (gradient boosting), Calibration (isotonic fit) and Officer decision (case system), with Taxpayer prompt or review queue and Fairness audit off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle law change | Versioned rules and retraining. |

**Deliberately not doing**

- Taxpayer name: irrelevant and private.
- Address: irrelevant and private.
- Preparer name: irrelevant for the model.

**How the approach is proven**

Prove it offline on Precision at audit capacity, Calibration and Detection parity by income group using time-ordered splits, then online on "Tax corrected before refund" with "Taxpayer corrections after prompts" as the guardrail. Watch for: Past audit labels, Automatic assessments and Targeting low-income returns only.

## Baseline and production design

- **Baseline (build this first):** Rule-based checks and prior audit selection scores, because they are the current methods.
- **Production design:** A calibrated risk model on random audit data with taxpayer prompts for likely mistakes, a review queue for complex cases and fairness monitoring.

## Why AI, and why this kind

**Why AI.** Detect likely errors and omissions in returns before processing so taxpayers can correct them and audits focus on real risk. The evidence that separates good from bad outcomes (Third-party data mismatch, Deduction pattern, Prior year change) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "past audit selections" are what teams reach for first, and they fail because past selections bias the model. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A calibrated risk model on random audit data with taxpayer prompts for likely mistakes, a review queue for complex cases and fairness monitoring.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Third-party data mismatch, Deduction pattern, Prior year change and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based checks and prior audit selection scores, because they are the current methods | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A calibrated risk model on random audit data with taxpayer prompts for likely mistakes, a review queue for complex cases and fairness monitoring | chosen | Meets the run-window envelope at $0.039 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Tax corrected before refund) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Past audit labels.
- Evaluation trap: Automatic assessments.
- Law change: a deduction rule changes.
- Late third-party data: information returns arrive after filing.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
