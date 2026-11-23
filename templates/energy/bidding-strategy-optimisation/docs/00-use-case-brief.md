# Bidding Strategy Optimisation: use-case brief

> Generated from the blueprint `energy/bidding-strategy-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Bidding Strategy Optimisation · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend bid curves for generation and storage portfolios that maximise expected margin under price uncertainty and physical constraints, as advice for traders to approve. The system has to run interactively, within a few seconds, inside these limits: Physical limits such as ramp and capacity enforced outside the model, Traders approve every bid and Risk limits and exposure caps in code.

**Why it is hard.** The obvious approach is learned limits, and it fails because infeasible or non-compliant bids are costly. The second trap is in "Evaluation": the real signal is backtests with market impact assumptions, while teams usually reach for historical price replay only.

**Scale and stakes.** At 10 million users this is about 72.0M model-touching events a day, 833 requests per second on average and 5.0K at peak, at an estimated $7.3K a month. A mistake is expensive in the way exposure limit breaches measures it.

**What success looks like.** Offline: Backtest margin with market impact, Constraint violation rate and Scenario calibration. Online: Margin against the rule-based baseline, Exposure limit breaches and Bids rejected by the market. The launch is judged on "Margin against the rule-based baseline" while "Exposure limit breaches" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend bid curves for generation and storage portfolios that maximise expected margin under price uncertainty and physical constraints, as advice for traders to approve.

**Training objective.** `\mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Physical limits such as ramp and capacity enforced outside the model
- Traders approve every bid
- Risk limits and exposure caps in code
- Market rules compliance checks
- Recommendations in 60 s

## The approach in one paragraph

Start with a rule-based bidding policy at marginal cost plus a margin, because it is the trader benchmark. Then earn the move to a stochastic optimisation with scenario trees and a learned value function, hard constraints and compliance checks in rules, and a trader approval step with explanations and risk views, and only if it beats the baseline on Backtest margin with market impact and Constraint violation rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Price scenario distribution | Scenario set from the price model. Uncertainty input. Guard against: from forecasts. |
| Add Unit availability and ramp limits | Physical limits per unit. Feasibility. Guard against: from plant status. |
| Add Storage state of charge | Stored energy and cycling limits. Dispatch limit. Guard against: from telemetry. |
| Run it as one pipeline | Scenario generation (price and renewable models), Constraint model (unit and storage limits), Bid optimiser (stochastic programme), Compliance and risk filter (rules), Bid submission (market gateway) and Post-trade analysis (daily), with Trader review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle market rule update | Versioned rules and block-on-error checks. |

**Deliberately not doing**

- Trader name: irrelevant.
- Market notice wording: an artefact.
- Terminal id: an identifier.

**How the approach is proven**

Prove it offline on Backtest margin with market impact, Constraint violation rate and Scenario calibration using time-ordered splits, then online on "Margin against the rule-based baseline" with "Exposure limit breaches" as the guardrail. Watch for: Autonomous bidding, Replay-only evaluation and Learned physical limits.

## Baseline and production design

- **Baseline (build this first):** A rule-based bidding policy at marginal cost plus a margin, because it is the trader benchmark.
- **Production design:** A stochastic optimisation with scenario trees and a learned value function, hard constraints and compliance checks in rules, and a trader approval step with explanations and risk views.

## Why AI, and why this kind

**Why AI.** Recommend bid curves for generation and storage portfolios that maximise expected margin under price uncertainty and physical constraints, as advice for traders to approve. The evidence that separates good from bad outcomes (Price scenario distribution, Unit availability and ramp limits, Storage state of charge) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "learned limits" are what teams reach for first, and they fail because infeasible or non-compliant bids are costly. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: A stochastic optimisation with scenario trees and a learned value function, hard constraints and compliance checks in rules, and a trader approval step with explanations and risk views.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Price scenario distribution, Unit availability and ramp limits, Storage state of charge and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A rule-based bidding policy at marginal cost plus a margin, because it is the trader benchmark | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A stochastic optimisation with scenario trees and a learned value function, hard constraints and compliance checks in rules, and a trader approval step with explanations and risk views | chosen | Meets the 2500 ms envelope at $0.0034 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Margin against the rule-based baseline) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Autonomous bidding.
- Evaluation trap: Replay-only evaluation.
- Market rule update: bid formats change.
- Model overconfidence: the scenario set is too narrow.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
