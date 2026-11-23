# SD-WAN Path Selection: use-case brief

> Generated from the blueprint `it-ops/sd-wan-path-selection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SD-WAN Path Selection · **Domain:** it-ops · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose network paths per application class using latency, loss and cost so critical applications keep their targets while lower-cost links carry tolerant traffic. The system has to run in under 100 milliseconds, inside these limits: Critical applications keep latency under 150 ms, Failover within 2 s and Policy by application class set by network owners.

**Why it is hard.** The obvious approach is lowest latency everywhere, and it fails because low latency costs more. The second trap is in "Safety": the real signal is failover rules and hold times, while teams usually reach for path flapping.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $4.7K a month. A mistake is expensive in the way wAN cost measures it.

**What success looks like.** Offline: Application target attainment in replay, Cost in replay and Switching rate. Online: Application quality complaints, WAN cost and Failover time. The launch is judged on "Application quality complaints" while "WAN cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose network paths per application class using latency, loss and cost so critical applications keep their targets while lower-cost links carry tolerant traffic.

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

- Critical applications keep latency under 150 ms
- Failover within 2 s
- Policy by application class set by network owners
- Cost caps per link
- 5K sites

## The approach in one paragraph

Start with static path preferences with failover, because they are the standard design. Then earn the move to a path selector using probe data and predicted quality with hold times and cost caps, tested in simulation on replayed measurements, and only if it beats the baseline on Application target attainment in replay and Cost in replay after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Path latency and loss | Measured quality per link. State. Guard against: from probes. |
| Add Application class | Priority and tolerance. Policy. Guard against: from the catalogue. |
| Add Link cost and capacity | Price and headroom. Constraint. Guard against: from contracts. |
| Run it as one pipeline | Probe data (SD-WAN edges), Quality forecast (time-series model), Policy and cost rules (policy engine), Path decision (controller), Hold time check (rules) and Quality tracking (analytics), with Policy review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle provider outage | Fast failover. |

**Deliberately not doing**

- Site name: weak link.
- Provider name: weak link.
- Device id: an identifier.

**How the approach is proven**

Prove it offline on Application target attainment in replay, Cost in replay and Switching rate using time-ordered splits, then online on "Application quality complaints" with "WAN cost" as the guardrail. Watch for: Lowest latency everywhere, Constant switching and Model-set priorities.

## Baseline and production design

- **Baseline (build this first):** Static path preferences with failover, because they are the standard design.
- **Production design:** A path selector using probe data and predicted quality with hold times and cost caps, tested in simulation on replayed measurements.

## Why AI, and why this kind

**Why AI.** Choose network paths per application class using latency, loss and cost so critical applications keep their targets while lower-cost links carry tolerant traffic. The evidence that separates good from bad outcomes (Path latency and loss, Application class, Link cost and capacity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "lowest latency everywhere" are what teams reach for first, and they fail because low latency costs more. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: A path selector using probe data and predicted quality with hold times and cost caps, tested in simulation on replayed measurements.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Path latency and loss, Application class, Link cost and capacity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static path preferences with failover, because they are the standard design | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A path selector using probe data and predicted quality with hold times and cost caps, tested in simulation on replayed measurements | chosen | Meets the 80 ms envelope at $0.0053 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Application quality complaints) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Lowest latency everywhere.
- Evaluation trap: Constant switching.
- Provider outage: a link goes down.
- Probe bias: probes differ from real traffic.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
