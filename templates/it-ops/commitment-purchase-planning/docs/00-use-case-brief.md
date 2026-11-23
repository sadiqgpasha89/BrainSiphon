# Commitment Purchase Planning: use-case brief

> Generated from the blueprint `it-ops/commitment-purchase-planning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Commitment Purchase Planning · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Plan reserved capacity and savings plan purchases from stable baseline usage forecasts, comparing terms and risk so finance approves commitments that will be used. The system has to run as a scheduled batch job, inside these limits: Commitments cover only the stable baseline, Finance approves every purchase and Scenarios for demand drop.

**Why it is hard.** The obvious approach is average usage, and it fails because commitments on average cause waste. The second trap is in "Risk": the real signal is demand drop scenarios, while teams usually reach for best case only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way effective savings rate measures it.

**What success looks like.** Offline: Baseline accuracy, Savings in backtests and Scenario coverage. Online: Commitment utilisation, Effective savings rate and Unused commitments. The launch is judged on "Commitment utilisation" while "Effective savings rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Plan reserved capacity and savings plan purchases from stable baseline usage forecasts, comparing terms and risk so finance approves commitments that will be used.

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

- Commitments cover only the stable baseline
- Finance approves every purchase
- Scenarios for demand drop
- Coverage targets by service
- 12 and 36 month terms compared

## The approach in one paragraph

Start with annual reviews of coverage by finance and cloud teams, because they are the usual process. Then earn the move to a planning model that sets baseline, tests scenarios, compares terms and presents a purchase plan with expected savings and downside to finance, and only if it beats the baseline on Baseline accuracy and Savings in backtests after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Stable usage floor | Lowest sustained usage. Core. Guard against: from billing. |
| Add Growth and migration plans | Planned changes. Risk. Guard against: from planning. |
| Add Price and term options | Rates by term. Savings. Guard against: from the provider. |
| Run it as one pipeline | Usage history (billing), Baseline estimate (time-series model), Scenario simulation (planner), Option comparison (calculator), Purchase (cloud console) and Utilisation tracking (monthly), with Plan review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle platform migration | Migration-aware scenarios. |

**Deliberately not doing**

- Account name: an identifier.
- Vendor sales contact: irrelevant.
- Invoice number: an identifier.

**How the approach is proven**

Prove it offline on Baseline accuracy, Savings in backtests and Scenario coverage using time-ordered splits, then online on "Commitment utilisation" with "Effective savings rate" as the guardrail. Watch for: Average usage as baseline, Best case only and Purchase without finance approval.

## Baseline and production design

- **Baseline (build this first):** Annual reviews of coverage by finance and cloud teams, because they are the usual process.
- **Production design:** A planning model that sets baseline, tests scenarios, compares terms and presents a purchase plan with expected savings and downside to finance.

## Why AI, and why this kind

**Why AI.** Plan reserved capacity and savings plan purchases from stable baseline usage forecasts, comparing terms and risk so finance approves commitments that will be used. The evidence that separates good from bad outcomes (Stable usage floor, Growth and migration plans, Price and term options) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "average usage" are what teams reach for first, and they fail because commitments on average cause waste. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A planning model that sets baseline, tests scenarios, compares terms and presents a purchase plan with expected savings and downside to finance.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Stable usage floor, Growth and migration plans, Price and term options and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Annual reviews of coverage by finance and cloud teams, because they are the usual process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A planning model that sets baseline, tests scenarios, compares terms and presents a purchase plan with expected savings and downside to finance | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Commitment utilisation) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Average usage as baseline.
- Evaluation trap: Best case only.
- Platform migration: workloads move away.
- Price change: the provider changes rates.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
