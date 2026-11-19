# Listing Price Recommendation & Time-to-Sell: use-case brief

> Generated from the blueprint `real-estate/listing-price-recommendation-and-time-to-sell` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Listing Price Recommendation & Time-to-Sell · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend a listing price and predict the days to sell at different prices so sellers and agents can trade price against time. The system has to run interactively, within a few seconds, inside these limits: Recommendations are advice not valuations, Price-time curves shown with intervals and Sellers decide.

**Why it is hard.** The obvious approach is dropping withdrawn listings, and it fails because dropping unsold listings makes homes look quicker to sell. The second trap is in "Price position": the real signal is listing price relative to the model value, while teams usually reach for absolute price.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $3.6K a month. A mistake is expensive in the way sale-to-list ratio measures it.

**What success looks like.** Offline: Concordance and Calibration of days to sell. Online: Median days on market and Sale-to-list ratio. The launch is judged on "Median days on market" while "Sale-to-list ratio" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend a listing price and predict the days to sell at different prices so sellers and agents can trade price against time.

**Training objective.** `\mathcal{L}=-\sum_i\left[\delta_i\log h(t_i\mid x_i,p_i)-\int_0^{t_i}h(u\mid x_i,p_i)\,du\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \delta_i | Event indicator: 1 if listing i sold, 0 if it was withdrawn or still unsold at the end of observation (censored). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| h | The hazard: the chance the event happens at time u given that it has not happened yet. |
| t_i | Time step, or token position in a text sequence. (one value per example i) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| x_i | The input features describing one example (what the model sees). (one value per example i) |
| p_i | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per example i) |
| \int_0^{t_i} | Integral: add up a continuously varying quantity over the range shown. |
| u | The time variable of integration, running from 0 up to the observed time. |
| d | The integration variable du: a tiny step in time. |

**Hard constraints**

- Recommendations are advice not valuations
- Price-time curves shown with intervals
- Sellers decide
- No use of protected attributes

## The approach in one paragraph

Start with median days on market by price band in the postcode, because agents quote it. Then earn the move to survival model on price position and market state, with a price optimiser maximising expected net proceeds subject to time preference, and only if it beats the baseline on Concordance and Calibration of days to sell after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Price to value ratio | Listing price divided by AVM value. Core driver. Guard against: aVM error. |
| Add Local inventory | Active listings per month of sales. Market speed. Guard against: definition. |
| Add Early engagement | Views and saves in the first 7 days. Demand signal. Guard against: used for updates, not the first price. |
| Run it as one pipeline | Property and market data (feature service), Value baseline (AVM), Survival model (boosted hazard), Price-time optimiser (solver), Advisor view (agent app) and Outcome feed (lakehouse), with Seller report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle bidding war | Model the sale-to-list ratio and include market heat. |

**Deliberately not doing**

- Agent photo count: portal behaviour.
- Weekday listed: weak.
- Listing text length: style.

**How the approach is proven**

Prove it offline on Concordance and Calibration of days to sell using time-ordered splits, then online on "Median days on market" with "Sale-to-list ratio" as the guardrail. Watch for: Withdrawn listings dropped and Price chosen by agents affects outcomes.

## Baseline and production design

- **Baseline (build this first):** Median days on market by price band in the postcode, because agents quote it.
- **Production design:** Survival model on price position and market state, with a price optimiser maximising expected net proceeds subject to time preference.

## Why AI, and why this kind

**Why AI.** Recommend a listing price and predict the days to sell at different prices so sellers and agents can trade price against time. The evidence that separates good from bad outcomes (Price to value ratio, Local inventory, Early engagement) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "dropping withdrawn listings" are what teams reach for first, and they fail because dropping unsold listings makes homes look quicker to sell. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Survival model on price position and market state, with a price optimiser maximising expected net proceeds subject to time preference.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Price to value ratio, Local inventory, Early engagement and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Median days on market by price band in the postcode, because agents quote it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Survival model on price position and market state, with a price optimiser maximising expected net proceeds subject to time preference | chosen | Meets the 2500 ms envelope at $0.806 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Median days on market) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Withdrawn listings dropped.
- Evaluation trap: Price chosen by agents affects outcomes.
- Bidding war: sale prices above list in a bidding war make the list price misleading.
- Price reductions: the list price changes during the listing.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
