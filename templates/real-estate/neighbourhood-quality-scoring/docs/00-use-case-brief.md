# Neighbourhood Quality Scoring: use-case brief

> Generated from the blueprint `real-estate/neighbourhood-quality-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Neighbourhood Quality Scoring · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Score each neighbourhood on walkability, amenities, safety perception, noise and change so buyers and investors can compare areas. The system has to run as a scheduled batch job, inside these limits: No score may use race, ethnicity, religion or any proxy for them, Method and inputs published so a resident can challenge a score and Quarterly refresh without rank churn from noise alone.

**Why it is hard.** The obvious approach is crime counts, school-rating averages or income and demographic proxies, and it fails because those inputs recreate historic redlining and a score that looks neutral becomes a legal and reputational risk. The second trap is in "Scale": the real signal is block-level scores from small grid cells with enough observations to be stable, while teams usually reach for city or postcode averages.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 1 at peak, at an estimated $1.9K a month. A mistake is expensive in the way complaints about scores measures it.

**What success looks like.** Offline: Rank correlation with survey ratings and Stability across refreshes. Online: Search engagement with area filters and Complaints about scores. The launch is judged on "Search engagement with area filters" while "Complaints about scores" must not get worse.

## Objective, loss and constraints

**Business objective.** Score each neighbourhood on walkability, amenities, safety perception, noise and change so buyers and investors can compare areas.

**Training objective.** `\mathcal{L}=\mathrm{MSE}(\hat{y},y)+\lambda\,\mathrm{GraphReg}(z)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{MSE} | Mean squared error: the average of squared differences between prediction and truth. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |
| z | The learned embedding of a neighbourhood and its surroundings, regularised over the map graph so adjacent areas stay similar. |

**Hard constraints**

- No score may use race, ethnicity, religion or any proxy for them
- Method and inputs published so a resident can challenge a score
- Quarterly refresh without rank churn from noise alone
- Fair-housing and legal review before any score is shown to buyers

## The approach in one paragraph

Start with a weighted index of amenity counts, because portals publish similar scores. Then earn the move to learned scores from amenity access, imagery and trend features, calibrated to resident survey data, with a fair-housing audit, and only if it beats the baseline on Rank correlation with survey ratings and Stability across refreshes after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Walk time to amenities | Routing time on the pedestrian network to the nearest grocery, school, park and transit stop. A directly interpretable livability measure that matches how residents experience the area. Guard against: use the current map snapshot for training labels and do not mix in later openings. |
| Add Street imagery greenery | Share of pixels classed as tree canopy in street-level images, averaged over each cell. Green cover tracks comfort, heat and perceived quality. Guard against: images are seasonal, so normalise by capture month and never compare winter to summer. |
| Add Business openings | Net new registered businesses in the cell over 24 months, divided by existing businesses. Momentum and vibrancy that a snapshot cannot show. Guard against: registrations lag opening, so count by registration date and exclude the scored quarter. |
| Run it as one pipeline | Map and amenity data (OpenStreetMap and local feeds), Imagery features (vision model), Routing features (routing engine), Score model (gradient boosting), Score store (lakehouse) and API (low-latency service), with Fairness audit off the critical path. |
| Optimise the right thing | The objective weighs mean squared error: the average of squared differences between prediction and truth, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new development | Use priors from comparable areas and mark the score as provisional. |

**Deliberately not doing**

- Area name: A label that the model can memorise, which would reproduce the reputation of a name instead of the facts on the ground.
- Listing agent: Who sells a home in the area has no bearing on the area itself and leaks market share, not quality.
- Photo brightness: An artefact of camera and time of day in the source images, not of the neighbourhood.

**How the approach is proven**

Prove it offline on Rank correlation with survey ratings and Stability across refreshes using time-ordered splits, then online on "Search engagement with area filters" with "Complaints about scores" as the guardrail. Watch for: Survey calibration data covers wealthy and responsive areas better than others and Proxy features that correlate with protected classes pass offline tests and fail the fairness audit.

## Baseline and production design

- **Baseline (build this first):** A weighted index of amenity counts, because portals publish similar scores.
- **Production design:** Learned scores from amenity access, imagery and trend features, calibrated to resident survey data, with a fair-housing audit.

## Why AI, and why this kind

**Why AI.** Score each neighbourhood on walkability, amenities, safety perception, noise and change so buyers and investors can compare areas. The evidence that separates good from bad outcomes (Walk time to amenities, Street imagery greenery, Business openings) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "crime counts, school-rating averages or income and demographic proxies" are what teams reach for first, and they fail because those inputs recreate historic redlining and a score that looks neutral becomes a legal and reputational risk. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Learned scores from amenity access, imagery and trend features, calibrated to resident survey data, with a fair-housing audit.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Walk time to amenities, Street imagery greenery, Business openings and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A weighted index of amenity counts, because portals publish similar scores | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Learned scores from amenity access, imagery and trend features, calibrated to resident survey data, with a fair-housing audit | chosen | Meets the run-window envelope at $1.07 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Search engagement with area filters) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Survey calibration data covers wealthy and responsive areas better than others.
- Evaluation trap: Proxy features that correlate with protected classes pass offline tests and fail the fairness audit.
- New development: a new development has no history so its area score cannot be computed.
- Data gaps: few amenities are mapped in an area so the score is falsely low.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
