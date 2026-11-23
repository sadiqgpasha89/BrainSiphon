# Spare Parts Criticality Classification: use-case brief

> Generated from the blueprint `manufacturing/spare-parts-criticality-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Spare Parts Criticality Classification · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify spare parts by the downtime cost of being out of stock and by failure likelihood, so stocking policy covers critical parts at the right level. The system has to run as a scheduled batch job, inside these limits: Criticality decisions reviewed by reliability engineers, Safety-critical parts always held and Annual review with quarterly updates.

**Why it is hard.** The obvious approach is part price, and it fails because cheap parts can stop a line. The second trap is in "Likelihood": the real signal is failure rate from history and installed base, while teams usually reach for usage alone.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.7K a month. A mistake is expensive in the way inventory value measures it.

**What success looks like.** Offline: Agreement with engineer criticality, Stock-out rate in critical class and Calibration of failure likelihood. Online: Critical stock-outs, Inventory value and Emergency purchase cost. The launch is judged on "Critical stock-outs" while "Inventory value" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify spare parts by the downtime cost of being out of stock and by failure likelihood, so stocking policy covers critical parts at the right level.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Criticality decisions reviewed by reliability engineers
- Safety-critical parts always held
- Annual review with quarterly updates
- 200K part numbers

## The approach in one paragraph

Start with an ABC analysis by annual spend, because it is the common starting point. Then earn the move to a model scoring impact and likelihood to classify parts, with a stocking rule per class and a review list for engineers, plus a link to the lead-time risk, and only if it beats the baseline on Agreement with engineer criticality and Stock-out rate in critical class after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Equipment downtime cost | Cost per hour of the asset the part serves. Impact. Guard against: from finance and production. |
| Add Failure rate of the part | Failures per unit-year. Likelihood. Guard against: from work orders. |
| Add Lead time and single source | Supplier lead time and sourcing options. Resupply risk. Guard against: from purchasing. |
| Run it as one pipeline | Part and usage data (ERP and CMMS), Impact and likelihood features (batch), Criticality model (gradient boosting), Stocking rule (policy table), Stock policy update (ERP) and Outcome tracking (stock-outs), with Engineer review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle rarely used critical part | Expert override with a reason. |

**Deliberately not doing**

- Part description length: not importance.
- Warehouse bin: irrelevant.
- Vendor name: an identifier.

**How the approach is proven**

Prove it offline on Agreement with engineer criticality, Stock-out rate in critical class and Calibration of failure likelihood using time-ordered splits, then online on "Critical stock-outs" with "Inventory value" as the guardrail. Watch for: Classifying by spend alone, Ignoring substitutes and No expert review.

## Baseline and production design

- **Baseline (build this first):** An ABC analysis by annual spend, because it is the common starting point.
- **Production design:** A model scoring impact and likelihood to classify parts, with a stocking rule per class and a review list for engineers, plus a link to the lead-time risk.

## Why AI, and why this kind

**Why AI.** Classify spare parts by the downtime cost of being out of stock and by failure likelihood, so stocking policy covers critical parts at the right level. The evidence that separates good from bad outcomes (Equipment downtime cost, Failure rate of the part, Lead time and single source) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "part price" are what teams reach for first, and they fail because cheap parts can stop a line. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A model scoring impact and likelihood to classify parts, with a stocking rule per class and a review list for engineers, plus a link to the lead-time risk.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Equipment downtime cost, Failure rate of the part, Lead time and single source and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: An ABC analysis by annual spend, because it is the common starting point | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A model scoring impact and likelihood to classify parts, with a stocking rule per class and a review list for engineers, plus a link to the lead-time risk | chosen | Meets the run-window envelope at $0.184 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Critical stock-outs) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Classifying by spend alone.
- Evaluation trap: Ignoring substitutes.
- Rarely used critical part: there is little usage history.
- Equipment retired: demand disappears.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
