# Flood & Climate Risk Scoring for Properties: use-case brief

> Generated from the blueprint `real-estate/flood-and-climate-risk-scoring-for-properties` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Flood & Climate Risk Scoring for Properties · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Score each property's exposure to flood, wildfire, heat and wind under current and future climate for buyers, lenders and insurers. The system has to run interactively, within a few seconds, inside these limits: Methodology published so that users can judge and challenge a score, Every score names the climate scenario and the time horizon and Uncertainty ranges shown alongside the score.

**Why it is hard.** The obvious approach is the flood zone designation alone, and it fails because flood zones are coarse and place houses on either side of a line at very different risk. The second trap is in "Scenario": the real signal is a climate scenario with a stated horizon, while teams usually reach for a single future.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $12.6K a month. A mistake is expensive in the way disputes measures it.

**What success looks like.** Offline: Brier score and Claims calibration. Online: Loss ratio and Disputes. The launch is judged on "Loss ratio" while "Disputes" must not get worse.

## Objective, loss and constraints

**Business objective.** Score each property's exposure to flood, wildfire, heat and wind under current and future climate for buyers, lenders and insurers.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Brier}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Brier} | Brier score: the mean squared difference between predicted probability and the 0/1 outcome. |

**Hard constraints**

- Methodology published so that users can judge and challenge a score
- Every score names the climate scenario and the time horizon
- Uncertainty ranges shown alongside the score
- Hazard layers updated at least yearly

## The approach in one paragraph

Start with official flood zone maps, because lenders require them. Then earn the move to hazard models combined with property vulnerability, calibrated to claims, with scenario scores and intervals, and only if it beats the baseline on Brier score and Claims calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Elevation above river | Metres between the lowest floor and the 100-year flood level from LiDAR data. The most direct driver of river flooding. Guard against: liDAR resolution and age limit precision. |
| Add Distance to water | Distance to the nearest river, coast or drainage channel along the flow path. Flood exposure falls with distance. Guard against: straight-line distance misleads, so use flow paths. |
| Add Vegetation fuel | Fuel load and density within 100 metres from imagery. A key driver of wildfire spread. Guard against: seasonal, so use the dry-season image. |
| Run it as one pipeline | Hazard layers (models), Property features (geospatial), Vulnerability model (boosting), Calibrator (isotonic) and Score API (service), with Report and Archive off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new defences | Update the hazard layers when defences are completed and mark the date. |

**Deliberately not doing**

- Owner: Owner identity has no physical link to hazard.
- Address string: The text of an address is not a risk factor and can encode area bias.
- Photo: A listing photo says nothing about flood or fire exposure.

**How the approach is proven**

Prove it offline on Brier score and Claims calibration using time-ordered splits, then online on "Loss ratio" with "Disputes" as the guardrail. Watch for: Claims come from a few events, so models fit those events and miss others and Scenario uncertainty is wider than the differences between models, so validation on past data is a weak guide.

## Baseline and production design

- **Baseline (build this first):** Official flood zone maps, because lenders require them.
- **Production design:** Hazard models combined with property vulnerability, calibrated to claims, with scenario scores and intervals.

## Why AI, and why this kind

**Why AI.** Score each property's exposure to flood, wildfire, heat and wind under current and future climate for buyers, lenders and insurers. The evidence that separates good from bad outcomes (Elevation above river, Distance to water, Vegetation fuel) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the flood zone designation alone" are what teams reach for first, and they fail because flood zones are coarse and place houses on either side of a line at very different risk. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Hazard models combined with property vulnerability, calibrated to claims, with scenario scores and intervals.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Elevation above river, Distance to water, Vegetation fuel and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Official flood zone maps, because lenders require them | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hazard models combined with property vulnerability, calibrated to claims, with scenario scores and intervals | chosen | Meets the 2500 ms envelope at $1.40 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Loss ratio) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Claims come from a few events, so models fit those events and miss others.
- Evaluation trap: Scenario uncertainty is wider than the differences between models, so validation on past data is a weak guide.
- New defences: new flood defences change the risk but the hazard maps lag.
- Basement: a basement or below-grade space has far higher flood vulnerability.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
