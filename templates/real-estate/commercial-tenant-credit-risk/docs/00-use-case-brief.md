# Commercial Tenant Credit Risk: use-case brief

> Generated from the blueprint `real-estate/commercial-tenant-credit-risk` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Commercial Tenant Credit Risk · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict the likelihood that commercial tenants default on rent so landlords price deposits, incentives and exposure. The system has to run as a scheduled batch job, inside these limits: Each score shows the factors behind it so an asset manager can explain it, Refreshed monthly as rent ledgers close and Data licences for vendor financials are respected.

**Why it is hard.** The obvious approach is a credit score only, and it fails because a tenant with a good score and an unaffordable rent still fails, since occupancy cost matters. The second trap is in "Sector": the real signal is sector stress in the tenant's industry and area, while teams usually reach for a static sector rating.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way early warnings measures it.

**What success looks like.** Offline: AUC and Calibration. Online: Bad debt and Early warnings. The launch is judged on "Bad debt" while "Early warnings" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict the likelihood that commercial tenants default on rent so landlords price deposits, incentives and exposure.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Each score shows the factors behind it so an asset manager can explain it
- Refreshed monthly as rent ledgers close
- Data licences for vendor financials are respected
- Tenants of the same type are treated the same way

## The approach in one paragraph

Start with credit agency scores, because landlords use them. Then earn the move to boosting with payment and sector features, monotone constraints and a watchlist, and only if it beats the baseline on AUC and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Payment days trend | Change in average days paid after the due date over the last 6 months. An early warning of stress. Guard against: agreed concessions look like lateness, so exclude them. |
| Add Rent to revenue | Annual rent divided by estimated annual tenant revenue. Shows how heavy the occupancy cost is. Guard against: revenue estimates are noisy, so use sector medians when private. |
| Add Sector stress index | Composite of insolvencies, footfall and sector sales for the tenant's industry. Gives context for a tenant's behaviour. Guard against: different sources give different readings, so use one. |
| Run it as one pipeline | Rent ledger (property system), Financial data (vendors), Feature builder (Spark), Default model (boosting), Watchlist (rules), Asset manager view (BI) and Outcome feed (warehouse). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle anchor tenant | Treat large tenants as single names with their own limits. |

**Deliberately not doing**

- Tenant name: A label that carries no credit information and risks bias.
- Lease length: Weakly related once payment behaviour and sector are known.
- Floor: The floor of a unit has no link to the tenant's ability to pay.

**How the approach is proven**

Prove it offline on AUC and Calibration using time-ordered splits, then online on "Bad debt" with "Early warnings" as the guardrail. Watch for: Few defaults make any estimate noisy and hide poor performance on the rare cases and The credit cycle means a model trained in a good period misses defaults in a bad one.

## Baseline and production design

- **Baseline (build this first):** Credit agency scores, because landlords use them.
- **Production design:** Boosting with payment and sector features, monotone constraints and a watchlist.

## Why AI, and why this kind

**Why AI.** Predict the likelihood that commercial tenants default on rent so landlords price deposits, incentives and exposure. The evidence that separates good from bad outcomes (Payment days trend, Rent to revenue, Sector stress index) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A credit score only" are what teams reach for first, and they fail because A tenant with a good score and an unaffordable rent still fails, since occupancy cost matters. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Boosting with payment and sector features, monotone constraints and a watchlist.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Payment days trend, Rent to revenue, Sector stress index and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Credit agency scores, because landlords use them | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Boosting with payment and sector features, monotone constraints and a watchlist | chosen | Meets the run-window envelope at $0.214 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Bad debt) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Few defaults make any estimate noisy and hide poor performance on the rare cases.
- Evaluation trap: The credit cycle means a model trained in a good period misses defaults in a bad one.
- Anchor tenant: the largest tenant is a big share of income and its default dominates the risk.
- Rent holidays: rent holidays granted by the landlord look like arrears.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
