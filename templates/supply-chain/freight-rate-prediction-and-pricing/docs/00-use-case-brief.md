# Freight Rate Prediction & Pricing: use-case brief

> Generated from the blueprint `supply-chain/freight-rate-prediction-and-pricing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Freight Rate Prediction & Pricing · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Quote spot and contract freight rates instantly using lane market data, capacity and customer value, balancing win rate and margin. The system has to run in under 100 milliseconds, inside these limits: Quote in 100 ms, Margin floors and Volatile fuel and capacity.

**Why it is hard.** The obvious approach is own historical rates, and it fails because own rates lag the market. The second trap is in "Win": the real signal is win probability curve vs price, while teams usually reach for cost-plus pricing.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.6K a month. A mistake is expensive in the way quote win rate measures it.

**What success looks like.** Offline: MAPE of rate and Win-curve calibration. Online: Margin per load and Quote win rate. The launch is judged on "Margin per load" while "Quote win rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Quote spot and contract freight rates instantly using lane market data, capacity and customer value, balancing win rate and margin.

**Training objective.** `\mathcal{L}=\mathrm{Huber}(\log r,\log\hat r)+\lambda\,\mathrm{WinProbCalibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| r | The freight rate; the hat is the model's predicted rate. |
| \hat{r} | The model's predicted value of the quantity r. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{WinProbCalibration} | Penalty when predicted win probabilities at a given price do not match how often bids win. |

**Hard constraints**

- Quote in 100 ms
- Margin floors
- Volatile fuel and capacity
- Auditability of quotes

## The approach in one paragraph

Start with cost-plus quoting with fuel surcharge. Then earn the move to gradient-boosted rate model with market indices and a win-probability model feeding a margin-maximising price optimiser, and only if it beats the baseline on MAPE of rate and Win-curve calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Lane market index | Rolling spot index per lane. Market level. Guard against: index lag. |
| Add Capacity tightness | Load-to-truck ratio. Price pressure. Guard against: real-time. |
| Add Customer price sensitivity | Quote-win history. Win curve. Guard against: prior. |
| Run it as one pipeline | Quote request (TMS), Market feature service (index store), Rate model (LightGBM), Win-probability model (logistic GBDT), Price optimiser (constrained search), Sales approval (human) and Quote outcomes (CRM). |
| Optimise the right thing | The objective weighs huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training, so the model is trained on the cost of the decision and not on a generic score. |
| Handle hurricane disrupts capacity | Event features and wide intervals. |

**Deliberately not doing**

- Quote ID: none.
- Salesperson name: personal.

**How the approach is proven**

Prove it offline on MAPE of rate and Win-curve calibration using time-ordered splits, then online on "Margin per load" with "Quote win rate" as the guardrail. Watch for: Won quotes only in training and Using final rate as feature.

## Baseline and production design

- **Baseline (build this first):** Cost-plus quoting with fuel surcharge.
- **Production design:** Gradient-boosted rate model with market indices and a win-probability model feeding a margin-maximising price optimiser.

## Why AI, and why this kind

**Why AI.** Quote spot and contract freight rates instantly using lane market data, capacity and customer value, balancing win rate and margin. The evidence that separates good from bad outcomes (Lane market index, Capacity tightness, Customer price sensitivity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "own historical rates" are what teams reach for first, and they fail because own rates lag the market. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient-boosted rate model with market indices and a win-probability model feeding a margin-maximising price optimiser.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Lane market index, Capacity tightness, Customer price sensitivity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Cost-plus quoting with fuel surcharge | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient-boosted rate model with market indices and a win-probability model feeding a margin-maximising price optimiser | chosen | Meets the 80 ms envelope at $0.041 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Margin per load) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Won quotes only in training.
- Evaluation trap: Using final rate as feature.
- Hurricane disrupts capacity: capacity collapses and spot rates spike beyond anything the model has seen.
- Rate data vendor outage: stale market index.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
