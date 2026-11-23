# Land Use Change Detection from Satellite Imagery: use-case brief

> Generated from the blueprint `public-sector/land-use-change-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Land Use Change Detection from Satellite Imagery · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Map land cover and change over time from satellite data so planners track green space loss, sprawl and flood risk areas. The system has to run as a scheduled batch job, inside these limits: Land cover classes follow the city's legend, Accuracy reported per class and Change maps with confidence.

**Why it is hard.** The obvious approach is model-labelled data, and it fails because self-labelled data hides class confusion. The second trap is in "Class": the real signal is a legend tied to policy, while teams usually reach for generic classes.

**Scale and stakes.** At 10 million users this is about 15.0M model-touching events a day, 174 requests per second on average and 174 at peak, at an estimated $99.7K a month. A mistake is expensive in the way green space tracking measures it.

**What success looks like.** Offline: Class accuracy and kappa, Change detection precision and Area estimate error. Online: Planning decisions with current data, Green space tracking and Survey cost. The launch is judged on "Planning decisions with current data" while "Green space tracking" must not get worse.

## Objective, loss and constraints

**Business objective.** Map land cover and change over time from satellite data so planners track green space loss, sprawl and flood risk areas.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Land cover classes follow the city's legend
- Accuracy reported per class
- Change maps with confidence
- Annual and seasonal updates
- 5K square km

## The approach in one paragraph

Start with manual photo interpretation of sample points, because it is the standard accuracy method. Then earn the move to a segmentation model on multi-temporal imagery with class-wise accuracy and change confidence, and an annual statistics pack for planners, and only if it beats the baseline on Class accuracy and kappa and Change detection precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Spectral and texture features | Multispectral and radar bands. Class signal. Guard against: from satellites. |
| Add Seasonal profile | Change through the year. Class separation. Guard against: from time series. |
| Add Elevation and slope | Terrain. Context. Guard against: from elevation data. |
| Run it as one pipeline | Imagery intake (satellite archives), Preprocessing (cloud masking), Land cover model (segmentation network), Change detection (differencing) and Accuracy assessment (field samples), with Planner review and Statistics report off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle cloud cover | Multi-date compositing and radar. |

**Deliberately not doing**

- Tile name: an identifier.
- Provider name: irrelevant.
- Image file name: an artefact.

**How the approach is proven**

Prove it offline on Class accuracy and kappa, Change detection precision and Area estimate error using time-ordered splits, then online on "Planning decisions with current data" with "Green space tracking" as the guardrail. Watch for: Model-labelled test data, Generic classes and Maps without uncertainty.

## Baseline and production design

- **Baseline (build this first):** Manual photo interpretation of sample points, because it is the standard accuracy method.
- **Production design:** A segmentation model on multi-temporal imagery with class-wise accuracy and change confidence, and an annual statistics pack for planners.

## Why AI, and why this kind

**Why AI.** Map land cover and change over time from satellite data so planners track green space loss, sprawl and flood risk areas. The evidence that separates good from bad outcomes (Spectral and texture features, Seasonal profile, Elevation and slope) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model-labelled data" are what teams reach for first, and they fail because self-labelled data hides class confusion. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A segmentation model on multi-temporal imagery with class-wise accuracy and change confidence, and an annual statistics pack for planners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Spectral and texture features, Seasonal profile, Elevation and slope and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual photo interpretation of sample points, because it is the standard accuracy method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A segmentation model on multi-temporal imagery with class-wise accuracy and change confidence, and an annual statistics pack for planners | chosen | Meets the run-window envelope at $0.222 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Planning decisions with current data) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Model-labelled test data.
- Evaluation trap: Generic classes.
- Cloud cover: the scene is blocked.
- Class drift: the legend changes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
