# Geo Experiments & Incrementality Testing: use-case brief

> Generated from the blueprint `adtech/incrementality-geo-experiments` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Geo Experiments & Incrementality Testing · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Design and analyse geo-based holdout tests that measure true incremental effect of ads when user-level tracking is unavailable. The system has to run as a scheduled batch job, inside these limits: Few geos, Spillover and Power and duration.

**Why it is hard.** The obvious approach is random split of a few geos, and it fails because with few geos random splits are badly imbalanced. The second trap is in "Inference": the real signal is time-based bootstrap and placebo tests, while teams usually reach for naive t-tests on geo means.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.6K a month. A mistake is expensive in the way test cost per decision measures it.

**What success looks like.** Offline: Placebo test false positive rate and Pre-period fit. Online: Decision agreement with later tests and Test cost per decision. The launch is judged on "Decision agreement with later tests" while "Test cost per decision" must not get worse.

## Objective, loss and constraints

**Business objective.** Design and analyse geo-based holdout tests that measure true incremental effect of ads when user-level tracking is unavailable.

**Training objective.** `\hat\tau=\arg\min\;\sum_t\left(y_{\text{treat},t}-\sum_j w_j y_{j,t}\right)^2\ \text{(synthetic control)}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \hat{\tau} | The estimated treatment effect (uplift): how much the treatment changes the outcome for this unit or group. |
| \arg | The argument that achieves the optimum: the setting of the variable below it that gives the best result. |
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| y_{\text{treat},t} | The outcome in a region at time t: y_treat for the treated region and y_j for control region j. |
| w_j | The weight given to control region j in the synthetic control, chosen so the blend matches the treated region before the test. |

**Hard constraints**

- Few geos
- Spillover
- Power and duration
- Cost of holding out

## The approach in one paragraph

Start with pre/post comparison in test regions. Then earn the move to synthetic control with Bayesian structural time series, power simulation for design and spillover-aware geo selection, and only if it beats the baseline on Placebo test false positive rate and Pre-period fit after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Pre-period fit quality | RMSE of synthetic control. Credibility. Guard against: window. |
| Add Geo similarity features | Pre-period trends and covariates. Matching. Guard against: data. |
| Add Spillover exposure | Cross-border exposure. Bias. Guard against: geography. |
| Run it as one pipeline | Geo-level outcome data (warehouse), Geo matcher (synthetic control), Power simulator (Monte Carlo), Test execution (ad platform), Effect estimator (BSTS) and Results registry (knowledge base), with Analyst review off the critical path. |
| Optimise the right thing | The objective weighs the estimated treatment effect (uplift): how much the treatment changes the outcome for this unit or group, so the model is trained on the cost of the decision and not on a generic score. |
| Handle concurrent campaigns contaminate holdout geos | Campaign calendar checks and exclusion rules. |

**Deliberately not doing**

- Geo name: none.
- Population only: insufficient matching.

**How the approach is proven**

Prove it offline on Placebo test false positive rate and Pre-period fit using time-ordered splits, then online on "Decision agreement with later tests" with "Test cost per decision" as the guardrail. Watch for: Using post-period information in matching and Ignoring spillover.

## Baseline and production design

- **Baseline (build this first):** Pre/post comparison in test regions.
- **Production design:** Synthetic control with Bayesian structural time series, power simulation for design and spillover-aware geo selection.

## Why AI, and why this kind

**Why AI.** Design and analyse geo-based holdout tests that measure true incremental effect of ads when user-level tracking is unavailable. The evidence that separates good from bad outcomes (Pre-period fit quality, Geo similarity features, Spillover exposure) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "random split of a few geos" are what teams reach for first, and they fail because with few geos random splits are badly imbalanced. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Synthetic control with Bayesian structural time series, power simulation for design and spillover-aware geo selection.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Pre-period fit quality, Geo similarity features, Spillover exposure and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Pre/post comparison in test regions | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Synthetic control with Bayesian structural time series, power simulation for design and spillover-aware geo selection | chosen | Meets the run-window envelope at $1.80 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Decision agreement with later tests) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using post-period information in matching.
- Evaluation trap: Ignoring spillover.
- Concurrent campaigns contaminate holdout geos: measured lift is biased.
- Insufficient power for small effect: inconclusive tests.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
