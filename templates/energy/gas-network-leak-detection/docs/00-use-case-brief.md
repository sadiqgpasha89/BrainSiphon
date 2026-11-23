# Gas Network Leak Detection: use-case brief

> Generated from the blueprint `energy/gas-network-leak-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Gas Network Leak Detection · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect gas leaks along pipelines and in the distribution network from sensors, mobile survey data and pressure behaviour so repair crews are sent to the highest-risk leaks first. The system has to run as a scheduled batch job, inside these limits: Leak reports ranked by risk and proximity to people and buildings, Safety-critical reports escalate to a person immediately and Crew confirms on site.

**Why it is hard.** The obvious approach is leak count, and it fails because a small leak near buildings can matter more than a large one in a field. The second trap is in "Evidence": the real signal is sensor readings with wind and survey position, while teams usually reach for a single reading.

**Scale and stakes.** At 10 million users this is about 60.0M model-touching events a day, 694 requests per second on average and 694 at peak, at an estimated $12.3K a month. A mistake is expensive in the way emissions avoided measures it.

**What success looks like.** Offline: Location accuracy on confirmed leaks, Recall of high-risk leaks and Escalation correctness. Online: Time to repair high-risk leaks, Emissions avoided and False dispatches. The launch is judged on "Time to repair high-risk leaks" while "Emissions avoided" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect gas leaks along pipelines and in the distribution network from sensors, mobile survey data and pressure behaviour so repair crews are sent to the highest-risk leaks first.

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

- Leak reports ranked by risk and proximity to people and buildings
- Safety-critical reports escalate to a person immediately
- Crew confirms on site
- Works with survey vehicle data
- 100K km of main

## The approach in one paragraph

Start with scheduled surveys of mains with portable detectors and public reports, because it is the regulated method. Then earn the move to a source localisation model that combines survey readings with wind data and a risk ranking by receptors, with an immediate escalation rule for dangerous readings, and only if it beats the baseline on Location accuracy on confirmed leaks and Recall of high-risk leaks after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Methane concentration enhancement | Readings above background. Leak signal. Guard against: from survey sensors. |
| Add Wind speed and direction | Wind at measurement time. Dispersion model. Guard against: from weather. |
| Add Distance to buildings and roads | Proximity to receptors. Risk. Guard against: from GIS. |
| Run it as one pipeline | Survey and sensor ingestion (vehicles and fixed sensors), Background correction (signal processing), Source localisation (dispersion model), Risk ranking (rules and model) and Crew dispatch (work management), with Emergency escalation and Repair feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle sewer gas | Isotope or odour flags where available. |

**Deliberately not doing**

- Vehicle name: irrelevant.
- Survey route id: an identifier.
- Report author: irrelevant.

**How the approach is proven**

Prove it offline on Location accuracy on confirmed leaks, Recall of high-risk leaks and Escalation correctness using time-ordered splits, then online on "Time to repair high-risk leaks" with "Emissions avoided" as the guardrail. Watch for: Counting leaks equally, No wind data and No immediate escalation for danger.

## Baseline and production design

- **Baseline (build this first):** Scheduled surveys of mains with portable detectors and public reports, because it is the regulated method.
- **Production design:** A source localisation model that combines survey readings with wind data and a risk ranking by receptors, with an immediate escalation rule for dangerous readings.

## Why AI, and why this kind

**Why AI.** Detect gas leaks along pipelines and in the distribution network from sensors, mobile survey data and pressure behaviour so repair crews are sent to the highest-risk leaks first. The evidence that separates good from bad outcomes (Methane concentration enhancement, Wind speed and direction, Distance to buildings and roads) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "leak count" are what teams reach for first, and they fail because A small leak near buildings can matter more than a large one in a field. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A source localisation model that combines survey readings with wind data and a risk ranking by receptors, with an immediate escalation rule for dangerous readings.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Methane concentration enhancement, Wind speed and direction, Distance to buildings and roads and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Scheduled surveys of mains with portable detectors and public reports, because it is the regulated method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A source localisation model that combines survey readings with wind data and a risk ranking by receptors, with an immediate escalation rule for dangerous readings | chosen | Meets the run-window envelope at $0.0069 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to repair high-risk leaks) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Counting leaks equally.
- Evaluation trap: No wind data.
- Sewer gas: methane is not from the network.
- Calm wind: dispersion is unclear.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
