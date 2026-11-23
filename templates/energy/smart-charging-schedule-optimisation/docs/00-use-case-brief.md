# Smart Charging Schedule Optimisation: use-case brief

> Generated from the blueprint `energy/smart-charging-schedule-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Smart Charging Schedule Optimisation · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Schedule EV charging across a site or fleet to meet departure needs at the lowest cost within feeder and connection limits. The system has to run interactively, within a few seconds, inside these limits: Every vehicle meets its stated departure target unless the driver agrees otherwise, Site and feeder limits enforced in the controller and Drivers can override.

**Why it is hard.** The obvious approach is the cheapest schedule, and it fails because drivers must trust that cars are ready. The second trap is in "Limit": the real signal is hard connection and feeder limits, while teams usually reach for learned limits.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.7K a month. A mistake is expensive in the way peak site demand measures it.

**What success looks like.** Offline: Departure target attainment, Limit violation rate and Cost against the baseline. Online: Charging cost, Peak site demand and Driver complaints about readiness. The launch is judged on "Charging cost" while "Peak site demand" must not get worse.

## Objective, loss and constraints

**Business objective.** Schedule EV charging across a site or fleet to meet departure needs at the lowest cost within feeder and connection limits.

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

- Every vehicle meets its stated departure target unless the driver agrees otherwise
- Site and feeder limits enforced in the controller
- Drivers can override
- Re-plan every 5 minutes
- 20K sessions per day per region

## The approach in one paragraph

Start with charge at full power on plug-in, because it is the default behaviour. Then earn the move to a model-predictive scheduler with departure constraints and site limits, a fairness policy under scarcity and driver overrides with notifications, and only if it beats the baseline on Departure target attainment and Limit violation rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Departure time and energy needed | Driver-stated deadline and required energy. Constraint. Guard against: from the session. |
| Add Price signal | Time-of-use and wholesale prices. Cost objective. Guard against: from tariffs. |
| Add Site capacity headroom | Available power at the connection. Constraint. Guard against: from meters. |
| Run it as one pipeline | Session intake (charge point systems), Constraint model (site limits), Price and limit forecast (time-series model), Schedule optimiser (constrained solver), Command output (charger interface) and Driver notification (app), with Cost and fairness review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle early departure | Override and fast-charge options. |

**Deliberately not doing**

- Driver name: irrelevant and private.
- Vehicle plate: an identifier and private.
- Card number: an identifier.

**How the approach is proven**

Prove it offline on Departure target attainment, Limit violation rate and Cost against the baseline using time-ordered splits, then online on "Charging cost" with "Peak site demand" as the guardrail. Watch for: Cost without a promise, Learned limits and Opaque priority.

## Baseline and production design

- **Baseline (build this first):** Charge at full power on plug-in, because it is the default behaviour.
- **Production design:** A model-predictive scheduler with departure constraints and site limits, a fairness policy under scarcity and driver overrides with notifications.

## Why AI, and why this kind

**Why AI.** Schedule EV charging across a site or fleet to meet departure needs at the lowest cost within feeder and connection limits. The evidence that separates good from bad outcomes (Departure time and energy needed, Price signal, Site capacity headroom) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the cheapest schedule" are what teams reach for first, and they fail because drivers must trust that cars are ready. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A model-predictive scheduler with departure constraints and site limits, a fairness policy under scarcity and driver overrides with notifications.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Departure time and energy needed, Price signal, Site capacity headroom and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Charge at full power on plug-in, because it is the default behaviour | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A model-predictive scheduler with departure constraints and site limits, a fairness policy under scarcity and driver overrides with notifications | chosen | Meets the 2500 ms envelope at $0.041 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Charging cost) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Cost without a promise.
- Evaluation trap: Learned limits.
- Early departure: the driver leaves before the deadline.
- Charger fault: capacity drops mid-schedule.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
