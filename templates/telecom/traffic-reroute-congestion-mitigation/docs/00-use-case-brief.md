# Traffic Reroute & Congestion Mitigation: use-case brief

> Generated from the blueprint `telecom/traffic-reroute-congestion-mitigation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Traffic Reroute & Congestion Mitigation · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend traffic engineering changes that relieve congested links and routes within safe limits, so peak-hour quality holds without manual rerouting. The system has to run interactively, within a few seconds, inside these limits: Changes limited to approved traffic-engineering templates, Every recommendation simulated against the topology before use and Human approval for changes that touch more than a set share of capacity.

**Why it is hard.** The obvious approach is average utilisation, and it fails because averages hide the single saturated link. The second trap is in "Safety": the real signal is simulated impact on all paths including failure cases, while teams usually reach for greedy local fix.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $3.9K a month. A mistake is expensive in the way customer-impacting packet loss measures it.

**What success looks like.** Offline: Predicted versus measured utilisation error, Share of plans passing simulated failure tests and Regret against an oracle on replayed days. Online: Minutes of congested links at peak, Customer-impacting packet loss and Manual reroutes. The launch is judged on "Minutes of congested links at peak" while "Customer-impacting packet loss" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend traffic engineering changes that relieve congested links and routes within safe limits, so peak-hour quality holds without manual rerouting.

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

- Changes limited to approved traffic-engineering templates
- Every recommendation simulated against the topology before use
- Human approval for changes that touch more than a set share of capacity
- Recommendation within 30 s of a congestion trigger

## The approach in one paragraph

Start with a rule that shifts traffic to the next-best path when utilisation passes a threshold, because it is simple and operators trust it. Then earn the move to a constrained policy search over a network simulator using a learned demand model, producing ranked reroute plans with predicted utilisation and a safety check, executed only through approved templates, and only if it beats the baseline on Predicted versus measured utilisation error and Share of plans passing simulated failure tests after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Link utilisation percentile | P95 utilisation over 5 minutes per link. Detects real congestion. Guard against: use matching windows with the SLA. |
| Add Demand matrix estimate | Estimated ingress to egress demand from flow records. Basis for simulation. Guard against: estimated demand has error bars. |
| Add Path diversity | Number of alternative paths with spare capacity. Limits the options. Guard against: needs live topology. |
| Run it as one pipeline | Telemetry and flow ingestion (streaming), Demand estimation (time-series model), Topology and capacity model (graph store), Plan search (simulator with policy search), Safety and approval gate (risk tiers), Template execution (traffic engineering controller) and Post-change validation (KPI check). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle demand spike from a live event | Use conservative upper quantiles and widen the headroom target. |

**Deliberately not doing**

- Customer name on the largest flow: does not change routing.
- Day of month: weak effect on load.
- Interface description text: free text.

**How the approach is proven**

Prove it offline on Predicted versus measured utilisation error, Share of plans passing simulated failure tests and Regret against an oracle on replayed days using time-ordered splits, then online on "Minutes of congested links at peak" with "Customer-impacting packet loss" as the guardrail. Watch for: Optimising mean utilisation, Skipping failure simulation and Applying plans without a dwell time.

## Baseline and production design

- **Baseline (build this first):** A rule that shifts traffic to the next-best path when utilisation passes a threshold, because it is simple and operators trust it.
- **Production design:** A constrained policy search over a network simulator using a learned demand model, producing ranked reroute plans with predicted utilisation and a safety check, executed only through approved templates.

## Why AI, and why this kind

**Why AI.** Recommend traffic engineering changes that relieve congested links and routes within safe limits, so peak-hour quality holds without manual rerouting. The evidence that separates good from bad outcomes (Link utilisation percentile, Demand matrix estimate, Path diversity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "average utilisation" are what teams reach for first, and they fail because averages hide the single saturated link. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: A constrained policy search over a network simulator using a learned demand model, producing ranked reroute plans with predicted utilisation and a safety check, executed only through approved templates.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Link utilisation percentile, Demand matrix estimate, Path diversity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A rule that shifts traffic to the next-best path when utilisation passes a threshold, because it is simple and operators trust it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A constrained policy search over a network simulator using a learned demand model, producing ranked reroute plans with predicted utilisation and a safety check, executed only through approved templates | chosen | Meets the 2500 ms envelope at $0.215 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Minutes of congested links at peak) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Optimising mean utilisation.
- Evaluation trap: Skipping failure simulation.
- Demand spike from a live event: the model underestimates demand.
- Failure during a change: the plan assumed a healthy network.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
