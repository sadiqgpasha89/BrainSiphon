# Site Selection for Retail & Logistics: use-case brief

> Generated from the blueprint `real-estate/site-selection-for-retail-and-logistics` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Site Selection for Retail & Logistics · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rank candidate locations for a store or warehouse by expected revenue or cost, using demographics, mobility, competition and network fit. The system has to run as a scheduled batch job, inside these limits: No protected attributes or close proxies in demand models, Cannibalisation of the company's own sites is modelled and shown and Data licences for mobility and demographic data are respected.

**Why it is hard.** The obvious approach is a fixed radius circle, and it fails because rivers, motorways and rail lines shape real catchments, so a circle misses where customers come from. The second trap is in "Cannibalisation": the real signal is the effect of a new site on the company's own nearby sites, while teams usually reach for the new site evaluated alone.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 1 at peak, at an estimated $1.8K a month. A mistake is expensive in the way hit rate measures it.

**What success looks like.** Offline: Revenue error and Rank correlation. Online: New site performance and Hit rate. The launch is judged on "New site performance" while "Hit rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Rank candidate locations for a store or warehouse by expected revenue or cost, using demographics, mobility, competition and network fit.

**Training objective.** `\mathcal{L}=\mathrm{Huber}(\hat{y}-y)+\lambda\,\mathrm{GraphReg}(z)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |
| z | The learned embedding of a site, regularised over the network graph of nearby sites and stores. |

**Hard constraints**

- No protected attributes or close proxies in demand models
- Cannibalisation of the company's own sites is modelled and shown
- Data licences for mobility and demographic data are respected
- An analyst reviews every ranked site before a committee sees it

## The approach in one paragraph

Start with gravity model on population, because it is standard. Then earn the move to revenue model with cannibalisation and a facility-location optimiser, and only if it beats the baseline on Revenue error and Rank correlation after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Catchment population | Residents within a 15-minute drive weighted by purchasing power. The main driver of demand. Guard against: census data age, so adjust with recent growth. |
| Add Competitor density | Number and size of competing stores within the catchment. Competition reduces demand. Guard against: definitions of a competitor differ, so use a consistent category. |
| Add Mobility flows | Anonymised footfall or vehicle counts passing the site, per hour. Shows actual movement of potential customers. Guard against: panels are samples, so check representativeness. |
| Run it as one pipeline | Site candidates (broker feeds), Catchment builder (routing), Demand model (boosting), Cannibalisation model (regression), Optimiser (solver), Committee pack (BI) and Outcome log (warehouse). |
| Optimise the right thing | The objective weighs huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new market | Use priors from similar markets and widen the intervals. |

**Deliberately not doing**

- Site name: A label that carries no demand information.
- Broker: The agent selling a site does not change its performance.
- Photo: Marketing images of the site do not change catchment or competition.

**How the approach is proven**

Prove it offline on Revenue error and Rank correlation using time-ordered splits, then online on "New site performance" with "Hit rate" as the guardrail. Watch for: Survivor sites are those that were opened and kept, so failed locations are missing from the data and Selection bias because the company opened sites where it expected success.

## Baseline and production design

- **Baseline (build this first):** Gravity model on population, because it is standard.
- **Production design:** Revenue model with cannibalisation and a facility-location optimiser.

## Why AI, and why this kind

**Why AI.** Rank candidate locations for a store or warehouse by expected revenue or cost, using demographics, mobility, competition and network fit. The evidence that separates good from bad outcomes (Catchment population, Competitor density, Mobility flows) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A fixed radius circle" are what teams reach for first, and they fail because rivers, motorways and rail lines shape real catchments, so a circle misses where customers come from. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Revenue model with cannibalisation and a facility-location optimiser.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Catchment population, Competitor density, Mobility flows and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Gravity model on population, because it is standard | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Revenue model with cannibalisation and a facility-location optimiser | chosen | Meets the run-window envelope at $0.983 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (New site performance) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Survivor sites are those that were opened and kept, so failed locations are missing from the data.
- Evaluation trap: Selection bias because the company opened sites where it expected success.
- New market: a new market has no existing stores to learn from.
- Road changes: a new road changes the catchment.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
