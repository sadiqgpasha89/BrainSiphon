# Development Site Feasibility Scoring: use-case brief

> Generated from the blueprint `real-estate/development-site-feasibility-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Development Site Feasibility Scoring · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Screen land parcels for development potential by combining zoning, constraints, comparable projects and market demand. The system has to run interactively, within a few seconds, inside these limits: Zoning data cited, Screening, not a legal opinion and Analyst reviews top sites.

**Why it is hard.** The obvious approach is parcel size alone, and it fails because a large site with a heritage overlay may be undevelopable. The second trap is in "Yield": the real signal is expected margin after cost and absorption, while teams usually reach for land price.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $12.4K a month. A mistake is expensive in the way win rate measures it.

**What success looks like.** Offline: PR-AUC on projects that proceeded and Yield error. Online: Sites progressed per analyst-week and Win rate. The launch is judged on "Sites progressed per analyst-week" while "Win rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Screen land parcels for development potential by combining zoning, constraints, comparable projects and market demand.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{r}-r)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \hat{r} | The model's predicted value of the quantity r. |
| r | The realised development yield (margin) of a past project, with \hat{r} the model's estimate. |

**Hard constraints**

- Zoning data cited
- Screening, not a legal opinion
- Analyst reviews top sites
- Data licences

## The approach in one paragraph

Start with filter parcels by zone and size, then analysts review, because that is how teams work. Then earn the move to zoning parser with a feasibility model, a residual-land-value calculator and a ranked list with evidence, and only if it beats the baseline on PR-AUC on projects that proceeded and Yield error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Allowable floor area | Zoning-derived buildable area. Core. Guard against: rule parsing. |
| Add Constraint overlap | Share of the parcel under constraints. Risk. Guard against: data. |
| Add Comparable project yield | Margins of recent nearby projects. Market. Guard against: sparse. |
| Run it as one pipeline | Parcel and zoning data (GIS), Rule extractor (NLP over codes), Constraint overlay (geospatial engine), Feasibility model (boosting), Residual value (financial model) and Outcome log (warehouse), with Analyst shortlist off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle zoning change pending | Flag sites with a pending change and score under both the current and proposed rules. |

**Deliberately not doing**

- Owner: irrelevant.
- Parcel ID digits: arbitrary.
- Listing text: marketing.

**How the approach is proven**

Prove it offline on PR-AUC on projects that proceeded and Yield error using time-ordered splits, then online on "Sites progressed per analyst-week" with "Win rate" as the guardrail. Watch for: Only past proceeding sites labelled and Outdated codes.

## Baseline and production design

- **Baseline (build this first):** Filter parcels by zone and size, then analysts review, because that is how teams work.
- **Production design:** Zoning parser with a feasibility model, a residual-land-value calculator and a ranked list with evidence.

## Why AI, and why this kind

**Why AI.** Screen land parcels for development potential by combining zoning, constraints, comparable projects and market demand. The evidence that separates good from bad outcomes (Allowable floor area, Constraint overlap, Comparable project yield) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "parcel size alone" are what teams reach for first, and they fail because A large site with a heritage overlay may be undevelopable. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Zoning parser with a feasibility model, a residual-land-value calculator and a ranked list with evidence.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Allowable floor area, Constraint overlap, Comparable project yield and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Filter parcels by zone and size, then analysts review, because that is how teams work | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Zoning parser with a feasibility model, a residual-land-value calculator and a ranked list with evidence | chosen | Meets the 2500 ms envelope at $6.87 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Sites progressed per analyst-week) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Only past proceeding sites labelled.
- Evaluation trap: Outdated codes.
- Zoning change pending: a zoning change is pending and the rules used for scoring may soon be out of date.
- Assemblage: a development needs several parcels bought together.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
