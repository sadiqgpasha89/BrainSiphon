# Utility Plant Setpoint Optimisation: use-case brief

> Generated from the blueprint `manufacturing/utility-plant-setpoint-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Utility Plant Setpoint Optimisation · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend chiller, boiler and cooling tower setpoints and staging to meet plant demand at the lowest energy cost within comfort and process limits. The system has to run interactively, within a few seconds, inside these limits: Limits on temperatures and pressures enforced in code, Operator approves any setpoint change and Simulation test before live use.

**Why it is hard.** The obvious approach is a generic regression, and it fails because plant equipment has known curves. The second trap is in "Limits": the real signal is hard limits outside the model, while teams usually reach for learned limits.

**Scale and stakes.** At 10 million users this is about 36.0M model-touching events a day, 417 requests per second on average and 2.5K at peak, at an estimated $6.3K a month. A mistake is expensive in the way energy per unit of cooling measures it.

**What success looks like.** Offline: Predicted versus measured energy on matched periods, Safety clip rate and Forecast error. Online: Utility energy cost, Energy per unit of cooling and Comfort or process limit breaches. The launch is judged on "Utility energy cost" while "Energy per unit of cooling" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend chiller, boiler and cooling tower setpoints and staging to meet plant demand at the lowest energy cost within comfort and process limits.

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

- Limits on temperatures and pressures enforced in code
- Operator approves any setpoint change
- Simulation test before live use
- Recommendation every 10 minutes for 80 plants

## The approach in one paragraph

Start with fixed staging rules and setpoints by season, because they are the standard operating procedures. Then earn the move to a model-predictive or optimisation layer on equipment curves and forecasts that proposes staging and setpoints, advice-only at first with matched-control evaluation and a safety clip, and only if it beats the baseline on Predicted versus measured energy on matched periods and Safety clip rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Equipment efficiency curve | Measured efficiency against load. Choice of units to run. Guard against: fit per equipment. |
| Add Load forecast | Cooling and heating demand forecast. Planning. Guard against: from the energy forecast. |
| Add Weather and wet-bulb temperature | Ambient conditions. Efficiency driver. Guard against: forecast. |
| Run it as one pipeline | Plant telemetry (BMS and historian), Equipment models (fitted curves), Load and weather forecast (time-series model), Optimiser (constrained solver), Safety clip (rules), Operator advice display (HMI) and Savings evaluation (matched controls). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle equipment failure | Fast re-optimisation with the remaining units. |

**Deliberately not doing**

- Operator name: irrelevant.
- Equipment tag: an identifier.
- Log timestamp precision: an artefact.

**How the approach is proven**

Prove it offline on Predicted versus measured energy on matched periods, Safety clip rate and Forecast error using time-ordered splits, then online on "Utility energy cost" with "Energy per unit of cooling" as the guardrail. Watch for: Learned safety limits, Raw before-and-after savings and Ignoring weather.

## Baseline and production design

- **Baseline (build this first):** Fixed staging rules and setpoints by season, because they are the standard operating procedures.
- **Production design:** A model-predictive or optimisation layer on equipment curves and forecasts that proposes staging and setpoints, advice-only at first with matched-control evaluation and a safety clip.

## Why AI, and why this kind

**Why AI.** Recommend chiller, boiler and cooling tower setpoints and staging to meet plant demand at the lowest energy cost within comfort and process limits. The evidence that separates good from bad outcomes (Equipment efficiency curve, Load forecast, Weather and wet-bulb temperature) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A generic regression" are what teams reach for first, and they fail because plant equipment has known curves. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: A model-predictive or optimisation layer on equipment curves and forecasts that proposes staging and setpoints, advice-only at first with matched-control evaluation and a safety clip.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Equipment efficiency curve, Load forecast, Weather and wet-bulb temperature and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed staging rules and setpoints by season, because they are the standard operating procedures | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A model-predictive or optimisation layer on equipment curves and forecasts that proposes staging and setpoints, advice-only at first with matched-control evaluation and a safety clip | chosen | Meets the 2500 ms envelope at $0.0059 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Utility energy cost) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Learned safety limits.
- Evaluation trap: Raw before-and-after savings.
- Equipment failure: a chiller trips.
- Tariff change: the cost objective changes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
