# Fund NAV Break Detection: use-case brief

> Generated from the blueprint `bfsi/fund-nav-break-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fund NAV Break Detection · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect errors in daily fund net asset value before publication so administrators fix pricing and accrual errors first. The system has to run as a scheduled batch job, inside these limits: Check completes within 30 minutes of the pricing cut-off, Every flag names the likely line item and Tolerance bands set by fund type.

**Why it is hard.** The obvious approach is total NAV change, and it fails because a move can be right in total and wrong in components. The second trap is in "Tolerance": the real signal is bands per fund type and asset mix, while teams usually reach for one global threshold.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way review time per fund measures it.

**What success looks like.** Offline: Recall of known breaks at fixed review load and Precision of flags. Online: NAV errors published and Review time per fund. The launch is judged on "NAV errors published" while "Review time per fund" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect errors in daily fund net asset value before publication so administrators fix pricing and accrual errors first.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{r}-r)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \hat{r} | The model's predicted value of the quantity r. |
| r | The true daily return of the fund, with \hat{r} the return implied by the reported NAV. |

**Hard constraints**

- Check completes within 30 minutes of the pricing cut-off
- Every flag names the likely line item
- Tolerance bands set by fund type
- Auditable

## The approach in one paragraph

Start with fixed percentage tolerance on NAV change per fund, because administrators already use it. Then earn the move to attribution engine producing residuals, plus an anomaly model per fund type on residual and context, ranked by NAV impact in basis points, and only if it beats the baseline on Recall of known breaks at fixed review load and Precision of flags after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Unexplained NAV residual | NAV change minus attributed price, flow and accrual effects. Direct error indicator. Guard against: needs correct holdings and FX. |
| Add Stale price count | Holdings with unchanged price for 3+ days. Stale prices distort NAV. Guard against: illiquid assets are often stale legitimately. |
| Add Price jump versus peers | Holding return minus peer index return. Detects bad marks. Guard against: peer sets must be right. |
| Run it as one pipeline | Holdings and prices (fund accounting system), NAV attribution (rules engine), Residual anomaly model (gradient boosting), Impact ranker (rules), Correction log (audit store) and Model monitor (dashboard), with Reviewer queue off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle large subscription | Attribute the NAV change to flows before testing for a break. |

**Deliberately not doing**

- Fund name: no signal.
- Administrator staff: irrelevant.
- Report time stamp: arbitrary.

**How the approach is proven**

Prove it offline on Recall of known breaks at fixed review load and Precision of flags using time-ordered splits, then online on "NAV errors published" with "Review time per fund" as the guardrail. Watch for: Labels only for breaks found later and Calm-period tuning.

## Baseline and production design

- **Baseline (build this first):** Fixed percentage tolerance on NAV change per fund, because administrators already use it.
- **Production design:** Attribution engine producing residuals, plus an anomaly model per fund type on residual and context, ranked by NAV impact in basis points.

## Why AI, and why this kind

**Why AI.** Detect errors in daily fund net asset value before publication so administrators fix pricing and accrual errors first. The evidence that separates good from bad outcomes (Unexplained NAV residual, Stale price count, Price jump versus peers) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "total NAV change" are what teams reach for first, and they fail because A move can be right in total and wrong in components. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Attribution engine producing residuals, plus an anomaly model per fund type on residual and context, ranked by NAV impact in basis points.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Unexplained NAV residual, Stale price count, Price jump versus peers and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed percentage tolerance on NAV change per fund, because administrators already use it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Attribution engine producing residuals, plus an anomaly model per fund type on residual and context, ranked by NAV impact in basis points | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (NAV errors published) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels only for breaks found later.
- Evaluation trap: Calm-period tuning.
- Large subscription: a large subscription changes the NAV through flows and looks like a pricing error.
- Corporate action not booked: holdings and prices disagree because an action has not been booked.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
