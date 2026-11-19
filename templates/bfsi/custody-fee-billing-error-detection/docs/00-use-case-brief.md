# Custody Fee & Billing Error Detection: use-case brief

> Generated from the blueprint `bfsi/custody-fee-billing-error-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Custody Fee & Billing Error Detection · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect incorrect custody and fund administration fees before invoices go out, protecting revenue and client trust. The system has to run as a scheduled batch job, inside these limits: Review capacity of 300 invoices per cycle, Explainable flags and No changes to billing without approval.

**Why it is hard.** The obvious approach is compare to last month's fee, and it fails because both can be wrong in the same way. The second trap is in "Contracts": the real signal is tiering, caps and discounts as structured terms, while teams usually reach for pDF text.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way invoice disputes measures it.

**What success looks like.** Offline: Precision at review capacity and Recall of known errors. Online: Revenue leakage recovered and Invoice disputes. The launch is judged on "Revenue leakage recovered" while "Invoice disputes" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect incorrect custody and fund administration fees before invoices go out, protecting revenue and client trust.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{f}-f)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \hat{f} | The fee recomputed from contract terms and billable assets. |
| f | The fee actually invoiced. |

**Hard constraints**

- Review capacity of 300 invoices per cycle
- Explainable flags
- No changes to billing without approval
- Monthly cycle

## The approach in one paragraph

Start with month-on-month variance thresholds by client, because finance already uses them. Then earn the move to contract-aware recomputation engine plus an anomaly model on residuals and context, ranked by value at risk with reason codes, and only if it beats the baseline on Precision at review capacity and Recall of known errors after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Fee recomputation gap | Invoiced fee minus recomputed fee. Direct error signal. Guard against: needs correct contract terms. |
| Add Asset base jump | Month-on-month change in billable assets. Triggers rebates or errors. Guard against: corporate events. |
| Add Contract amendment age | Days since terms last changed. New terms cause errors. Guard against: amendments loaded late. |
| Run it as one pipeline | Billing extract (billing platform), Contract term store (structured contracts), Fee recompute (rules engine), Residual model (gradient boosting), Correction workflow (approvals) and Outcome log (warehouse), with Review queue off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle mid-month asset transfer | Check fees on a daily accrual basis and compare with the billed total. |

**Deliberately not doing**

- Client name: irrelevant.
- Invoice number: arbitrary.
- Billing analyst: irrelevant.

**How the approach is proven**

Prove it offline on Precision at review capacity and Recall of known errors using time-ordered splits, then online on "Revenue leakage recovered" with "Invoice disputes" as the guardrail. Watch for: Training on past errors found by clients and Contract data differs between train and test.

## Baseline and production design

- **Baseline (build this first):** Month-on-month variance thresholds by client, because finance already uses them.
- **Production design:** Contract-aware recomputation engine plus an anomaly model on residuals and context, ranked by value at risk with reason codes.

## Why AI, and why this kind

**Why AI.** Detect incorrect custody and fund administration fees before invoices go out, protecting revenue and client trust. The evidence that separates good from bad outcomes (Fee recomputation gap, Asset base jump, Contract amendment age) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "compare to last month's fee" are what teams reach for first, and they fail because both can be wrong in the same way. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Contract-aware recomputation engine plus an anomaly model on residuals and context, ranked by value at risk with reason codes.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Fee recomputation gap, Asset base jump, Contract amendment age and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Month-on-month variance thresholds by client, because finance already uses them | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Contract-aware recomputation engine plus an anomaly model on residuals and context, ranked by value at risk with reason codes | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Revenue leakage recovered) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on past errors found by clients.
- Evaluation trap: Contract data differs between train and test.
- Mid-month asset transfer: a transfer part-way through the month makes the pro-rata fee wrong.
- Verbal discount: a discount agreed verbally has no contract record and the bill looks wrong.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
