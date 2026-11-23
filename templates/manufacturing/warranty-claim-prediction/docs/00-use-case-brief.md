# Warranty Claim Prediction: use-case brief

> Generated from the blueprint `manufacturing/warranty-claim-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Warranty Claim Prediction · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast warranty claims by product, build period and failure mode so reserves, supplier recovery and corrective actions are sized correctly. The system has to run as a scheduled batch job, inside these limits: Forecast by product and month in service, Intervals for finance reserves and Failure modes linked to build data.

**Why it is hard.** The obvious approach is claim counts alone, and it fails because claims depend on how many are exposed. The second trap is in "Delay": the real signal is reporting delay modelled, while teams usually reach for claims to date as final.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.7K a month. A mistake is expensive in the way supplier recovery measures it.

**What success looks like.** Offline: Forecast error by month in service, Interval coverage and Early warning lead time. Online: Reserve accuracy, Supplier recovery and Time to detect a bad lot. The launch is judged on "Reserve accuracy" while "Supplier recovery" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast warranty claims by product, build period and failure mode so reserves, supplier recovery and corrective actions are sized correctly.

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

- Forecast by product and month in service
- Intervals for finance reserves
- Failure modes linked to build data
- Monthly run for 20K product variants

## The approach in one paragraph

Start with claim rate per thousand units by product and month in service, because finance uses it for reserves. Then earn the move to a cohort survival model with reporting-delay correction and failure-mode splits, early-warning flags for build lots and a reserve forecast with intervals, and only if it beats the baseline on Forecast error by month in service and Interval coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Units in service by age | Installed base by months in service. Exposure. Guard against: from sales and registration. |
| Add Early field failure rate | Claims per thousand units in the first months. Leading indicator. Guard against: by build period. |
| Add Build and supplier lot attributes | Plant, line and component lots. Cause finder. Guard against: from genealogy. |
| Run it as one pipeline | Claims and sales data (warranty system), Delay correction (statistical model), Cohort survival model (survival analysis), Lot attribution (genealogy join), Early warning (control charts), Reserve forecast (finance report) and Corrective action link (quality system). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle recall or campaign | Campaign flags and separate handling. |

**Deliberately not doing**

- Dealer name: an identifier.
- Claim number: an identifier.
- Claim text length: an artefact.

**How the approach is proven**

Prove it offline on Forecast error by month in service, Interval coverage and Early warning lead time using time-ordered splits, then online on "Reserve accuracy" with "Supplier recovery" as the guardrail. Watch for: Using claims to date as final, Ignoring exposure and Product-level totals only.

## Baseline and production design

- **Baseline (build this first):** Claim rate per thousand units by product and month in service, because finance uses it for reserves.
- **Production design:** A cohort survival model with reporting-delay correction and failure-mode splits, early-warning flags for build lots and a reserve forecast with intervals.

## Why AI, and why this kind

**Why AI.** Forecast warranty claims by product, build period and failure mode so reserves, supplier recovery and corrective actions are sized correctly. The evidence that separates good from bad outcomes (Units in service by age, Early field failure rate, Build and supplier lot attributes) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "claim counts alone" are what teams reach for first, and they fail because claims depend on how many are exposed. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A cohort survival model with reporting-delay correction and failure-mode splits, early-warning flags for build lots and a reserve forecast with intervals.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Units in service by age, Early field failure rate, Build and supplier lot attributes and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Claim rate per thousand units by product and month in service, because finance uses it for reserves | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A cohort survival model with reporting-delay correction and failure-mode splits, early-warning flags for build lots and a reserve forecast with intervals | chosen | Meets the run-window envelope at $0.093 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Reserve accuracy) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using claims to date as final.
- Evaluation trap: Ignoring exposure.
- Recall or campaign: claims jump after a campaign starts.
- Claim policy change: claim rates shift after a policy change.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
