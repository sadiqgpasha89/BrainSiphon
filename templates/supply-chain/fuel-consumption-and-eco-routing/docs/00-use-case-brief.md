# Fuel Consumption Prediction & Eco-Routing: use-case brief

> Generated from the blueprint `supply-chain/fuel-consumption-and-eco-routing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fuel Consumption Prediction & Eco-Routing · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict vehicle fuel use per route segment and choose routes and speeds that cut fuel and emissions at acceptable time cost. The system has to run as a scheduled batch job, inside these limits: Time-window feasibility, Emission reporting and Vehicle heterogeneity.

**Why it is hard.** The obvious approach is distance only, and it fails because fuel depends strongly on grade and load. The second trap is in "Trade-off": the real signal is cost-optimal route including time cost, while teams usually reach for fuel-minimal route.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 69 at peak, at an estimated $1.8K a month. A mistake is expensive in the way cO2 per tonne-km measures it.

**What success looks like.** Offline: MAPE of fuel per trip and Realised savings in A/B routes. Online: Fuel per delivery and CO2 per tonne-km. The launch is judged on "Fuel per delivery" while "CO2 per tonne-km" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict vehicle fuel use per route segment and choose routes and speeds that cut fuel and emissions at acceptable time cost.

**Training objective.** `\mathcal{L}=\mathrm{Huber}(F,\hat F)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| F | Fuel consumed on a trip; the hat is the model's prediction. |
| \hat{F} | The model's predicted cumulative probability. |

**Hard constraints**

- Time-window feasibility
- Emission reporting
- Vehicle heterogeneity
- Monthly model refresh

## The approach in one paragraph

Start with fuel per kilometre average per vehicle type. Then earn the move to physics-informed gradient-boosted fuel model per vehicle class feeding a multi-objective router, and only if it beats the baseline on MAPE of fuel per trip and Realised savings in A/B routes after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Road grade profile | Elevation along route. Energy. Guard against: dEM data. |
| Add Vehicle mass estimate | Payload plus tare. Fuel use. Guard against: load data. |
| Add Speed profile variance | Stop-go intensity. Efficiency. Guard against: traffic. |
| Run it as one pipeline | Telematics and routes (lake), Segment feature builder (GIS join), Fuel model (GBDT with physics features), Eco-router (multi-objective search), Plan publisher (routing system), Dispatcher (human) and Actual fuel (fuel cards). |
| Optimise the right thing | The objective weighs huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training, so the model is trained on the cost of the decision and not on a generic score. |
| Handle fuel card data misattributed | Reconciliation of fuel cards with telematics. |

**Deliberately not doing**

- Driver age: personal.
- Colour: none.

**How the approach is proven**

Prove it offline on MAPE of fuel per trip and Realised savings in A/B routes using time-ordered splits, then online on "Fuel per delivery" with "CO2 per tonne-km" as the guardrail. Watch for: Training on fuel cards with timing error and Ignoring payload variation.

## Baseline and production design

- **Baseline (build this first):** Fuel per kilometre average per vehicle type.
- **Production design:** Physics-informed gradient-boosted fuel model per vehicle class feeding a multi-objective router.

## Why AI, and why this kind

**Why AI.** Predict vehicle fuel use per route segment and choose routes and speeds that cut fuel and emissions at acceptable time cost. The evidence that separates good from bad outcomes (Road grade profile, Vehicle mass estimate, Speed profile variance) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "distance only" are what teams reach for first, and they fail because fuel depends strongly on grade and load. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Physics-informed gradient-boosted fuel model per vehicle class feeding a multi-objective router.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Road grade profile, Vehicle mass estimate, Speed profile variance and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fuel per kilometre average per vehicle type | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Physics-informed gradient-boosted fuel model per vehicle class feeding a multi-objective router | chosen | Meets the run-window envelope at $0.0098 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Fuel per delivery) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on fuel cards with timing error.
- Evaluation trap: Ignoring payload variation.
- Fuel card data misattributed: fuel purchases are linked to the wrong vehicle, so training labels carry large errors.
- New vehicle model: a vehicle model with no history gets unreliable fuel predictions from the class average.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
