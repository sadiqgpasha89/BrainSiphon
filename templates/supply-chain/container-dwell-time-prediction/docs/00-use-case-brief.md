# Container Dwell-Time Prediction: use-case brief

> Generated from the blueprint `supply-chain/container-dwell-time-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Container Dwell-Time Prediction · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict how long import containers stay in port to plan yard capacity, trucking and demurrage exposure. The system has to run as a scheduled batch job, inside these limits: Censoring for still-in-yard containers, Daily refresh and Interpretable for terminal planners.

**Why it is hard.** The obvious approach is regression on completed dwell only, and it fails because completed-only data underestimates long dwell. The second trap is in "Parties": the real signal is consignee and customs-broker behaviour, while teams usually reach for container attributes only.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 1 at peak, at an estimated $1.6K a month. A mistake is expensive in the way demurrage costs measures it.

**What success looks like.** Offline: Concordance index and Calibration of dwell quantiles. Online: Yard utilisation forecast error and Demurrage costs. The launch is judged on "Yard utilisation forecast error" while "Demurrage costs" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict how long import containers stay in port to plan yard capacity, trucking and demurrage exposure.

**Training objective.** `\mathcal{L}=-\sum_i\left[\delta_i\log h(t_i)-H(t_i)\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \delta_i | Event indicator: 1 if the container left the yard, 0 if still there at the end of observation. |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| h | The hazard: the chance the container leaves at time t given it is still in the yard. |
| t_i | The time the container left or was last observed. |
| H | The cumulative hazard up to time t_i. |

**Hard constraints**

- Censoring for still-in-yard containers
- Daily refresh
- Interpretable for terminal planners
- Data from multiple parties

## The approach in one paragraph

Start with average dwell by shipping line. Then earn the move to discrete-time survival GBDT with customs-stage features and consignee embeddings, and only if it beats the baseline on Concordance index and Calibration of dwell quantiles after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Customs status stage | Cleared, hold, pending. Release gating. Guard against: event times. |
| Add Consignee dwell history | Median dwell of past boxes. Behaviour. Guard against: prior only. |
| Add Weekend and holiday gap | Days until next working day. Operational. Guard against: calendar. |
| Run it as one pipeline | Port and customs events (TOS), Feature builder (Spark), Survival model (GBDT), Yard capacity forecast (aggregation), Planner dashboard (BI), Terminal planner (human) and Release events (labels). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle customs system outage | Outage flag and widened predictions. |

**Deliberately not doing**

- Container colour: none.
- Seal number: none.

**How the approach is proven**

Prove it offline on Concordance index and Calibration of dwell quantiles using time-ordered splits, then online on "Yard utilisation forecast error" with "Demurrage costs" as the guardrail. Watch for: Training on completed containers only and Using clearance time as a feature before it happens.

## Baseline and production design

- **Baseline (build this first):** Average dwell by shipping line.
- **Production design:** Discrete-time survival GBDT with customs-stage features and consignee embeddings.

## Why AI, and why this kind

**Why AI.** Predict how long import containers stay in port to plan yard capacity, trucking and demurrage exposure. The evidence that separates good from bad outcomes (Customs status stage, Consignee dwell history, Weekend and holiday gap) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "regression on completed dwell only" are what teams reach for first, and they fail because completed-only data underestimates long dwell. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Discrete-time survival GBDT with customs-stage features and consignee embeddings.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Customs status stage, Consignee dwell history, Weekend and holiday gap and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Average dwell by shipping line | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Discrete-time survival GBDT with customs-stage features and consignee embeddings | chosen | Meets the run-window envelope at $0.899 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Yard utilisation forecast error) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on completed containers only.
- Evaluation trap: Using clearance time as a feature before it happens.
- Customs system outage: no clearance events.
- Port congestion changes truck availability: dwell lengthens broadly.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
