# BNPL Instant Risk Decisioning: use-case brief

> Generated from the blueprint `fintech/bnpl-risk-decisioning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** BNPL Instant Risk Decisioning · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Approve or decline buy-now-pay-later at checkout in under 100 ms with loss targets per merchant cohort and fair outcomes. The system has to run in under 100 milliseconds, inside these limits: 100 ms total checkout budget, Responsible-lending affordability checks and Adverse action reasons.

**Why it is hard.** The obvious approach is bureau score alone, and it fails because thin-file users have no score but have stable cash flow. The second trap is in "Stacking": the real signal is outstanding BNPL exposure across providers, while teams usually reach for own-book exposure only.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $3.6K a month. A mistake is expensive in the way approval rate measures it.

**What success looks like.** Offline: AUC and KS at 30-day first-payment default and Calibration by cohort. Online: Loss rate per GMV and Approval rate. The launch is judged on "Loss rate per GMV" while "Approval rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Approve or decline buy-now-pay-later at checkout in under 100 ms with loss targets per merchant cohort and fair outcomes.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{order value})+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| w | A weight that scales how much a particular example, class or term counts in the loss. |
| \text{order value} | The value of the order; w grows with it, so mistakes on large orders count more. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- 100 ms total checkout budget
- Responsible-lending affordability checks
- Adverse action reasons
- Merchant-specific loss agreements

## The approach in one paragraph

Start with scorecard with bureau and order features. Then earn the move to gBDT with consortium stacking features, calibrated per merchant cohort, plus dynamic limit adjustment from first-payment performance, and only if it beats the baseline on AUC and KS at 30-day first-payment default and Calibration by cohort after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Stacked exposure | Total open BNPL obligations from consortium data. Overextension. Guard against: snapshot at checkout time. |
| Add First-payment risk | Probability of failing the first instalment. Early default is the dominant loss. Guard against: label horizon 30 days. |
| Add Basket and merchant risk | Category, value and merchant default history. Order-level risk. Guard against: merchant history as-of. |
| Run it as one pipeline | Checkout API (merchant SDK), Consortium lookup (cached exposure service), Feature store (Redis), Risk model (LightGBM), Affordability and policy (rules), Collections trigger (early-risk queue) and Repayment labels (ledger). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle merchant promotion causes volume surge | Merchant-level exposure caps and drift monitor. |

**Deliberately not doing**

- Device battery level: spurious.
- Time on checkout page: friction artefact.

**How the approach is proven**

Prove it offline on AUC and KS at 30-day first-payment default and Calibration by cohort using time-ordered splits, then online on "Loss rate per GMV" with "Approval rate" as the guardrail. Watch for: Training on approved orders only and 30-day label window used for 90-day loss targets.

## Baseline and production design

- **Baseline (build this first):** Scorecard with bureau and order features.
- **Production design:** GBDT with consortium stacking features, calibrated per merchant cohort, plus dynamic limit adjustment from first-payment performance.

## Why AI, and why this kind

**Why AI.** Approve or decline buy-now-pay-later at checkout in under 100 ms with loss targets per merchant cohort and fair outcomes. The evidence that separates good from bad outcomes (Stacked exposure, First-payment risk, Basket and merchant risk) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "bureau score alone" are what teams reach for first, and they fail because thin-file users have no score but have stable cash flow. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: GBDT with consortium stacking features, calibrated per merchant cohort, plus dynamic limit adjustment from first-payment performance.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Stacked exposure, First-payment risk, Basket and merchant risk and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Scorecard with bureau and order features | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| GBDT with consortium stacking features, calibrated per merchant cohort, plus dynamic limit adjustment from first-payment performance | chosen | Meets the 80 ms envelope at $0.081 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Loss rate per GMV) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on approved orders only.
- Evaluation trap: 30-day label window used for 90-day loss targets.
- Merchant promotion causes volume surge: adverse selection.
- Consortium API timeout: missing stacking data.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
