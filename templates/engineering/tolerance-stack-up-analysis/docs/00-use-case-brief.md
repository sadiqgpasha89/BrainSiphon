# Tolerance Stack-Up Analysis: use-case brief

> Generated from the blueprint `engineering/tolerance-stack-up-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Tolerance Stack-Up Analysis · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Analyse how part tolerances combine in assemblies, estimate the share of assemblies that miss fit requirements and suggest which tolerances to tighten or relax at least cost. The system has to run as a scheduled batch job, inside these limits: Both worst-case and statistical results shown, Engineers approve tolerance changes and Cost impact shown for each change.

**Why it is hard.** The obvious approach is one method, and it fails because worst case alone is costly and statistics alone can hide risk. The second trap is in "Data": the real signal is measured process capability, while teams usually reach for nominal tolerances.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way tolerance cost measures it.

**What success looks like.** Offline: Predicted versus measured fit rate, Sensitivity accuracy and Cost estimate error. Online: Assemblies out of fit, Tolerance cost and Rework. The launch is judged on "Assemblies out of fit" while "Tolerance cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Analyse how part tolerances combine in assemblies, estimate the share of assemblies that miss fit requirements and suggest which tolerances to tighten or relax at least cost.

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

- Both worst-case and statistical results shown
- Engineers approve tolerance changes
- Cost impact shown for each change
- Analysis of 5,000 assemblies per year
- Sensitivity ranking for every requirement

## The approach in one paragraph

Start with spreadsheet worst-case stack-ups, because they are the standard method. Then earn the move to a tolerance analyser that combines CAD chains with measured process capability, runs Monte Carlo and worst-case checks and ranks tolerance changes by cost and yield effect, and only if it beats the baseline on Predicted versus measured fit rate and Sensitivity accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Tolerance chain | Dimensions that stack in a fit. Core. Guard against: from CAD. |
| Add Process capability | Measured spread of parts. Core. Guard against: from inspection data. |
| Add Fit requirement | Allowed gap or interference. Constraint. Guard against: from the design. |
| Run it as one pipeline | Chain extraction (CAD), Process data join (quality system), Monte Carlo and worst case (simulation), Sensitivity ranking (analytics), Cost trade-off (optimiser) and Result record (document system), with Engineer review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle non-normal process | Empirical distributions. |

**Deliberately not doing**

- Designer name: personal data.
- Part colour: irrelevant.
- File version: an artefact.

**How the approach is proven**

Prove it offline on Predicted versus measured fit rate, Sensitivity accuracy and Cost estimate error using time-ordered splits, then online on "Assemblies out of fit" with "Tolerance cost" as the guardrail. Watch for: Worst case only, Nominal data and Tightening everything.

## Baseline and production design

- **Baseline (build this first):** Spreadsheet worst-case stack-ups, because they are the standard method.
- **Production design:** A tolerance analyser that combines CAD chains with measured process capability, runs Monte Carlo and worst-case checks and ranks tolerance changes by cost and yield effect.

## Why AI, and why this kind

**Why AI.** Analyse how part tolerances combine in assemblies, estimate the share of assemblies that miss fit requirements and suggest which tolerances to tighten or relax at least cost. The evidence that separates good from bad outcomes (Tolerance chain, Process capability, Fit requirement) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one method" are what teams reach for first, and they fail because worst case alone is costly and statistics alone can hide risk. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A tolerance analyser that combines CAD chains with measured process capability, runs Monte Carlo and worst-case checks and ranks tolerance changes by cost and yield effect.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Tolerance chain, Process capability, Fit requirement and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Spreadsheet worst-case stack-ups, because they are the standard method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A tolerance analyser that combines CAD chains with measured process capability, runs Monte Carlo and worst-case checks and ranks tolerance changes by cost and yield effect | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Assemblies out of fit) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Worst case only.
- Evaluation trap: Nominal data.
- Non-normal process: measured parts are skewed.
- Assembly sequence: order changes the fit.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
