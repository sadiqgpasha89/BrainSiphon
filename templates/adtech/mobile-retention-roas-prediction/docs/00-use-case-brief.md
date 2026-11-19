# Mobile Retention & ROAS Prediction: use-case brief

> Generated from the blueprint `adtech/mobile-retention-roas-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Mobile Retention & ROAS Prediction · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict day-30 to day-365 retention and revenue from early cohort signals to steer user-acquisition budgets. The system has to run as a scheduled batch job, inside these limits: Cohorts with limited maturity, Platform privacy aggregation and Daily budget decisions.

**Why it is hard.** The obvious approach is point estimates at one day, and it fails because early data is noisy without shrinkage. The second trap is in "Cohorts": the real signal is cohort-level modelling under privacy limits, while teams usually reach for user-level predictions.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way payback accuracy measures it.

**What success looks like.** Offline: Forecast error at D180 and Interval coverage. Online: Realised vs predicted ROAS and Payback accuracy. The launch is judged on "Realised vs predicted ROAS" while "Payback accuracy" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict day-30 to day-365 retention and revenue from early cohort signals to steer user-acquisition budgets.

**Training objective.** `\mathcal{L}=\sum_t\left(r_t-\hat r_t\right)^2+\lambda\,\mathrm{CurveMonotonicity}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| r_t | Actual return on ad spend (ROAS) at day t of a cohort: r_t. |
| \hat{r}_t | The model's predicted value of the quantity r. (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{CurveMonotonicity} | Penalty when the predicted cumulative return curve goes down, since cumulative revenue cannot decrease. |

**Hard constraints**

- Cohorts with limited maturity
- Platform privacy aggregation
- Daily budget decisions
- Interpretable curves

## The approach in one paragraph

Start with industry benchmark retention curves. Then earn the move to hierarchical Bayesian cohort models with power-law retention curves and revenue forecasts, updated daily, and only if it beats the baseline on Forecast error at D180 and Interval coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Day-1 and day-3 retention | Early retention. Curve anchor. Guard against: cohort windows. |
| Add Early ARPDAU | Revenue per active user. Monetisation. Guard against: period. |
| Add Install source mix | Channel mix. Quality. Guard against: aggregates. |
| Run it as one pipeline | Cohort data (MMP and analytics), Cohort builder (Spark), Curve model (hierarchical Bayesian), Revenue projector (model), Budget advisor (rules), UA manager (human) and Matured outcomes (tracking). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle game update changes monetisation | Version-aware cohorts and change-point detection. |

**Deliberately not doing**

- Install hour: noise.
- App version only: confounded.

**How the approach is proven**

Prove it offline on Forecast error at D180 and Interval coverage using time-ordered splits, then online on "Realised vs predicted ROAS" with "Payback accuracy" as the guardrail. Watch for: Early curves extrapolated beyond observed range and Ignoring survivor effects.

## Baseline and production design

- **Baseline (build this first):** Industry benchmark retention curves.
- **Production design:** Hierarchical Bayesian cohort models with power-law retention curves and revenue forecasts, updated daily.

## Why AI, and why this kind

**Why AI.** Predict day-30 to day-365 retention and revenue from early cohort signals to steer user-acquisition budgets. The evidence that separates good from bad outcomes (Day-1 and day-3 retention, Early ARPDAU, Install source mix) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "point estimates at one day" are what teams reach for first, and they fail because early data is noisy without shrinkage. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Hierarchical Bayesian cohort models with power-law retention curves and revenue forecasts, updated daily.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Day-1 and day-3 retention, Early ARPDAU, Install source mix and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Industry benchmark retention curves | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hierarchical Bayesian cohort models with power-law retention curves and revenue forecasts, updated daily | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Realised vs predicted ROAS) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Early curves extrapolated beyond observed range.
- Evaluation trap: Ignoring survivor effects.
- Game update changes monetisation: curves shift abruptly.
- Seasonal events inflate early revenue: lTV overestimated.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
