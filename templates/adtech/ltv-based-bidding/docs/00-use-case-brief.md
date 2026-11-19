# LTV-Based Bidding: use-case brief

> Generated from the blueprint `adtech/ltv-based-bidding` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** LTV-Based Bidding · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Bid for acquisition using predicted customer lifetime value rather than first-purchase value to unlock profitable growth. The system has to run as a scheduled batch job, inside these limits: Early LTV signal within days, Calibration by cohort and Privacy.

**Why it is hard.** The obvious approach is wait for observed LTV, and it fails because waiting delays bid learning by months. The second trap is in "Bias": the real signal is calibrate predicted LTV against matured cohorts, while teams usually reach for use early predictions uncorrected.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.6K a month. A mistake is expensive in the way payback period measures it.

**What success looks like.** Offline: Normalised Gini of LTV ranking and Cohort calibration error. Online: Realised LTV to CAC ratio and Payback period. The launch is judged on "Realised LTV to CAC ratio" while "Payback period" must not get worse.

## Objective, loss and constraints

**Business objective.** Bid for acquisition using predicted customer lifetime value rather than first-purchase value to unlock profitable growth.

**Training objective.** `\mathcal{L}=\mathrm{ZILN}(y;\pi,\mu,\sigma)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{ZILN} | Zero-inflated log-normal loss: models outcomes that are often exactly zero and otherwise positive with a long right tail, such as customer spend. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \pi | The probability that the customer's lifetime value is exactly zero. |
| \mu | The mean of the logarithm of value for customers who do spend. |
| \sigma | The standard deviation of the logarithm of value for customers who do spend. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Early LTV signal within days
- Calibration by cohort
- Privacy
- Bidding systems consume predictions in real time

## The approach in one paragraph

Start with bid on first-order value. Then earn the move to early-signal ZILN GBDT predicting 12-month LTV, calibrated on matured cohorts, feeding bid multipliers per campaign, and only if it beats the baseline on Normalised Gini of LTV ranking and Cohort calibration error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around First-week engagement | Sessions and purchases in 7 days. Early LTV. Guard against: window. |
| Add Acquisition source | Channel and campaign. Quality. Guard against: prior. |
| Add Product-mix at acquisition | Category of first purchase. Value. Guard against: product. |
| Run it as one pipeline | Event data (lake), Early-signal features (Spark), LTV model (ZILN GBDT), Cohort calibrator (isotonic), Bid multiplier service (DSP API) and Matured LTV (labels), with Marketer review off the critical path. |
| Optimise the right thing | The objective weighs zero-inflated log-normal loss: models outcomes that are often exactly zero and otherwise positive with a long right tail, such as customer spend, so the model is trained on the cost of the decision and not on a generic score. |
| Handle seasonal acquisition cohorts have different value | Seasonality features and cohort calibration. |

**Deliberately not doing**

- Install timestamp precise: none.
- Device colour: none.

**How the approach is proven**

Prove it offline on Normalised Gini of LTV ranking and Cohort calibration error using time-ordered splits, then online on "Realised LTV to CAC ratio" with "Payback period" as the guardrail. Watch for: Immature labels in evaluation and Training on one season.

## Baseline and production design

- **Baseline (build this first):** Bid on first-order value.
- **Production design:** Early-signal ZILN GBDT predicting 12-month LTV, calibrated on matured cohorts, feeding bid multipliers per campaign.

## Why AI, and why this kind

**Why AI.** Bid for acquisition using predicted customer lifetime value rather than first-purchase value to unlock profitable growth. The evidence that separates good from bad outcomes (First-week engagement, Acquisition source, Product-mix at acquisition) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "wait for observed LTV" are what teams reach for first, and they fail because waiting delays bid learning by months. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Early-signal ZILN GBDT predicting 12-month LTV, calibrated on matured cohorts, feeding bid multipliers per campaign.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among First-week engagement, Acquisition source, Product-mix at acquisition and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Bid on first-order value | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Early-signal ZILN GBDT predicting 12-month LTV, calibrated on matured cohorts, feeding bid multipliers per campaign | chosen | Meets the run-window envelope at $0.091 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Realised LTV to CAC ratio) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Immature labels in evaluation.
- Evaluation trap: Training on one season.
- Seasonal acquisition cohorts have different value: lTV predictions drift.
- Product change alters retention: early signals mislead.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
