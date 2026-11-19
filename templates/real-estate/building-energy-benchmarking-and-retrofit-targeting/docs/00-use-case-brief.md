# Building Energy Benchmarking & Retrofit Targeting: use-case brief

> Generated from the blueprint `real-estate/building-energy-benchmarking-and-retrofit-targeting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Building Energy Benchmarking & Retrofit Targeting · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Benchmark building energy use against peers and rank buildings for retrofit by savings and payback. The system has to run as a scheduled batch job, inside these limits: Energy use normalised for weather and occupancy before any comparison, Peer groups defined so that like buildings compare with like and Calculations traceable so a building owner or auditor can reproduce them.

**Why it is hard.** The obvious approach is raw kilowatt-hours, and it fails because a cold winter or a larger floor area makes a building look worse without any change in efficiency. The second trap is in "Peers": the real signal is peer groups by use type, size and climate zone, while teams usually reach for a national average for all buildings.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.7K a month. A mistake is expensive in the way energy saved measures it.

**What success looks like.** Offline: Expected-use error and Savings error. Online: Retrofits delivered and Energy saved. The launch is judged on "Retrofits delivered" while "Energy saved" must not get worse.

## Objective, loss and constraints

**Business objective.** Benchmark building energy use against peers and rank buildings for retrofit by savings and payback.

**Training objective.** `\mathcal{L}=\mathrm{Huber}(\hat{y}-y)+\lambda\,\mathrm{MSE}(\hat{s},s)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{MSE} | Mean squared error: the average of squared differences between prediction and truth. |
| \hat{s} | The estimated annual energy savings from a retrofit. |
| s | The measured savings after a retrofit. |

**Hard constraints**

- Energy use normalised for weather and occupancy before any comparison
- Peer groups defined so that like buildings compare with like
- Calculations traceable so a building owner or auditor can reproduce them
- Run annually after the full year of meter data is closed

## The approach in one paragraph

Start with rank by energy per square metre, because it is easy. Then earn the move to weather-normalised models of expected use, savings estimators and a payback ranking, and only if it beats the baseline on Expected-use error and Savings error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Normalised EUI | Annual kilowatt-hours per square metre after weather and occupancy adjustment. The core efficiency measure. Guard against: area definitions differ, so use the standard gross internal area. |
| Add Peer percentile | Rank of the building's normalised EUI within its peer group. Shows how far from typical the building is. Guard against: peer groups with few members are unstable. |
| Add Envelope age | Year of construction and of the last major facade or window upgrade. Older envelopes lose more heat. Guard against: records are often missing, so use the building age as a fallback. |
| Run it as one pipeline | Meter data (utilities), Weather (feeds), Expected-use model (boosting), Peer benchmark (stats), Savings model (regression) and Retrofit ranker (rules), with Report off the critical path. |
| Optimise the right thing | The objective weighs huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training, so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing meters | Impute carefully from sub-meters or similar buildings and flag them. |

**Deliberately not doing**

- Building name: A label that does not describe efficiency.
- Owner: The owner identity does not change the physical performance.
- Photo: Appearance has little relation to energy use.

**How the approach is proven**

Prove it offline on Expected-use error and Savings error using time-ordered splits, then online on "Retrofits delivered" with "Energy saved" as the guardrail. Watch for: Retrofitted buildings differ from the rest, so their results are not comparable with unretrofitted ones and Weather in one year is not typical, and a model fitted on it misleads.

## Baseline and production design

- **Baseline (build this first):** Rank by energy per square metre, because it is easy.
- **Production design:** Weather-normalised models of expected use, savings estimators and a payback ranking.

## Why AI, and why this kind

**Why AI.** Benchmark building energy use against peers and rank buildings for retrofit by savings and payback. The evidence that separates good from bad outcomes (Normalised EUI, Peer percentile, Envelope age) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw kilowatt-hours" are what teams reach for first, and they fail because A cold winter or a larger floor area makes a building look worse without any change in efficiency. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Weather-normalised models of expected use, savings estimators and a payback ranking.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Normalised EUI, Peer percentile, Envelope age and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rank by energy per square metre, because it is easy | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Weather-normalised models of expected use, savings estimators and a payback ranking | chosen | Meets the run-window envelope at $0.184 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Retrofits delivered) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Retrofitted buildings differ from the rest, so their results are not comparable with unretrofitted ones.
- Evaluation trap: Weather in one year is not typical, and a model fitted on it misleads.
- Missing meters: missing meters leave gaps in the energy record.
- Mixed use: tenants in a mixed-use building share meters so use cannot be allocated.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
