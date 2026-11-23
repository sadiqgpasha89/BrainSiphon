# Digital Twin Calibration: use-case brief

> Generated from the blueprint `engineering/digital-twin-calibration` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Digital Twin Calibration · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Calibrate simulation models of assets and buildings with sensor data, track model error over time and show when the twin can no longer be trusted for decisions. The system has to run as a scheduled batch job, inside these limits: Model error reported against measurements, Decisions flagged when error exceeds a limit and Engineers approve recalibration.

**Why it is hard.** The obvious approach is look realistic, and it fails because visuals do not mean validity. The second trap is in "Control": the real signal is validity limits and flags, while teams usually reach for unchecked use.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way model error measures it.

**What success looks like.** Offline: Prediction error against held-out data, Validity flag accuracy and Calibration stability. Online: Decisions on out-of-range models, Model error and Calibration effort. The launch is judged on "Decisions on out-of-range models" while "Model error" must not get worse.

## Objective, loss and constraints

**Business objective.** Calibrate simulation models of assets and buildings with sensor data, track model error over time and show when the twin can no longer be trusted for decisions.

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

- Model error reported against measurements
- Decisions flagged when error exceeds a limit
- Engineers approve recalibration
- Sensor quality checked
- Daily update for 500 assets

## The approach in one paragraph

Start with models calibrated once at commissioning, because it is the common practice. Then earn the move to a calibration service that fits parameters on recent data, reports error and validity range and flags decisions that rely on out-of-range twin outputs, and only if it beats the baseline on Prediction error against held-out data and Validity flag accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Model versus measurement error | Residuals. Core. Guard against: from sensors and model. |
| Add Parameter estimates | Calibrated values. Core. Guard against: from calibration. |
| Add Sensor quality | Drift and gaps. Quality. Guard against: from diagnostics. |
| Run it as one pipeline | Sensor and model data (twin platform), Quality filter (rules), Parameter calibration (optimiser), Validity flag (twin service), Engineer recalibration approval (review) and Change log (document system), with Error report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle drift absorbs a fault | Residual analysis by component. |

**Deliberately not doing**

- Vendor: weak link.
- Model file name: an artefact.
- Operator name: personal data.

**How the approach is proven**

Prove it offline on Prediction error against held-out data, Validity flag accuracy and Calibration stability using time-ordered splits, then online on "Decisions on out-of-range models" with "Model error" as the guardrail. Watch for: Realism as validity, Unchecked twin use and Automatic parameter drift.

## Baseline and production design

- **Baseline (build this first):** Models calibrated once at commissioning, because it is the common practice.
- **Production design:** A calibration service that fits parameters on recent data, reports error and validity range and flags decisions that rely on out-of-range twin outputs.

## Why AI, and why this kind

**Why AI.** Calibrate simulation models of assets and buildings with sensor data, track model error over time and show when the twin can no longer be trusted for decisions. The evidence that separates good from bad outcomes (Model versus measurement error, Parameter estimates, Sensor quality) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "look realistic" are what teams reach for first, and they fail because visuals do not mean validity. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A calibration service that fits parameters on recent data, reports error and validity range and flags decisions that rely on out-of-range twin outputs.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Model versus measurement error, Parameter estimates, Sensor quality and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Models calibrated once at commissioning, because it is the common practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A calibration service that fits parameters on recent data, reports error and validity range and flags decisions that rely on out-of-range twin outputs | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Decisions on out-of-range models) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Realism as validity.
- Evaluation trap: Unchecked twin use.
- Drift absorbs a fault: calibration hides damage.
- New operating regime: conditions leave the calibrated range.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
