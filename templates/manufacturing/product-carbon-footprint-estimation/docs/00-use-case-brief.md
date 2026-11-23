# Product Carbon Footprint Estimation: use-case brief

> Generated from the blueprint `manufacturing/product-carbon-footprint-estimation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Product Carbon Footprint Estimation · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate the carbon footprint of each product from bills of materials, energy use and supplier data with uncertainty so design and sourcing decisions can reduce emissions. The system has to run as a scheduled batch job, inside these limits: Methodology follows the declared standard, Each number has a source and an uncertainty and Supplier-specific data used where available.

**Why it is hard.** The obvious approach is generic averages for everything, and it fails because averages hide the biggest levers. The second trap is in "Uncertainty": the real signal is a range per product, while teams usually reach for a single number.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.7K a month. A mistake is expensive in the way supplier data coverage measures it.

**What success looks like.** Offline: Agreement with audited footprints, Interval coverage on sampled products and Share of primary data. Online: Footprint reduction in redesigned products, Supplier data coverage and Audit findings. The launch is judged on "Footprint reduction in redesigned products" while "Supplier data coverage" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate the carbon footprint of each product from bills of materials, energy use and supplier data with uncertainty so design and sourcing decisions can reduce emissions.

**Training objective.** `\mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Methodology follows the declared standard
- Each number has a source and an uncertainty
- Supplier-specific data used where available
- Recompute on every BOM or energy change
- 100K products

## The approach in one paragraph

Start with lookup of generic emission factors per BOM line, because it is the common screening method. Then earn the move to a hybrid estimator using supplier data and metered energy where available and imputed factors elsewhere with Monte Carlo uncertainty, plus a lever analysis for designers, and only if it beats the baseline on Agreement with audited footprints and Interval coverage on sampled products after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Material emission factors | Factor by material and supplier. Largest contribution. Guard against: versioned factors. |
| Add Process energy per unit | Metered energy per unit and grid factor. Manufacturing share. Guard against: per plant. |
| Add Transport legs | Tonne-kilometres by mode. Logistics share. Guard against: from shipments. |
| Run it as one pipeline | BOM and routing data (PLM and ERP), Factor library (versioned factor store), Energy allocation (plant meters), Estimator (model with Monte Carlo) and Uncertainty and lever analysis (batch), with Designer report and Audit pack off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing supplier data | Use imputed factors with a flagged data quality score. |

**Deliberately not doing**

- Product name: an identifier.
- Marketing category: not an emission driver.
- Designer: irrelevant.

**How the approach is proven**

Prove it offline on Agreement with audited footprints, Interval coverage on sampled products and Share of primary data using time-ordered splits, then online on "Footprint reduction in redesigned products" with "Supplier data coverage" as the guardrail. Watch for: Generic factors only, Single-number reporting and Undocumented boundaries.

## Baseline and production design

- **Baseline (build this first):** Lookup of generic emission factors per BOM line, because it is the common screening method.
- **Production design:** A hybrid estimator using supplier data and metered energy where available and imputed factors elsewhere with Monte Carlo uncertainty, plus a lever analysis for designers.

## Why AI, and why this kind

**Why AI.** Estimate the carbon footprint of each product from bills of materials, energy use and supplier data with uncertainty so design and sourcing decisions can reduce emissions. The evidence that separates good from bad outcomes (Material emission factors, Process energy per unit, Transport legs) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "generic averages for everything" are what teams reach for first, and they fail because averages hide the biggest levers. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A hybrid estimator using supplier data and metered energy where available and imputed factors elsewhere with Monte Carlo uncertainty, plus a lever analysis for designers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Material emission factors, Process energy per unit, Transport legs and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Lookup of generic emission factors per BOM line, because it is the common screening method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A hybrid estimator using supplier data and metered energy where available and imputed factors elsewhere with Monte Carlo uncertainty, plus a lever analysis for designers | chosen | Meets the run-window envelope at $0.372 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Footprint reduction in redesigned products) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Generic factors only.
- Evaluation trap: Single-number reporting.
- Missing supplier data: primary data is not available.
- Factor library update: numbers change after a new release.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
