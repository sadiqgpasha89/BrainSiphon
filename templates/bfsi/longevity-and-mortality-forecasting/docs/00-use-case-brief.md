# Longevity & Mortality Forecasting: use-case brief

> Generated from the blueprint `bfsi/longevity-and-mortality-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Longevity & Mortality Forecasting · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast mortality improvement by age and cohort for pension and annuity pricing and reserving. The system has to run as a scheduled batch job, inside these limits: Methods and assumptions align with actuarial standards for reserving and pricing, Every forecast is shown with uncertainty bands and Assumptions refreshed once a year with a documented change log.

**Why it is hard.** The obvious approach is the current level of mortality, and it fails because reserves depend on how fast mortality changes in future, not where it is today. The second trap is in "Shock": the real signal is one-off shocks such as pandemics treated explicitly, while teams usually reach for averaging through the shock years.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way pricing margin measures it.

**What success looks like.** Offline: Out-of-sample log mortality error and Coverage. Online: Reserve movement from assumptions and Pricing margin. The launch is judged on "Reserve movement from assumptions" while "Pricing margin" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast mortality improvement by age and cohort for pension and annuity pricing and reserving.

**Training objective.** `\mathcal{L}=\mathrm{Poisson}(\hat{y},y)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.95},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Poisson} | Poisson likelihood: a probability model for counts of events. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Pinball} | Pinball (quantile) loss: penalises under- and over-prediction asymmetrically so the output is a chosen quantile, such as the 90th percentile, rather than the average. |
| \hat{q}_{0.95} | The model's predicted value at the chosen quantile. |

**Hard constraints**

- Methods and assumptions align with actuarial standards for reserving and pricing
- Every forecast is shown with uncertainty bands
- Assumptions refreshed once a year with a documented change log
- Every adjustment is justified in writing for the actuary

## The approach in one paragraph

Start with standard mortality tables with an improvement scale, because they are widely accepted. Then earn the move to bayesian cohort model with credibility-weighted portfolio experience and scenarios for medical change and shocks, and only if it beats the baseline on Out-of-sample log mortality error and Coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Age-period-cohort effects | Decomposition of log mortality into age, period and cohort terms. Gives the structure for projection. Guard against: the three effects are not fully identifiable, so impose a documented constraint. |
| Add Population improvement | National mortality improvement rate by age band over the last 10 years. Anchors the projection to a published trend. Guard against: revisions change past values. |
| Add Portfolio experience ratio | Actual deaths divided by expected deaths for the portfolio. Adjusts the population to the portfolio. Guard against: credibility is low for small portfolios, so blend. |
| Run it as one pipeline | Population data (statistics offices), Portfolio deaths (policy admin), Mortality model (Bayesian model), Credibility blender (actuarial rules), Scenario generator (simulations), Pricing and reserving feeds (actuarial systems) and Documentation (model risk). |
| Optimise the right thing | The objective weighs poisson likelihood: a probability model for counts of events, so the model is trained on the cost of the decision and not on a generic score. |
| Handle pandemic years | Exclude those years or add dummy period effects and document the choice. |

**Deliberately not doing**

- Policy ID: An identifier with no relation to mortality.
- Broker: The sales channel does not change mortality once the product is known.
- Month of death: Seasonal noise that does not matter for annual rates.

**How the approach is proven**

Prove it offline on Out-of-sample log mortality error and Coverage using time-ordered splits, then online on "Reserve movement from assumptions" with "Pricing margin" as the guardrail. Watch for: A back-test through stable years makes any trend model look accurate and Revisions to published death counts mean the data used at the time differ from today's.

## Baseline and production design

- **Baseline (build this first):** Standard mortality tables with an improvement scale, because they are widely accepted.
- **Production design:** Bayesian cohort model with credibility-weighted portfolio experience and scenarios for medical change and shocks.

## Why AI, and why this kind

**Why AI.** Forecast mortality improvement by age and cohort for pension and annuity pricing and reserving. The evidence that separates good from bad outcomes (Age-period-cohort effects, Population improvement, Portfolio experience ratio) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the current level of mortality" are what teams reach for first, and they fail because reserves depend on how fast mortality changes in future, not where it is today. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Bayesian cohort model with credibility-weighted portfolio experience and scenarios for medical change and shocks.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Age-period-cohort effects, Population improvement, Portfolio experience ratio and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Standard mortality tables with an improvement scale, because they are widely accepted | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Bayesian cohort model with credibility-weighted portfolio experience and scenarios for medical change and shocks | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Reserve movement from assumptions) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: A back-test through stable years makes any trend model look accurate.
- Evaluation trap: Revisions to published death counts mean the data used at the time differ from today's.
- Pandemic years: excess deaths in pandemic years distort the trend.
- Data lag: the latest year of death data is incomplete when the forecast is made.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
