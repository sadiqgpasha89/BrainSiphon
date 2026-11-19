# Bayesian Marketing Mix Modelling: use-case brief

> Generated from the blueprint `adtech/marketing-mix-modeling-bayesian` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Bayesian Marketing Mix Modelling · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate channel-level incremental ROI and saturation curves from aggregate data to guide cross-channel budgets. The system has to run as a scheduled batch job, inside these limits: Aggregate weekly data, Priors from experiments and Multicollinearity.

**Why it is hard.** The obvious approach is fit only observational data, and it fails because collinear channels are not separable without experiments. The second trap is in "Dynamics": the real signal is adstock carryover and saturation curves, while teams usually reach for linear spend effects.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way forecast accuracy of planned outcomes measures it.

**What success looks like.** Offline: Out-of-sample MAPE and Posterior calibration vs experiments. Online: ROAS of reallocated budget and Forecast accuracy of planned outcomes. The launch is judged on "ROAS of reallocated budget" while "Forecast accuracy of planned outcomes" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate channel-level incremental ROI and saturation curves from aggregate data to guide cross-channel budgets.

**Training objective.** `y_t=\alpha+\sum_c\beta_c\,\mathrm{Hill}\!\left(\mathrm{Adstock}(x_{c,t})\right)+\gamma^\top z_t+\varepsilon_t`

**Loss variables**

| Symbol | Meaning |
|---|---|
| y_t | Sales (or another outcome) at time t. |
| \alpha | Baseline sales when there is no marketing. |
| \sum_c | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \beta_c | The effect of channel c: how strongly its transformed spend drives sales. |
| \mathrm{Hill} | Hill function: an S-shaped saturation curve in which each extra unit of spend adds less. |
| \mathrm{Adstock} | Adstock: the lagged, decaying effect of past advertising on later periods. |
| x_{c,t} | Spend in channel c at time t. |
| \gamma^\top | Coefficients on the control variables. |
| z_t | Control variables such as seasonality, price and holidays: z_t at time t. |
| \varepsilon_t | Random noise: the part of the outcome the model does not explain. (one value per time step or token t) |

**Hard constraints**

- Aggregate weekly data
- Priors from experiments
- Multicollinearity
- Stakeholder trust

## The approach in one paragraph

Start with linear regression of sales on channel spend. Then earn the move to hierarchical Bayesian MMM with experiment-informed priors, time-varying coefficients and budget optimiser using posterior samples, and only if it beats the baseline on Out-of-sample MAPE and Posterior calibration vs experiments after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Adstock decay parameter | Geometric carryover per channel. Lag effect. Guard against: prior. |
| Add Saturation half-saturation point | Hill curve parameter. Diminishing returns. Guard against: spend range. |
| Add Seasonality and baseline | Trend and holidays. Baseline. Guard against: calendar. |
| Run it as one pipeline | Spend and outcome data (warehouse), Feature builder (adstock transform), Bayesian model (PyMC or NumPyro), Calibration with lift tests (priors), Budget optimiser (posterior simulation), Marketing leadership (human) and Post-campaign validation (holdouts). |
| Optimise the right thing | The objective weighs sales (or another outcome) at time t, so the model is trained on the cost of the decision and not on a generic score. |
| Handle spend moves in lockstep across channels | Staggered tests and informative priors. |

**Deliberately not doing**

- Daily noise in spend: aggregated weekly.
- Creative-level data: too granular.

**How the approach is proven**

Prove it offline on Out-of-sample MAPE and Posterior calibration vs experiments using time-ordered splits, then online on "ROAS of reallocated budget" with "Forecast accuracy of planned outcomes" as the guardrail. Watch for: Overfitting with many parameters on short history and Treating posterior mean as certain.

## Baseline and production design

- **Baseline (build this first):** Linear regression of sales on channel spend.
- **Production design:** Hierarchical Bayesian MMM with experiment-informed priors, time-varying coefficients and budget optimiser using posterior samples.

## Why AI, and why this kind

**Why AI.** Estimate channel-level incremental ROI and saturation curves from aggregate data to guide cross-channel budgets. The evidence that separates good from bad outcomes (Adstock decay parameter, Saturation half-saturation point, Seasonality and baseline) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fit only observational data" are what teams reach for first, and they fail because collinear channels are not separable without experiments. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Hierarchical Bayesian MMM with experiment-informed priors, time-varying coefficients and budget optimiser using posterior samples.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Adstock decay parameter, Saturation half-saturation point, Seasonality and baseline and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Linear regression of sales on channel spend | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hierarchical Bayesian MMM with experiment-informed priors, time-varying coefficients and budget optimiser using posterior samples | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (ROAS of reallocated budget) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Overfitting with many parameters on short history.
- Evaluation trap: Treating posterior mean as certain.
- Spend moves in lockstep across channels: channel effects unidentifiable.
- Structural break (new product launch): baseline shifts.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
