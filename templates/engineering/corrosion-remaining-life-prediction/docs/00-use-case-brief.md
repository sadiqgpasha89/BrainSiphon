# Corrosion and Remaining Life Prediction: use-case brief

> Generated from the blueprint `engineering/corrosion-remaining-life-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Corrosion and Remaining Life Prediction · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate wall thickness loss rates and remaining life of pipes, tanks and steel structures from inspection data, so inspection intervals and repairs are planned within safety margins. The system has to run as a scheduled batch job, inside these limits: Remaining life shown as a range, Inspection intervals never exceed code limits and Engineers approve interval changes.

**Why it is hard.** The obvious approach is one reading, and it fails because one reading gives no rate. The second trap is in "Safety": the real signal is code minimum thickness and margins, while teams usually reach for model alone.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way inspection cost measures it.

**What success looks like.** Offline: Rate prediction error, Calibration of life ranges and Interval safety checks. Online: Leaks and failures, Inspection cost and Assets near minimum thickness. The launch is judged on "Leaks and failures" while "Inspection cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate wall thickness loss rates and remaining life of pipes, tanks and steel structures from inspection data, so inspection intervals and repairs are planned within safety margins.

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

- Remaining life shown as a range
- Inspection intervals never exceed code limits
- Engineers approve interval changes
- Conservative defaults for sparse data
- 200K inspection points

## The approach in one paragraph

Start with fixed inspection intervals by asset class, because they are the usual practice. Then earn the move to a risk-based inspection model that estimates corrosion rate and remaining life with uncertainty and proposes inspection intervals within codes for engineer approval, and only if it beats the baseline on Rate prediction error and Calibration of life ranges after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Thickness readings over time | Wall thickness history. Core. Guard against: from inspections. |
| Add Process conditions | Temperature, chemistry and flow. Driver. Guard against: from plant data. |
| Add Material and coating | Corrosion resistance. Context. Guard against: from asset data. |
| Run it as one pipeline | Inspection data (asset integrity system), Calibration and cleaning (rules), Corrosion rate model (statistics), Remaining life range (model), Interval proposal (rules), Engineer approval (integrity review) and Outcome tracking (yearly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle localised pitting | Pit-depth models. |

**Deliberately not doing**

- Inspector name: personal data.
- Tag format: an artefact.
- Report layout: an artefact.

**How the approach is proven**

Prove it offline on Rate prediction error, Calibration of life ranges and Interval safety checks using time-ordered splits, then online on "Leaks and failures" with "Inspection cost" as the guardrail. Watch for: One reading rates, Model-only safety limits and Mixed-instrument data.

## Baseline and production design

- **Baseline (build this first):** Fixed inspection intervals by asset class, because they are the usual practice.
- **Production design:** A risk-based inspection model that estimates corrosion rate and remaining life with uncertainty and proposes inspection intervals within codes for engineer approval.

## Why AI, and why this kind

**Why AI.** Estimate wall thickness loss rates and remaining life of pipes, tanks and steel structures from inspection data, so inspection intervals and repairs are planned within safety margins. The evidence that separates good from bad outcomes (Thickness readings over time, Process conditions, Material and coating) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one reading" are what teams reach for first, and they fail because one reading gives no rate. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A risk-based inspection model that estimates corrosion rate and remaining life with uncertainty and proposes inspection intervals within codes for engineer approval.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Thickness readings over time, Process conditions, Material and coating and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed inspection intervals by asset class, because they are the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A risk-based inspection model that estimates corrosion rate and remaining life with uncertainty and proposes inspection intervals within codes for engineer approval | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Leaks and failures) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: One reading rates.
- Evaluation trap: Model-only safety limits.
- Localised pitting: average thickness hides deep pits.
- Process upset: conditions change suddenly.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
