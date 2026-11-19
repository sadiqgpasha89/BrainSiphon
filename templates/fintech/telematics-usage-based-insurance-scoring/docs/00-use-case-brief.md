# Telematics Usage-Based Insurance Scoring: use-case brief

> Generated from the blueprint `fintech/telematics-usage-based-insurance-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Telematics Usage-Based Insurance Scoring · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Score driving behaviour from phone and device sensors to offer fair, behaviour-based premiums and reduce claims through feedback. The system has to run as a scheduled batch job, inside these limits: Battery impact on phones, Trip detection accuracy and Privacy of location data.

**Why it is hard.** The obvious approach is raw event counts, and it fails because city drivers brake more by necessity. The second trap is in "Exposure": the real signal is time-of-day and road-type exposure features, while teams usually reach for mileage alone.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 69 at peak, at an estimated $5.5K a month. A mistake is expensive in the way opt-in retention measures it.

**What success looks like.** Offline: Poisson deviance on claims and Score stability across weeks. Online: Claim frequency of high-score vs low-score and Opt-in retention. The launch is judged on "Claim frequency of high-score vs low-score" while "Opt-in retention" must not get worse.

## Objective, loss and constraints

**Business objective.** Score driving behaviour from phone and device sensors to offer fair, behaviour-based premiums and reduce claims through feedback.

**Training objective.** `\mathcal{L}=\mathrm{PoissonDeviance}(\text{claims},\hat\lambda)+\lambda\,\mathrm{Fairness}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{PoissonDeviance} | Poisson deviance: a loss for count outcomes that measures how far predicted rates are from observed counts. |
| \text{claims} | The number of claims a driver made. |
| \hat{\lambda} | The predicted claim rate for the driver. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Fairness} | Penalty when predictions treat protected groups unequally. |

**Hard constraints**

- Battery impact on phones
- Trip detection accuracy
- Privacy of location data
- Score stability over time

## The approach in one paragraph

Start with rule scorecard with event penalties. Then earn the move to sequence model over sensor-derived events with map-matching, GBDT scoring on aggregated features, calibrated to claim frequency, and only if it beats the baseline on Poisson deviance on claims and Score stability across weeks after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Harsh events per 100km by road class | Events normalised by distance and road class. Behaviour not circumstance. Guard against: map-match to road class. |
| Add Speed over limit percentage | Fraction of distance over posted limit. Risk behaviour. Guard against: map speed limits as-of date. |
| Add Phone distraction minutes | Touch and motion-based screen use while moving. Strong crash predictor. Guard against: respect passenger exclusion. |
| Run it as one pipeline | Sensor ingestion (mobile SDK), Trip segmentation (stream processor), Map matching (road network service), Driving-event extractor (signal processing), Risk scorer (GBDT), Premium engine (rating service) and Claims linkage (outcomes). |
| Optimise the right thing | The objective weighs poisson deviance: a loss for count outcomes that measures how far predicted rates are from observed counts, so the model is trained on the cost of the decision and not on a generic score. |
| Handle passenger in car misdetected as driver | Driver-identification model and manual confirmation. |

**Deliberately not doing**

- Absolute top speed: rare, outlier-dominated.
- Trip start location: privacy risk, weak signal.

**How the approach is proven**

Prove it offline on Poisson deviance on claims and Score stability across weeks using time-ordered splits, then online on "Claim frequency of high-score vs low-score" with "Opt-in retention" as the guardrail. Watch for: Short observation windows with no claims yet and Selection bias because only safe drivers opt in.

## Baseline and production design

- **Baseline (build this first):** Rule scorecard with event penalties.
- **Production design:** Sequence model over sensor-derived events with map-matching, GBDT scoring on aggregated features, calibrated to claim frequency.

## Why AI, and why this kind

**Why AI.** Score driving behaviour from phone and device sensors to offer fair, behaviour-based premiums and reduce claims through feedback. The evidence that separates good from bad outcomes (Harsh events per 100km by road class, Speed over limit percentage, Phone distraction minutes) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw event counts" are what teams reach for first, and they fail because city drivers brake more by necessity. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Sequence model over sensor-derived events with map-matching, GBDT scoring on aggregated features, calibrated to claim frequency.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Harsh events per 100km by road class, Speed over limit percentage, Phone distraction minutes and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule scorecard with event penalties | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Sequence model over sensor-derived events with map-matching, GBDT scoring on aggregated features, calibrated to claim frequency | chosen | Meets the run-window envelope at $0.030 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Claim frequency of high-score vs low-score) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Short observation windows with no claims yet.
- Evaluation trap: Selection bias because only safe drivers opt in.
- Passenger in car misdetected as driver: the passenger’s driving score is wrongly attributed to the policyholder.
- Phone OS update changes sensor sampling: event rates shift.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
