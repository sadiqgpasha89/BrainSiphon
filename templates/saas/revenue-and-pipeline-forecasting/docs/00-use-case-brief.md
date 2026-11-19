# Revenue & Pipeline Forecasting: use-case brief

> Generated from the blueprint `saas/revenue-and-pipeline-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Revenue & Pipeline Forecasting · **Domain:** saas · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast bookings and ARR by quarter at deal and segment level with calibrated ranges for planning. The system has to run as a scheduled batch job, inside these limits: Sparse deals relative to rows, Rep optimism bias and Reproducible commits.

**Why it is hard.** The obvious approach is rep-reported commit only, and it fails because reps over- and under-call systematically. The second trap is in "Dynamics": the real signal is stage ageing and slippage, while teams usually reach for stage probabilities fixed.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way commit accuracy measures it.

**What success looks like.** Offline: Calibration of deal win probabilities and Quarter forecast error and interval coverage. Online: Forecast accuracy at week 6 and Commit accuracy. The launch is judged on "Forecast accuracy at week 6" while "Commit accuracy" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast bookings and ARR by quarter at deal and segment level with calibrated ranges for planning.

**Training objective.** `\mathcal{L}=\sum_q\rho_q\!\left(y-\hat y^{(q)}\right)+\mathrm{BCE}(\text{deal win})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_q | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_q | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. (one value per quantile level q) |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \hat{y}^{(q)} | The model's prediction of y. (one value per quantile level q) |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{deal win} | The label: 1 if a sales opportunity is won. |

**Hard constraints**

- Sparse deals relative to rows
- Rep optimism bias
- Reproducible commits
- Weekly updates

## The approach in one paragraph

Start with weighted pipeline by stage probability. Then earn the move to deal-level calibrated GBDT with slippage model, Monte Carlo aggregation to quarter outcomes and bias-corrected rep commits, and only if it beats the baseline on Calibration of deal win probabilities and Quarter forecast error and interval coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Deal stage age vs norm | Days in stage over median. Stall. Guard against: cRM history. |
| Add Multi-threading | Number of engaged contacts. Deal strength. Guard against: cRM. |
| Add Quote and legal activity | Quotes sent and redlines. Late-stage intent. Guard against: event timing. |
| Run it as one pipeline | CRM snapshots (warehouse), Deal feature builder (dbt), Win and slippage models (GBDT), Monte Carlo aggregator (simulation), Forecast dashboard (BI), Sales leadership (human) and Realised bookings (calibration). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle cRM hygiene lapses | Stage-hygiene features and data-quality alerts. |

**Deliberately not doing**

- Rep name: personal.
- Deal name: none.

**How the approach is proven**

Prove it offline on Calibration of deal win probabilities and Quarter forecast error and interval coverage using time-ordered splits, then online on "Forecast accuracy at week 6" with "Commit accuracy" as the guardrail. Watch for: Using stage at close in features and Evaluating total-only not deal-level.

## Baseline and production design

- **Baseline (build this first):** Weighted pipeline by stage probability.
- **Production design:** Deal-level calibrated GBDT with slippage model, Monte Carlo aggregation to quarter outcomes and bias-corrected rep commits.

## Why AI, and why this kind

**Why AI.** Forecast bookings and ARR by quarter at deal and segment level with calibrated ranges for planning. The evidence that separates good from bad outcomes (Deal stage age vs norm, Multi-threading, Quote and legal activity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "rep-reported commit only" are what teams reach for first, and they fail because reps over- and under-call systematically. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Deal-level calibrated GBDT with slippage model, Monte Carlo aggregation to quarter outcomes and bias-corrected rep commits.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Deal stage age vs norm, Multi-threading, Quote and legal activity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Weighted pipeline by stage probability | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Deal-level calibrated GBDT with slippage model, Monte Carlo aggregation to quarter outcomes and bias-corrected rep commits | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Forecast accuracy at week 6) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using stage at close in features.
- Evaluation trap: Evaluating total-only not deal-level.
- CRM hygiene lapses: stale stages mislead models.
- Quarter-end discounting pushes deals early: seasonality distorts.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
