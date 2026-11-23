# Soft Sensor for Hard-to-Measure Quantities: use-case brief

> Generated from the blueprint `manufacturing/soft-sensor-hard-to-measure-quantities` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Soft Sensor for Hard-to-Measure Quantities · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate quantities such as composition, viscosity or moisture that are measured rarely in a lab from fast process signals, so control and quality decisions can be made in real time. The system has to run interactively, within a few seconds, inside these limits: Estimates with an uncertainty range, Lab values override the estimate when available and Drift detection with retraining triggers.

**Why it is hard.** The obvious approach is lab sample time, and it fails because samples reflect the process earlier than they are logged. The second trap is in "Delay": the real signal is dynamic features that model the process delay, while teams usually reach for instantaneous values only.

**Scale and stakes.** At 10 million users this is about 36.0M model-touching events a day, 417 requests per second on average and 2.5K at peak, at an estimated $6.3K a month. A mistake is expensive in the way lab samples per week measures it.

**What success looks like.** Offline: Error against held-out lab values, Coverage of intervals and Drift detection delay. Online: Off-spec batches, Lab samples per week and Control loop variability. The launch is judged on "Off-spec batches" while "Lab samples per week" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate quantities such as composition, viscosity or moisture that are measured rarely in a lab from fast process signals, so control and quality decisions can be made in real time.

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

- Estimates with an uncertainty range
- Lab values override the estimate when available
- Drift detection with retraining triggers
- Latency under 2 s
- 5K soft sensors

## The approach in one paragraph

Start with a linear model on a few process variables fitted to lab data, because it is common and easy to maintain. Then earn the move to a dynamic model such as gradient boosting with lag features or a small recurrent network, with uncertainty, bias correction from each new lab value and drift monitoring, and only if it beats the baseline on Error against held-out lab values and Coverage of intervals after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Lagged process signals | Lagged temperature, flow and pressure features aligned to residence time. Primary drivers. Guard against: residence time from the process. |
| Add Recent lab residual | Error of the last lab values against the estimate. Online correction. Guard against: needs timely lab entry. |
| Add Feed property indicators | Measurements of the incoming material. Context. Guard against: from analysers. |
| Run it as one pipeline | Process and lab data join (historian and LIMS), Time alignment (residence-time shift), Soft sensor model (gradient boosting), Uncertainty and bias correction (online update), Output to control and HMI (OPC UA), Drift monitor (residual checks) and Retrain (triggered). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle process change | Drift alarm and a fallback to lab-only. |

**Deliberately not doing**

- Lab technician: not a process variable.
- Sample bottle number: an identifier.
- Report time: a logging artefact.

**How the approach is proven**

Prove it offline on Error against held-out lab values, Coverage of intervals and Drift detection delay using time-ordered splits, then online on "Off-spec batches" with "Lab samples per week" as the guardrail. Watch for: Using sample time as process time, Point estimates only and No fallback.

## Baseline and production design

- **Baseline (build this first):** A linear model on a few process variables fitted to lab data, because it is common and easy to maintain.
- **Production design:** A dynamic model such as gradient boosting with lag features or a small recurrent network, with uncertainty, bias correction from each new lab value and drift monitoring.

## Why AI, and why this kind

**Why AI.** Estimate quantities such as composition, viscosity or moisture that are measured rarely in a lab from fast process signals, so control and quality decisions can be made in real time. The evidence that separates good from bad outcomes (Lagged process signals, Recent lab residual, Feed property indicators) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "lab sample time" are what teams reach for first, and they fail because samples reflect the process earlier than they are logged. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A dynamic model such as gradient boosting with lag features or a small recurrent network, with uncertainty, bias correction from each new lab value and drift monitoring.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Lagged process signals, Recent lab residual, Feed property indicators and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A linear model on a few process variables fitted to lab data, because it is common and easy to maintain | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A dynamic model such as gradient boosting with lag features or a small recurrent network, with uncertainty, bias correction from each new lab value and drift monitoring | chosen | Meets the 2500 ms envelope at $0.0059 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Off-spec batches) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using sample time as process time.
- Evaluation trap: Point estimates only.
- Process change: the relation changes.
- Missing sensor input: a tag drops out.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
