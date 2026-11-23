# Data Centre Energy Optimisation: use-case brief

> Generated from the blueprint `it-ops/data-centre-energy-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Data Centre Energy Optimisation · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend cooling and airflow set points and workload placement that lower energy use while keeping temperatures inside equipment limits, tested in simulation and rolled out by facility engineers. The system has to run interactively, within a few seconds, inside these limits: Inlet temperatures never exceed vendor limits, Set point changes limited to 1 degree per hour and Facility engineers approve changes.

**Why it is hard.** The obvious approach is lowest temperature, and it fails because over-cooling wastes energy. The second trap is in "Safety": the real signal is hard limits and rollback, while teams usually reach for unbounded control.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.8K a month. A mistake is expensive in the way temperature excursions measures it.

**What success looks like.** Offline: Temperature limit compliance in simulation, Energy saving in replay and Prediction error. Online: Power usage effectiveness, Temperature excursions and Cooling energy. The launch is judged on "Power usage effectiveness" while "Temperature excursions" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend cooling and airflow set points and workload placement that lower energy use while keeping temperatures inside equipment limits, tested in simulation and rolled out by facility engineers.

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

- Inlet temperatures never exceed vendor limits
- Set point changes limited to 1 degree per hour
- Facility engineers approve changes
- Decision within 60 s
- 40 halls

## The approach in one paragraph

Start with fixed set points and rule-based economiser modes, because they are the standard control. Then earn the move to a control recommender that learns the hall response in simulation, proposes small set point moves with limits and shows the energy effect for engineers to approve, and only if it beats the baseline on Temperature limit compliance in simulation and Energy saving in replay after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Inlet temperature by rack | Temperature at servers. Constraint. Guard against: from sensors. |
| Add IT load | Power drawn by servers. State. Guard against: from power meters. |
| Add Outside weather | Temperature and humidity. Driver. Guard against: from weather feeds. |
| Run it as one pipeline | Sensor data (building systems), Simulator calibration (physics model), Policy search (optimiser), Limit check (rules), Engineer approval (console), Set point change (building system) and Energy tracking (analytics). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle sensor failure | Cross-checks and fail-safe. |

**Deliberately not doing**

- Rack name: an identifier.
- Vendor: weak link.
- Operator name: personal data.

**How the approach is proven**

Prove it offline on Temperature limit compliance in simulation, Energy saving in replay and Prediction error using time-ordered splits, then online on "Power usage effectiveness" with "Temperature excursions" as the guardrail. Watch for: Lowest temperature as the goal, Live-only trials and No hard limits.

## Baseline and production design

- **Baseline (build this first):** Fixed set points and rule-based economiser modes, because they are the standard control.
- **Production design:** A control recommender that learns the hall response in simulation, proposes small set point moves with limits and shows the energy effect for engineers to approve.

## Why AI, and why this kind

**Why AI.** Recommend cooling and airflow set points and workload placement that lower energy use while keeping temperatures inside equipment limits, tested in simulation and rolled out by facility engineers. The evidence that separates good from bad outcomes (Inlet temperature by rack, IT load, Outside weather) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "lowest temperature" are what teams reach for first, and they fail because over-cooling wastes energy. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: A control recommender that learns the hall response in simulation, proposes small set point moves with limits and shows the energy effect for engineers to approve.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Inlet temperature by rack, IT load, Outside weather and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed set points and rule-based economiser modes, because they are the standard control | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A control recommender that learns the hall response in simulation, proposes small set point moves with limits and shows the energy effect for engineers to approve | chosen | Meets the 2500 ms envelope at $0.042 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Power usage effectiveness) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Lowest temperature as the goal.
- Evaluation trap: Live-only trials.
- Sensor failure: a temperature sensor drifts.
- Hot spot: one rack runs hot.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
