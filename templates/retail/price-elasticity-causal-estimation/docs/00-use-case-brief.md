# Price Elasticity Estimation (Causal): use-case brief

> Generated from the blueprint `retail/price-elasticity-causal-estimation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Price Elasticity Estimation (Causal) · **Domain:** retail · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate causal price elasticities per category and segment for pricing and promotion decisions using experiments and quasi-experiments. The system has to run as a scheduled batch job, inside these limits: Interpretable confidence intervals, Few randomised tests and Heterogeneity by segment.

**Why it is hard.** The obvious approach is regression of quantity on price, and it fails because price endogeneity gives wrong signs. The second trap is in "Heterogeneity": the real signal is heterogeneous effects with honest uncertainty, while teams usually reach for one average elasticity.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way experiment cost saved measures it.

**What success looks like.** Offline: Calibration against holdout experiments and Coverage of confidence intervals. Online: Pricing lift realised vs predicted and Experiment cost saved. The launch is judged on "Pricing lift realised vs predicted" while "Experiment cost saved" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate causal price elasticities per category and segment for pricing and promotion decisions using experiments and quasi-experiments.

**Training objective.** `\hat\theta=\arg\min_\theta\sum_i\left(\tilde Y_i-\theta(X_i)\tilde T_i\right)^2\ \text{(double ML)}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \hat{\theta} | The estimated model parameters. |
| \arg | The argument that achieves the optimum: the setting of the variable below it that gives the best result. |
| \min_\theta | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \tilde{Y}_i | Demand with the part explained by other features removed. |
| \theta | The price elasticity: how much demand changes when price changes, allowed to depend on features X_i. |
| X_i | The matrix of input features for all examples. (one value per example i) |
| \tilde{T}_i | Price with the part explained by other features removed. |

**Hard constraints**

- Interpretable confidence intervals
- Few randomised tests
- Heterogeneity by segment
- Legal price testing limits

## The approach in one paragraph

Start with log-log OLS elasticity. Then earn the move to double machine learning with causal forests, experiment-calibrated priors and uncertainty-aware downstream consumption, and only if it beats the baseline on Calibration against holdout experiments and Coverage of confidence intervals after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Randomised price cell assignment | Experiment arm ID. Valid identification. Guard against: randomisation integrity. |
| Add Cost-shock instrument | Supplier cost changes. Instrument for price. Guard against: exclusion restriction. |
| Add Segment descriptors | Category, brand tier, customer segment. Heterogeneity. Guard against: pre-treatment only. |
| Run it as one pipeline | Experiment platform (price tests), Panel builder (lakehouse), Nuisance models (GBDT), DML estimator (causal forest), Uncertainty calibration (bootstrap), Elasticity store (versioned tables) and Pricing consumers (optimisers). |
| Optimise the right thing | The objective weighs the estimated model parameters, so the model is trained on the cost of the decision and not on a generic score. |
| Handle competitor price reaction during test | Competitor price covariates and shorter tests. |

**Deliberately not doing**

- Page views: post-treatment variable.
- Basket size: post-treatment.

**How the approach is proven**

Prove it offline on Calibration against holdout experiments and Coverage of confidence intervals using time-ordered splits, then online on "Pricing lift realised vs predicted" with "Experiment cost saved" as the guardrail. Watch for: Conditioning on post-treatment variables and Overlap failures in observational data.

## Baseline and production design

- **Baseline (build this first):** Log-log OLS elasticity.
- **Production design:** Double machine learning with causal forests, experiment-calibrated priors and uncertainty-aware downstream consumption.

## Why AI, and why this kind

**Why AI.** Estimate causal price elasticities per category and segment for pricing and promotion decisions using experiments and quasi-experiments. The evidence that separates good from bad outcomes (Randomised price cell assignment, Cost-shock instrument, Segment descriptors) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "regression of quantity on price" are what teams reach for first, and they fail because price endogeneity gives wrong signs. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Double machine learning with causal forests, experiment-calibrated priors and uncertainty-aware downstream consumption.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Randomised price cell assignment, Cost-shock instrument, Segment descriptors and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Log-log OLS elasticity | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Double machine learning with causal forests, experiment-calibrated priors and uncertainty-aware downstream consumption | chosen | Meets the run-window envelope at $0.180 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Pricing lift realised vs predicted) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Conditioning on post-treatment variables.
- Evaluation trap: Overlap failures in observational data.
- Competitor price reaction during test: contaminated effect.
- Stock-outs in test cells: stock-outs censor sales in some price cells and bias elasticity estimates.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
