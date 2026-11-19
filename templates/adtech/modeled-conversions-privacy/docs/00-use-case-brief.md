# Modelled Conversions under Privacy Constraints: use-case brief

> Generated from the blueprint `adtech/modeled-conversions-privacy` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Modelled Conversions under Privacy Constraints · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate unobservable conversions from aggregate and consented signals to keep measurement accurate as identifiers disappear. The system has to run as a scheduled batch job, inside these limits: Privacy thresholds, Calibration against consented panel and Transparency about modelled vs observed.

**Why it is hard.** The obvious approach is trust modelled totals blindly, and it fails because model drift goes unnoticed without anchors. The second trap is in "Granularity": the real signal is report at privacy-safe aggregation levels, while teams usually reach for user-level modelled outputs.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way advertiser trust measures it.

**What success looks like.** Offline: Error vs consented holdout and Interval coverage. Online: Reported vs true conversion gap and Advertiser trust. The launch is judged on "Reported vs true conversion gap" while "Advertiser trust" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate unobservable conversions from aggregate and consented signals to keep measurement accurate as identifiers disappear.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{AggregateConsistency}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{AggregateConsistency} | Penalty when the modelled conversions do not add up to the aggregate totals reported by the platform. |

**Hard constraints**

- Privacy thresholds
- Calibration against consented panel
- Transparency about modelled vs observed
- Regulatory

## The approach in one paragraph

Start with report observed conversions only and accept undercounting. Then earn the move to bias-corrected conversion model trained on consented traffic, applied to aggregates with differential-privacy noise and uncertainty intervals, and only if it beats the baseline on Error vs consented holdout and Interval coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Consented-user conversion rate | Rate in observable population. Anchor. Guard against: sampling. |
| Add Consent-rate by segment | Share consenting. Bias correction. Guard against: estimates. |
| Add Aggregate click-to-conversion lag | Lag distribution. Timing. Guard against: windows. |
| Run it as one pipeline | Consented events (SDK), Aggregate logs (lake), Conversion model (GBDT), Bias correction (consent weighting), DP aggregation (noise addition) and Panel calibration (validation), with Reporting API off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle consent mix shifts after banner redesign | Consent-aware reweighting and monitoring. |

**Deliberately not doing**

- Raw IDs: not allowed.
- Page URLs with identifiers: privacy risk.

**How the approach is proven**

Prove it offline on Error vs consented holdout and Interval coverage using time-ordered splits, then online on "Reported vs true conversion gap" with "Advertiser trust" as the guardrail. Watch for: Consented users differ from non-consented and Evaluating without privacy noise.

## Baseline and production design

- **Baseline (build this first):** Report observed conversions only and accept undercounting.
- **Production design:** Bias-corrected conversion model trained on consented traffic, applied to aggregates with differential-privacy noise and uncertainty intervals.

## Why AI, and why this kind

**Why AI.** Estimate unobservable conversions from aggregate and consented signals to keep measurement accurate as identifiers disappear. The evidence that separates good from bad outcomes (Consented-user conversion rate, Consent-rate by segment, Aggregate click-to-conversion lag) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "trust modelled totals blindly" are what teams reach for first, and they fail because model drift goes unnoticed without anchors. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Bias-corrected conversion model trained on consented traffic, applied to aggregates with differential-privacy noise and uncertainty intervals.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Consented-user conversion rate, Consent-rate by segment, Aggregate click-to-conversion lag and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Report observed conversions only and accept undercounting | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Bias-corrected conversion model trained on consented traffic, applied to aggregates with differential-privacy noise and uncertainty intervals | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Reported vs true conversion gap) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Consented users differ from non-consented.
- Evaluation trap: Evaluating without privacy noise.
- Consent mix shifts after banner redesign: a consent banner redesign changes who consents, biasing the model trained on consented traffic.
- Small segments hit privacy thresholds: metrics unavailable.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
