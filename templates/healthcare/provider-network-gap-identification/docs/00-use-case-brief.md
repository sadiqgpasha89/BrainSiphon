# Provider Network Gap Identification: use-case brief

> Generated from the blueprint `healthcare/provider-network-gap-identification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Network Gap Identification · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find geographic and specialty coverage gaps against member demand, population distribution and service requirements, and give network planners gap maps, underserved cohorts and areas, and candidate expansion options with the access impact. The system has to run as a scheduled batch job, inside these limits: The network planning team validates candidate actions and the tool makes no contracting decision, Gaps are measured against versioned network rules and Member and population data are aggregated to geographic units that protect privacy.

**Why it is hard.** The obvious approach is population only, and it fails because gaps depend on who needs the service. The second trap is in "Access": the real signal is travel-time reach on the road network, while teams usually reach for straight-line buffers.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.6K a month. A mistake is expensive in the way planning time per cycle measures it.

**What success looks like.** Offline: Gap-detection agreement with planner review, Travel-time model error against observed trips and Stability of gap maps across periods. Online: Unserved demand reduced, Planning time per cycle and Candidate actions adopted. The launch is judged on "Unserved demand reduced" while "Planning time per cycle" must not get worse.

## Objective, loss and constraints

**Business objective.** Find geographic and specialty coverage gaps against member demand, population distribution and service requirements, and give network planners gap maps, underserved cohorts and areas, and candidate expansion options with the access impact.

**Training objective.** `\mathcal{L}=-\sum_i w_i\,[\,y_i\log p_i+(1-y_i)\log(1-p_i)\,]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_i | A weight that scales how much a particular example, class or term counts in the loss. (one value per example i) |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_i | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per example i) |

**Hard constraints**

- The network planning team validates candidate actions and the tool makes no contracting decision
- Gaps are measured against versioned network rules
- Member and population data are aggregated to geographic units that protect privacy
- Equity cuts are reported and sensitive attributes are used only in aggregate for access analysis
- Every gap shows its evidence
- Analyses 3K geographic units across 40 specialties quarterly

## The approach in one paragraph

Start with planners review provider counts per county once a year. Then earn the move to geospatial analysis with road-network travel times, spatial clustering of unserved demand, equity cuts in aggregate and candidate option generation with an access-impact simulation, and only if it beats the baseline on Gap-detection agreement with planner review and Travel-time model error against observed trips after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Unserved demand share | Demand outside the travel-time standard. The core gap measure. Guard against: demand and travel-time snapshot. |
| Add Provider density per member | Qualified providers per member by area. Capacity context. Guard against: directory snapshot. |
| Add Travel-time reach | Members within the standard of a qualified provider. Access measure. Guard against: road network version. |
| Run it as one pipeline | Directory and demand intake (warehouse extracts), Travel-time model (road-network routing), Unserved demand analyser (geospatial rules), Gap clusterer (spatial clustering) and Access impact simulator (scenario model), with Network planning review and Findings and audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle geographic barrier such as a river | Road-network routing. |

**Deliberately not doing**

- Area name: label.
- Provider marketing: not capacity.
- Postcode boundaries alone: arbitrary units.

**How the approach is proven**

Prove it offline on Gap-detection agreement with planner review, Travel-time model error against observed trips and Stability of gap maps across periods using time-ordered splits, then online on "Unserved demand reduced" with "Planning time per cycle" as the guardrail. Watch for: Using straight-line distance, Ignoring demand and Publishing individual-level lists.

## Baseline and production design

- **Baseline (build this first):** Planners review provider counts per county once a year.
- **Production design:** Geospatial analysis with road-network travel times, spatial clustering of unserved demand, equity cuts in aggregate and candidate option generation with an access-impact simulation.

## Why AI, and why this kind

**Why AI.** Find geographic and specialty coverage gaps against member demand, population distribution and service requirements, and give network planners gap maps, underserved cohorts and areas, and candidate expansion options with the access impact. The evidence that separates good from bad outcomes (Unserved demand share, Provider density per member, Travel-time reach) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "population only" are what teams reach for first, and they fail because gaps depend on who needs the service. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Geospatial analysis with road-network travel times, spatial clustering of unserved demand, equity cuts in aggregate and candidate option generation with an access-impact simulation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Unserved demand share, Provider density per member, Travel-time reach and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Planners review provider counts per county once a year | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Geospatial analysis with road-network travel times, spatial clustering of unserved demand, equity cuts in aggregate and candidate option generation with an access-impact simulation | chosen | Meets the run-window envelope at $0.091 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unserved demand reduced) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using straight-line distance.
- Evaluation trap: Ignoring demand.
- Geographic barrier such as a river: travel time is longer than distance.
- Small area: demand is noisy.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
