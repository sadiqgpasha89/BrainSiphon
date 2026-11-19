# HVAC Energy Optimisation: use-case brief

> Generated from the blueprint `real-estate/hvac-energy-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** HVAC Energy Optimisation · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Control heating and cooling setpoints to cut energy use while keeping comfort within limits. The system has to run interactively, within a few seconds, inside these limits: Zone temperature and air quality stay within comfort bounds at all times, Safety interlocks on equipment always take priority over the controller and The controller falls back to the BMS schedule on any fault.

**Why it is hard.** The obvious approach is energy use alone as the objective, and it fails because a cold or hot office produces complaints, and the controller is switched off. The second trap is in "Model": the real signal is a thermal model fitted to the specific building, while teams usually reach for generic rules applied to all buildings.

**Scale and stakes.** At 10 million users this is about 864.0M model-touching events a day, 10.0K requests per second on average and 60.0K at peak, at an estimated $24.7K a month. A mistake is expensive in the way complaints measures it.

**What success looks like.** Offline: Energy saved in simulation and Comfort violations. Online: kWh and Complaints. The launch is judged on "kWh" while "Complaints" must not get worse.

## Objective, loss and constraints

**Business objective.** Control heating and cooling setpoints to cut energy use while keeping comfort within limits.

**Training objective.** `\max_\pi\;\mathbb{E}\!\left[\sum_t\gamma^t\left(-\text{energy}_t-\lambda\,\text{discomfort}_t\right)\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_\pi | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \gamma^t | Discount factor between 0 and 1: how much a reward one step later is worth compared with the same reward now. (one value per time step or token t) |
| \text{energy}_t | Energy consumed in step t, to be minimised. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \text{discomfort}_t | The comfort violation in step t: degrees outside the allowed band, weighted by occupancy. |

**Hard constraints**

- Zone temperature and air quality stay within comfort bounds at all times
- Safety interlocks on equipment always take priority over the controller
- The controller falls back to the BMS schedule on any fault
- Gradual rollout zone by zone with monitoring

## The approach in one paragraph

Start with fixed schedules with setpoints, because buildings use them. Then earn the move to model-predictive control with a learned thermal model and a safe RL layer inside bounds, and only if it beats the baseline on Energy saved in simulation and Comfort violations after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Zone temperature | Measured air temperature per zone with a sensor-quality flag. The state the controller tries to regulate. Guard against: sensors are noisy and can be placed badly. |
| Add Weather forecast | Forecast outside temperature and solar load for the next 6 hours. Lets the controller pre-cool or pre-heat. Guard against: forecasts have errors, so use ranges. |
| Add Occupancy forecast | Expected number of people per zone from bookings and badge counts. The main source of internal load. Guard against: data are aggregate and not personal. |
| Run it as one pipeline | Sensors (BMS), State estimator (model), Thermal model (learned), Controller (MPC), Safety layer (rules), BMS write (BACnet) and Energy log (lakehouse). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle sensor fault | Detect the fault and fall back to the schedule for that zone. |

**Deliberately not doing**

- Building name: A label that does not carry thermal behaviour.
- Valve ID: An identifier for equipment with no information on state.
- Sensor brand: Drift characteristics may differ but the brand name itself does not help.

**How the approach is proven**

Prove it offline on Energy saved in simulation and Comfort violations using time-ordered splits, then online on "kWh" with "Complaints" as the guardrail. Watch for: A simulator that does not match the real building gives gains that vanish on site and A mild test season hides performance in extremes.

## Baseline and production design

- **Baseline (build this first):** Fixed schedules with setpoints, because buildings use them.
- **Production design:** Model-predictive control with a learned thermal model and a safe RL layer inside bounds.

## Why AI, and why this kind

**Why AI.** Control heating and cooling setpoints to cut energy use while keeping comfort within limits. The evidence that separates good from bad outcomes (Zone temperature, Weather forecast, Occupancy forecast) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "energy use alone as the objective" are what teams reach for first, and they fail because A cold or hot office produces complaints, and the controller is switched off. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Model-predictive control with a learned thermal model and a safe RL layer inside bounds.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Zone temperature, Weather forecast, Occupancy forecast and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed schedules with setpoints, because buildings use them | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Model-predictive control with a learned thermal model and a safe RL layer inside bounds | chosen | Meets the 2500 ms envelope at $0.00095 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (kWh) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: A simulator that does not match the real building gives gains that vanish on site.
- Evaluation trap: A mild test season hides performance in extremes.
- Sensor fault: a faulty sensor sends wrong data and the controller reacts to it.
- Heatwave: extreme heat pushes the plant beyond its design capacity.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
