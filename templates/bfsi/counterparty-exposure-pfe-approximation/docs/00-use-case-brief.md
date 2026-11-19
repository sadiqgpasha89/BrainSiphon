# Counterparty Exposure (PFE) Approximation with ML: use-case brief

> Generated from the blueprint `bfsi/counterparty-exposure-pfe-approximation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Counterparty Exposure (PFE) Approximation with ML · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Approximate potential future exposure for trade-level pre-deal checks fast enough for traders, matching the full Monte Carlo engine within tolerance. The system has to run interactively, within a few seconds, inside these limits: Approximation error within the risk-approved tolerance, Fallback to the full engine for large trades and Model re-trained after market regime changes.

**Why it is hard.** The obvious approach is replacing the engine entirely, and it fails because the engine remains the system of record. The second trap is in "Tail": the real signal is the 95th percentile profile over time, while teams usually reach for expected exposure.

**Scale and stakes.** At 10 million users this is about 120.0M model-touching events a day, 1.4K requests per second on average and 8.3K at peak, at an estimated $12.8K a month. A mistake is expensive in the way limit breaches caught measures it.

**What success looks like.** Offline: Mean absolute error versus engine and 95th percentile coverage. Online: Pre-deal checks completed within 300 ms and Limit breaches caught. The launch is judged on "Pre-deal checks completed within 300 ms" while "Limit breaches caught" must not get worse.

## Objective, loss and constraints

**Business objective.** Approximate potential future exposure for trade-level pre-deal checks fast enough for traders, matching the full Monte Carlo engine within tolerance.

**Training objective.** `\mathcal{L}=\mathrm{MSE}(\hat{y},y)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.95},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{MSE} | Mean squared error: the average of squared differences between prediction and truth. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Pinball} | Pinball (quantile) loss: penalises under- and over-prediction asymmetrically so the output is a chosen quantile, such as the 90th percentile, rather than the average. |
| \hat{q}_{0.95} | The model's predicted value at the chosen quantile. |

**Hard constraints**

- Approximation error within the risk-approved tolerance
- Fallback to the full engine for large trades
- Model re-trained after market regime changes
- Response under 300 ms

## The approach in one paragraph

Start with add-on method from the regulatory standard, because it is a conservative estimate with no modelling. Then earn the move to a neural surrogate of the Monte Carlo PFE profile with quantile outputs, trained on daily engine runs and with an error monitor that escalates to the full engine, and only if it beats the baseline on Mean absolute error versus engine and 95th percentile coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Trade sensitivities | Delta, vega and DV01 of the trade and the set. Drives exposure. Guard against: computed on the same curves. |
| Add Market volatility level | Implied volatility of the main risk factors. Drives the width of the distribution. Guard against: source differences. |
| Add Netting set composition | Notional by product and tenor. Describes diversification. Guard against: changes each day. |
| Run it as one pipeline | Pre-deal request (trading front end), Feature assembler (risk data service), PFE surrogate (neural net on GPU), Error monitor (shadow comparison), Limit checker (rules), Trader response (API) and Engine runs (nightly Monte Carlo). |
| Optimise the right thing | The objective weighs mean squared error: the average of squared differences between prediction and truth, so the model is trained on the cost of the decision and not on a generic score. |
| Handle exotic trade | Domain flag and fallback to the engine. |

**Deliberately not doing**

- Trade booking time: irrelevant.
- Trader identifier: irrelevant.
- Counterparty name: already represented.

**How the approach is proven**

Prove it offline on Mean absolute error versus engine and 95th percentile coverage using time-ordered splits, then online on "Pre-deal checks completed within 300 ms" with "Limit breaches caught" as the guardrail. Watch for: Training on calm periods and Test on trades similar to training trades.

## Baseline and production design

- **Baseline (build this first):** Add-on method from the regulatory standard, because it is a conservative estimate with no modelling.
- **Production design:** A neural surrogate of the Monte Carlo PFE profile with quantile outputs, trained on daily engine runs and with an error monitor that escalates to the full engine.

## Why AI, and why this kind

**Why AI.** Approximate potential future exposure for trade-level pre-deal checks fast enough for traders, matching the full Monte Carlo engine within tolerance. The evidence that separates good from bad outcomes (Trade sensitivities, Market volatility level, Netting set composition) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "replacing the engine entirely" are what teams reach for first, and they fail because the engine remains the system of record. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A neural surrogate of the Monte Carlo PFE profile with quantile outputs, trained on daily engine runs and with an error monitor that escalates to the full engine.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Trade sensitivities, Market volatility level, Netting set composition and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Add-on method from the regulatory standard, because it is a conservative estimate with no modelling | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A neural surrogate of the Monte Carlo PFE profile with quantile outputs, trained on daily engine runs and with an error monitor that escalates to the full engine | chosen | Meets the 2500 ms envelope at $0.0036 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Pre-deal checks completed within 300 ms) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on calm periods.
- Evaluation trap: Test on trades similar to training trades.
- Exotic trade: out of the surrogate's training domain.
- Volatility spike: market regime outside training.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
