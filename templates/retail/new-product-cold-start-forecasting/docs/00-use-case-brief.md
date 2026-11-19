# New Product Cold-Start Forecasting: use-case brief

> Generated from the blueprint `retail/new-product-cold-start-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** New Product Cold-Start Forecasting · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast demand for products with no sales history using attributes, images and analogues to set first buys and launch allocation. The system has to run as a scheduled batch job, inside these limits: Buy decisions months ahead, Small initial samples and Explainable analogue selection.

**Why it is hard.** The obvious approach is category averages, and it fails because category averages miss the specific style and price point. The second trap is in "Learning": the real signal is rapid Bayesian updating from first-week sales, while teams usually reach for waiting for stable history.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.6K a month. A mistake is expensive in the way end-of-season leftover units measures it.

**What success looks like.** Offline: WAPE for cold-start cohorts and Prediction interval coverage. Online: First-buy accuracy and End-of-season leftover units. The launch is judged on "First-buy accuracy" while "End-of-season leftover units" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast demand for products with no sales history using attributes, images and analogues to set first buys and launch allocation.

**Training objective.** `\mathcal{L}=\sum_t\rho_q\!\left(y_t-\hat y_t^{(q)}\right)+\lambda\,\mathrm{Analogue}\ \mathrm{Consistency}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_q | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. (one value per quantile level q) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t^{(q)} | The model's prediction of y. (one value per time step or token t and quantile level q) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Analogue} | A comparable existing product used to guess a new product's sales. |
| \mathrm{Consistency} | Penalty when the new product's forecast disagrees with its analogues' pattern. |

**Hard constraints**

- Buy decisions months ahead
- Small initial samples
- Explainable analogue selection
- Merchandiser overrides

## The approach in one paragraph

Start with category-average sell-through scaled by planned price tier. Then earn the move to analogue-based Bayesian hierarchical model with multimodal embeddings and online posterior updates from early sales, and only if it beats the baseline on WAPE for cold-start cohorts and Prediction interval coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Attribute-image embedding | Joint embedding of attributes and images. Similarity to past winners. Guard against: embeddings trained on prior seasons only. |
| Add Launch price position | Price percentile within category. Demand expectation. Guard against: planned launch price. |
| Add First-week velocity | Sales in days 1-7 vs analogue velocity. Update signal. Guard against: adjust for stock availability. |
| Run it as one pipeline | Product attributes and images (PIM), Embedding model (multimodal encoder), Analogue retriever (ANN), Bayesian forecaster (hierarchical model), Buy-plan optimiser (allocation solver) and Actuals feed (sales), with Merchandiser review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle viral social trend for a product | Trend signal features and fast replenishment path. |

**Deliberately not doing**

- Supplier name: confounded with quality tiers that attributes cover.
- Internal SKU code: arbitrary.

**How the approach is proven**

Prove it offline on WAPE for cold-start cohorts and Prediction interval coverage using time-ordered splits, then online on "First-buy accuracy" with "End-of-season leftover units" as the guardrail. Watch for: Analogues drawn from future seasons and Evaluation mixes mature and new items.

## Baseline and production design

- **Baseline (build this first):** Category-average sell-through scaled by planned price tier.
- **Production design:** Analogue-based Bayesian hierarchical model with multimodal embeddings and online posterior updates from early sales.

## Why AI, and why this kind

**Why AI.** Forecast demand for products with no sales history using attributes, images and analogues to set first buys and launch allocation. The evidence that separates good from bad outcomes (Attribute-image embedding, Launch price position, First-week velocity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "category averages" are what teams reach for first, and they fail because category averages miss the specific style and price point. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Analogue-based Bayesian hierarchical model with multimodal embeddings and online posterior updates from early sales.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Attribute-image embedding, Launch price position, First-week velocity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Category-average sell-through scaled by planned price tier | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Analogue-based Bayesian hierarchical model with multimodal embeddings and online posterior updates from early sales | chosen | Meets the run-window envelope at $0.090 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (First-buy accuracy) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Analogues drawn from future seasons.
- Evaluation trap: Evaluation mixes mature and new items.
- Viral social trend for a product: first buy far too small.
- Poor product photos: embeddings uninformative.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
