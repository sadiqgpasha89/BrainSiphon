# Enterprise Connectivity Lead Scoring: use-case brief

> Generated from the blueprint `telecom/enterprise-connectivity-lead-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Enterprise Connectivity Lead Scoring · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rank business leads for fibre, private networks and managed services by likelihood and value so sales effort goes where it pays. The system has to run as a scheduled batch job, inside these limits: Use firmographic and own-network data only, Sales sees reasons for each score and Weekly refresh of 500K leads.

**Why it is hard.** The obvious approach is opportunities created, and it fails because many opportunities never close. The second trap is in "Feasibility": the real signal is serviceable by the network within a time, while teams usually reach for interest alone.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.7K a month. A mistake is expensive in the way revenue per sales hour measures it.

**What success looks like.** Offline: Win rate by score decile, Value capture at top deciles and Calibration. Online: Sales conversion, Revenue per sales hour and Leads closed as unserviceable. The launch is judged on "Sales conversion" while "Revenue per sales hour" must not get worse.

## Objective, loss and constraints

**Business objective.** Rank business leads for fibre, private networks and managed services by likelihood and value so sales effort goes where it pays.

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

- Use firmographic and own-network data only
- Sales sees reasons for each score
- Weekly refresh of 500K leads
- Coverage feasibility checked before ranking

## The approach in one paragraph

Start with rank by company size and coverage, because sales teams already use it. Then earn the move to gradient boosting on firmographic, serviceability and intent features with value estimates and reasons shown in CRM, retrained quarterly on closed deals, and only if it beats the baseline on Win rate by score decile and Value capture at top deciles after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Serviceability | Whether fibre or wireless coverage reaches the site. Gate for ranking. Guard against: from the network inventory. |
| Add Business size and growth | Employee and revenue band and growth signals. Demand proxy. Guard against: from licensed data. |
| Add Current spend and contract end | Existing telecom spend and renewal dates. Timing. Guard against: from CRM. |
| Run it as one pipeline | Lead and firmographic ingestion (CRM and data vendors), Serviceability join (network inventory), Lead model (gradient boosting), Value estimate (regression), Rank and reasons (CRM) and Retrain (quarterly), with Sales feedback off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new segment | Start with priors and manual review. |

**Deliberately not doing**

- Sales rep name: irrelevant.
- Lead source alone: confounded.
- Company logo: no link.

**How the approach is proven**

Prove it offline on Win rate by score decile, Value capture at top deciles and Calibration using time-ordered splits, then online on "Sales conversion" with "Revenue per sales hour" as the guardrail. Watch for: Using opportunity creation as the label, Skipping serviceability and No entity resolution.

## Baseline and production design

- **Baseline (build this first):** Rank by company size and coverage, because sales teams already use it.
- **Production design:** Gradient boosting on firmographic, serviceability and intent features with value estimates and reasons shown in CRM, retrained quarterly on closed deals.

## Why AI, and why this kind

**Why AI.** Rank business leads for fibre, private networks and managed services by likelihood and value so sales effort goes where it pays. The evidence that separates good from bad outcomes (Serviceability, Business size and growth, Current spend and contract end) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "opportunities created" are what teams reach for first, and they fail because many opportunities never close. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting on firmographic, serviceability and intent features with value estimates and reasons shown in CRM, retrained quarterly on closed deals.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Serviceability, Business size and growth, Current spend and contract end and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rank by company size and coverage, because sales teams already use it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting on firmographic, serviceability and intent features with value estimates and reasons shown in CRM, retrained quarterly on closed deals | chosen | Meets the run-window envelope at $0.184 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Sales conversion) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using opportunity creation as the label.
- Evaluation trap: Skipping serviceability.
- New segment: there are few wins to learn from.
- Long sales cycle: outcomes arrive late.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
