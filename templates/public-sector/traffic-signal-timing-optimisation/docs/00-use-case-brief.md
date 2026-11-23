# Traffic Signal Timing Optimisation: use-case brief

> Generated from the blueprint `public-sector/traffic-signal-timing-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Traffic Signal Timing Optimisation · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Adapt traffic signal timings to current flow so delays and emissions fall, within safety rules and with priority for buses, cyclists and pedestrians where policy requires it. The system has to run interactively, within a few seconds, inside these limits: Minimum green, clearance and pedestrian times enforced in the controller, Plans tested in simulation before use and Operators can revert at once.

**Why it is hard.** The obvious approach is vehicle throughput, and it fails because throughput can harm pedestrians and transit. The second trap is in "Safety": the real signal is hard timing limits in the controller, while teams usually reach for learned limits.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.7K a month. A mistake is expensive in the way bus travel time measures it.

**What success looks like.** Offline: Delay in simulation, Safety clip rate and Matched-period gains. Online: Person delay, Bus travel time and Pedestrian wait time. The launch is judged on "Person delay" while "Bus travel time" must not get worse.

## Objective, loss and constraints

**Business objective.** Adapt traffic signal timings to current flow so delays and emissions fall, within safety rules and with priority for buses, cyclists and pedestrians where policy requires it.

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

- Minimum green, clearance and pedestrian times enforced in the controller
- Plans tested in simulation before use
- Operators can revert at once
- Aggregated detector data only
- 800 junctions

## The approach in one paragraph

Start with fixed-time plans by time of day, because they are the standard configuration. Then earn the move to a model-based or reinforcement learning controller recommending timing plans from detector data with hard safety clips and a simulated test before field trials, and only if it beats the baseline on Delay in simulation and Safety clip rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Detector counts and occupancy | Flow and occupancy by approach. State. Guard against: from detectors. |
| Add Queue length estimate | Estimated queue per approach. Delay. Guard against: from detector models. |
| Add Transit and pedestrian demand | Buses and crossing requests. Priority. Guard against: from AVL and buttons. |
| Run it as one pipeline | Detector capture (traffic controllers), State estimation (queue model), Plan optimiser (controller policy), Safety clip (rules), Plan deployment with approval (traffic management centre), Performance evaluation (matched periods) and Retraining (monthly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle detector failure | Fallback to the fixed plan. |

**Deliberately not doing**

- Controller name: an identifier.
- Operator name: irrelevant.
- Log timestamp format: an artefact.

**How the approach is proven**

Prove it offline on Delay in simulation, Safety clip rate and Matched-period gains using time-ordered splits, then online on "Person delay" with "Bus travel time" as the guardrail. Watch for: Learned safety limits, Vehicle throughput as the only objective and Raw before-and-after comparisons.

## Baseline and production design

- **Baseline (build this first):** Fixed-time plans by time of day, because they are the standard configuration.
- **Production design:** A model-based or reinforcement learning controller recommending timing plans from detector data with hard safety clips and a simulated test before field trials.

## Why AI, and why this kind

**Why AI.** Adapt traffic signal timings to current flow so delays and emissions fall, within safety rules and with priority for buses, cyclists and pedestrians where policy requires it. The evidence that separates good from bad outcomes (Detector counts and occupancy, Queue length estimate, Transit and pedestrian demand) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "vehicle throughput" are what teams reach for first, and they fail because throughput can harm pedestrians and transit. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: A model-based or reinforcement learning controller recommending timing plans from detector data with hard safety clips and a simulated test before field trials.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Detector counts and occupancy, Queue length estimate, Transit and pedestrian demand and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed-time plans by time of day, because they are the standard configuration | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A model-based or reinforcement learning controller recommending timing plans from detector data with hard safety clips and a simulated test before field trials | chosen | Meets the 2500 ms envelope at $0.041 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Person delay) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Learned safety limits.
- Evaluation trap: Vehicle throughput as the only objective.
- Detector failure: counts are missing.
- Incident: a crash changes flow.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
