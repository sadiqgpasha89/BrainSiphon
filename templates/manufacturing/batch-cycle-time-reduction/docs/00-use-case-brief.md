# Batch Cycle-Time Reduction: use-case brief

> Generated from the blueprint `manufacturing/batch-cycle-time-reduction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Batch Cycle-Time Reduction · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict the shortest safe cycle time for each batch from raw material properties and early readings so batch processes finish sooner without hurting quality. The system has to run as a scheduled batch job, inside these limits: Quality limits are not relaxed, Recommendations reviewed by process engineers and Cycle time predictions with intervals.

**Why it is hard.** The obvious approach is time saved, and it fails because faster batches that fail are slower overall. The second trap is in "Signal": the real signal is early-stage readings that predict the end state, while teams usually reach for final readings.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $2.1K a month. A mistake is expensive in the way batches per month measures it.

**What success looks like.** Offline: Cycle-time error and interval coverage, Quality outcomes on trial batches and Time saved against matched controls. Online: Average cycle time, Batches per month and Off-spec batches. The launch is judged on "Average cycle time" while "Batches per month" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict the shortest safe cycle time for each batch from raw material properties and early readings so batch processes finish sooner without hurting quality.

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

- Quality limits are not relaxed
- Recommendations reviewed by process engineers
- Cycle time predictions with intervals
- 50K batches per year

## The approach in one paragraph

Start with the standard cycle time from the master recipe, because it is the planning basis. Then earn the move to a regression model on early readings and input properties predicting the end-point time with intervals, a policy proposing shorter hold times within validated limits and a staged trial, and only if it beats the baseline on Cycle-time error and interval coverage and Quality outcomes on trial batches after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Early reaction rate indicators | Slope of temperature and conversion in the first phase. Predicts duration. Guard against: per recipe. |
| Add Raw material assay values | Lab properties of the input lot. Variation driver. Guard against: from QC. |
| Add Equipment condition | Fouling and heating capacity. Slows the process. Guard against: from maintenance data. |
| Run it as one pipeline | Batch data capture (historian and batch system), Early-phase features (batch features), Cycle-time model (gradient boosting), Policy within limits (rules), Trial batches (matched controls) and Outcome tracking (quality results), with Engineer review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new raw material supplier | Supplier features and a conservative interval. |

**Deliberately not doing**

- Batch number: an identifier.
- Operator name: not a driver.
- Report timestamp: an artefact.

**How the approach is proven**

Prove it offline on Cycle-time error and interval coverage, Quality outcomes on trial batches and Time saved against matched controls using time-ordered splits, then online on "Average cycle time" with "Batches per month" as the guardrail. Watch for: Optimising time without quality, Using final readings and Raw averages across materials.

## Baseline and production design

- **Baseline (build this first):** The standard cycle time from the master recipe, because it is the planning basis.
- **Production design:** A regression model on early readings and input properties predicting the end-point time with intervals, a policy proposing shorter hold times within validated limits and a staged trial.

## Why AI, and why this kind

**Why AI.** Predict the shortest safe cycle time for each batch from raw material properties and early readings so batch processes finish sooner without hurting quality. The evidence that separates good from bad outcomes (Early reaction rate indicators, Raw material assay values, Equipment condition) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "time saved" are what teams reach for first, and they fail because faster batches that fail are slower overall. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A regression model on early readings and input properties predicting the end-point time with intervals, a policy proposing shorter hold times within validated limits and a staged trial.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Early reaction rate indicators, Raw material assay values, Equipment condition and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: The standard cycle time from the master recipe, because it is the planning basis | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A regression model on early readings and input properties predicting the end-point time with intervals, a policy proposing shorter hold times within validated limits and a staged trial | chosen | Meets the run-window envelope at $0.023 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Average cycle time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Optimising time without quality.
- Evaluation trap: Using final readings.
- New raw material supplier: the properties change.
- Equipment fouling: cycle time grows.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
