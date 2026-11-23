# Simulation Surrogate Modelling: use-case brief

> Generated from the blueprint `engineering/simulation-surrogate-modelling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Simulation Surrogate Modelling · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Train fast surrogate models on validated simulations so engineers can explore parameters in seconds, with uncertainty estimates and automatic fallback to the full solver outside the trained range. The system has to run interactively, within a few seconds, inside these limits: Prediction error under 3% within the trained range, Uncertainty shown for every prediction and Fallback to the full solver outside the range.

**Why it is hard.** The obvious approach is mixed-quality runs, and it fails because poor runs teach wrong physics. The second trap is in "Range": the real signal is an explicit validity range, while teams usually reach for extrapolation.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.7K a month. A mistake is expensive in the way solver hours measures it.

**What success looks like.** Offline: Error versus the solver, Uncertainty calibration and Fallback rate. Online: Time per design study, Solver hours and Surrogate errors found late. The launch is judged on "Time per design study" while "Solver hours" must not get worse.

## Objective, loss and constraints

**Business objective.** Train fast surrogate models on validated simulations so engineers can explore parameters in seconds, with uncertainty estimates and automatic fallback to the full solver outside the trained range.

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

- Prediction error under 3% within the trained range
- Uncertainty shown for every prediction
- Fallback to the full solver outside the range
- Models revalidated after solver changes
- Prediction within 1 s

## The approach in one paragraph

Start with running the full solver for each design point, because it is the verified method. Then earn the move to a surrogate service with uncertainty, range checks and automatic fallback that is retrained when solver versions or materials change, and only if it beats the baseline on Error versus the solver and Uncertainty calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Input parameter vector | Geometry and load parameters. Core. Guard against: from the design space. |
| Add Solver output fields | Stress, temperature or flow results. Target. Guard against: from simulations. |
| Add Mesh and solver settings | Numerical settings. Quality. Guard against: from run metadata. |
| Run it as one pipeline | Simulation database (solver outputs), Quality filter (rules), Surrogate training (neural or Gaussian process model), Uncertainty calibration (validation set), Range check and fallback (service), Engineer query (design tool) and Revalidation (solver update). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle out of range query | Automatic fallback to the solver. |

**Deliberately not doing**

- Run id: an identifier.
- User name: personal data.
- Cluster name: an artefact.

**How the approach is proven**

Prove it offline on Error versus the solver, Uncertainty calibration and Fallback rate using time-ordered splits, then online on "Time per design study" with "Solver hours" as the guardrail. Watch for: Extrapolation without checks, Surrogates for final verification and Unvalidated training runs.

## Baseline and production design

- **Baseline (build this first):** Running the full solver for each design point, because it is the verified method.
- **Production design:** A surrogate service with uncertainty, range checks and automatic fallback that is retrained when solver versions or materials change.

## Why AI, and why this kind

**Why AI.** Train fast surrogate models on validated simulations so engineers can explore parameters in seconds, with uncertainty estimates and automatic fallback to the full solver outside the trained range. The evidence that separates good from bad outcomes (Input parameter vector, Solver output fields, Mesh and solver settings) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "mixed-quality runs" are what teams reach for first, and they fail because poor runs teach wrong physics. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A surrogate service with uncertainty, range checks and automatic fallback that is retrained when solver versions or materials change.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Input parameter vector, Solver output fields, Mesh and solver settings and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Running the full solver for each design point, because it is the verified method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A surrogate service with uncertainty, range checks and automatic fallback that is retrained when solver versions or materials change | chosen | Meets the 2500 ms envelope at $0.041 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time per design study) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Extrapolation without checks.
- Evaluation trap: Surrogates for final verification.
- Out of range query: the design is outside trained data.
- Solver upgrade: physics settings change.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
