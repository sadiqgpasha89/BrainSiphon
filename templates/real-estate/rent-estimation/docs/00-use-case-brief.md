# Rental Price Estimation: use-case brief

> Generated from the blueprint `real-estate/rent-estimation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Rental Price Estimation · **Domain:** real-estate · **Latency tier:** sub-100ms · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate the market rent for a home or unit so owners, agents and tenants see a credible range. The system has to run in under 100 milliseconds, inside these limits: Response under 80 ms, Range shown with the estimate and No protected attributes or proxies.

**Why it is hard.** The obvious approach is asking rents only, and it fails because asking rents are 3-8% above what is signed. The second trap is in "Furnishing": the real signal is furnished versus unfurnished segmentation, while teams usually reach for pooled rents.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $3.6K a month. A mistake is expensive in the way time to lease measures it.

**What success looks like.** Offline: MAPE and Interval coverage. Online: Listing price changes after estimate and Time to lease. The launch is judged on "Listing price changes after estimate" while "Time to lease" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate the market rent for a home or unit so owners, agents and tenants see a credible range.

**Training objective.** `\mathcal{L}=\mathrm{Huber}(\log\hat{y}-\log y)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.9},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Pinball} | Pinball (quantile) loss: penalises under- and over-prediction asymmetrically so the output is a chosen quantile, such as the 90th percentile, rather than the average. |
| \hat{q}_{0.9} | The model's predicted value at the chosen quantile. |

**Hard constraints**

- Response under 80 ms
- Range shown with the estimate
- No protected attributes or proxies
- Daily refresh of market features

## The approach in one paragraph

Start with median rent per square metre in the postcode, because it is easy to explain and already used. Then earn the move to gradient boosting with spatial and amenity features, quantile outputs and a segment model for furnished units, and only if it beats the baseline on MAPE and Interval coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Local median rent per room | Trailing 60-day median in the micro-area. Market anchor. Guard against: mix of unit types. |
| Add Unit size and layout | Area and bedrooms. Core attribute. Guard against: floor plan errors. |
| Add Building amenity count | Amenities from listings. Premium driver. Guard against: text extraction errors. |
| Run it as one pipeline | Listing and lease feed (ingestion pipeline), Geospatial features (H3 index), Amenity extractor (text model), Rent model (gradient boosting), Range calibrator (conformal intervals), API response (low-latency service) and Outcome store (lakehouse). |
| Optimise the right thing | The objective weighs huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new building | Use priors from similar buildings and widen the interval. |

**Deliberately not doing**

- Listing title style: marketing.
- Photo count: portal behaviour.
- Agent name: irrelevant.

**How the approach is proven**

Prove it offline on MAPE and Interval coverage using time-ordered splits, then online on "Listing price changes after estimate" with "Time to lease" as the guardrail. Watch for: Asking rents leak into labels and Same landlord in train and test.

## Baseline and production design

- **Baseline (build this first):** Median rent per square metre in the postcode, because it is easy to explain and already used.
- **Production design:** Gradient boosting with spatial and amenity features, quantile outputs and a segment model for furnished units.

## Why AI, and why this kind

**Why AI.** Estimate the market rent for a home or unit so owners, agents and tenants see a credible range. The evidence that separates good from bad outcomes (Local median rent per room, Unit size and layout, Building amenity count) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "asking rents only" are what teams reach for first, and they fail because asking rents are 3-8% above what is signed. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting with spatial and amenity features, quantile outputs and a segment model for furnished units.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Local median rent per room, Unit size and layout, Building amenity count and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Median rent per square metre in the postcode, because it is easy to explain and already used | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting with spatial and amenity features, quantile outputs and a segment model for furnished units | chosen | Meets the 80 ms envelope at $0.401 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Listing price changes after estimate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Asking rents leak into labels.
- Evaluation trap: Same landlord in train and test.
- New building: a new building has no rent history to learn from.
- Seasonal market: a student city peaks in August and prices are not typical in other months.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
