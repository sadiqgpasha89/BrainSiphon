# Improper Payment Risk Review Queue: use-case brief

> Generated from the blueprint `public-sector/improper-payment-risk-review-queue` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Improper Payment Risk Review Queue · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rank payments and claims for post-payment review by the likelihood of error or overpayment so limited audit staff check where errors are likely, with no benefit stopped on a score alone. The system has to run as a scheduled batch job, inside these limits: Scores select cases for human review only, No payment is stopped or reduced on a score and Error and fraud kept separate.

**Why it is hard.** The obvious approach is cases flagged by earlier rules, and it fails because earlier rules bias the labels. The second trap is in "Action": the real signal is review by a trained officer with a right to reply, while teams usually reach for automatic suspension.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.7K a month. A mistake is expensive in the way wrongful reviews measures it.

**What success looks like.** Offline: Precision at the review capacity, Calibration and Review rate parity across groups. Online: Errors recovered, Wrongful reviews and Review hit rate. The launch is judged on "Errors recovered" while "Wrongful reviews" must not get worse.

## Objective, loss and constraints

**Business objective.** Rank payments and claims for post-payment review by the likelihood of error or overpayment so limited audit staff check where errors are likely, with no benefit stopped on a score alone.

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

- Scores select cases for human review only
- No payment is stopped or reduced on a score
- Error and fraud kept separate
- Fairness audited across groups
- Review capacity 20K cases per month

## The approach in one paragraph

Start with rules-based data matching alerts and random audits, because they are the current controls. Then earn the move to a calibrated review-priority model trained on random audit samples, an officer workflow with a right to reply and a regular fairness and error-rate audit, and only if it beats the baseline on Precision at the review capacity and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Income and circumstance mismatch | Differences between declared and registry data. Error indicator. Guard against: from data matching. |
| Add Late change reports | Delay in reporting changes. Overpayment risk. Guard against: from case history. |
| Add Payment pattern anomalies | Unusual changes in payments. Error type. Guard against: from payments. |
| Run it as one pipeline | Data matching (registry joins), Calibration (isotonic fit) and Officer decision with reply (case system), with Payment and case data, Review priority model, Review queue and Fairness audit off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle biased labels | Random audit samples for training. |

**Deliberately not doing**

- Applicant name: irrelevant and private.
- Postcode text: a proxy for protected groups.
- Nationality: prohibited.

**How the approach is proven**

Prove it offline on Precision at the review capacity, Calibration and Review rate parity across groups using time-ordered splits, then online on "Errors recovered" with "Wrongful reviews" as the guardrail. Watch for: Automatic suspension, Flag-based labels and Proxy features for protected groups.

## Baseline and production design

- **Baseline (build this first):** Rules-based data matching alerts and random audits, because they are the current controls.
- **Production design:** A calibrated review-priority model trained on random audit samples, an officer workflow with a right to reply and a regular fairness and error-rate audit.

## Why AI, and why this kind

**Why AI.** Rank payments and claims for post-payment review by the likelihood of error or overpayment so limited audit staff check where errors are likely, with no benefit stopped on a score alone. The evidence that separates good from bad outcomes (Income and circumstance mismatch, Late change reports, Payment pattern anomalies) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "cases flagged by earlier rules" are what teams reach for first, and they fail because earlier rules bias the labels. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A calibrated review-priority model trained on random audit samples, an officer workflow with a right to reply and a regular fairness and error-rate audit.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Income and circumstance mismatch, Late change reports, Payment pattern anomalies and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rules-based data matching alerts and random audits, because they are the current controls | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A calibrated review-priority model trained on random audit samples, an officer workflow with a right to reply and a regular fairness and error-rate audit | chosen | Meets the run-window envelope at $0.062 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Errors recovered) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Automatic suspension.
- Evaluation trap: Flag-based labels.
- Biased labels: past flags drive new flags.
- Policy change: rules differ by period.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
