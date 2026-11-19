# Freight Invoice Audit & Overcharge Detection: use-case brief

> Generated from the blueprint `supply-chain/freight-invoice-audit` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Freight Invoice Audit & Overcharge Detection · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Audit carrier invoices against contracts, shipment data and accessorial rules to recover overcharges before payment. The system has to run as a scheduled batch job, inside these limits: Contract versions, Accessorial dispute evidence and Payment cycle deadlines.

**Why it is hard.** The obvious approach is comparing to historic average, and it fails because history includes past errors. The second trap is in "Evidence": the real signal is shipment events (POD, scans) to validate accessorials, while teams usually reach for invoice text alone.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.9K a month. A mistake is expensive in the way dispute cycle time measures it.

**What success looks like.** Offline: Overcharge detection precision and Recovered amount per audited invoice. Online: Recovery rate and Dispute cycle time. The launch is judged on "Recovery rate" while "Dispute cycle time" must not get worse.

## Objective, loss and constraints

**Business objective.** Audit carrier invoices against contracts, shipment data and accessorial rules to recover overcharges before payment.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{amount})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| w | A weight that scales how much a particular example, class or term counts in the loss. |
| \text{amount} | The invoice amount; w grows with it. |

**Hard constraints**

- Contract versions
- Accessorial dispute evidence
- Payment cycle deadlines
- Carrier relationships

## The approach in one paragraph

Start with tolerance-based comparison to quoted rate. Then earn the move to contract-rating engine plus anomaly model for unusual accessorials, dispute auto-drafting and recovery tracking, and only if it beats the baseline on Overcharge detection precision and Recovered amount per audited invoice after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Expected-rate delta | Invoice minus computed contract rate. Overcharge. Guard against: contract version. |
| Add Accessorial evidence match | Event proof for each accessorial. Validity. Guard against: event completeness. |
| Add Duplicate invoice similarity | Near-duplicate detection. Duplicates. Guard against: window. |
| Run it as one pipeline | Invoice ingestion (EDI and OCR), Contract rating (rules engine), Accessorial validator (event match), Anomaly model (GBDT), Dispute drafter (LLM with evidence), AP specialist (human) and Recovery tracking (finance). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle contract amendments mid-year | Effective-date contract store. |

**Deliberately not doing**

- Carrier name: encoded in contract.
- Invoice page count: none.

**How the approach is proven**

Prove it offline on Overcharge detection precision and Recovered amount per audited invoice using time-ordered splits, then online on "Recovery rate" with "Dispute cycle time" as the guardrail. Watch for: Training on invoices already audited and Ignoring carrier dispute outcomes.

## Baseline and production design

- **Baseline (build this first):** Tolerance-based comparison to quoted rate.
- **Production design:** Contract-rating engine plus anomaly model for unusual accessorials, dispute auto-drafting and recovery tracking.

## Why AI, and why this kind

**Why AI.** Audit carrier invoices against contracts, shipment data and accessorial rules to recover overcharges before payment. The evidence that separates good from bad outcomes (Expected-rate delta, Accessorial evidence match, Duplicate invoice similarity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "comparing to historic average" are what teams reach for first, and they fail because history includes past errors. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Contract-rating engine plus anomaly model for unusual accessorials, dispute auto-drafting and recovery tracking.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Expected-rate delta, Accessorial evidence match, Duplicate invoice similarity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Tolerance-based comparison to quoted rate | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Contract-rating engine plus anomaly model for unusual accessorials, dispute auto-drafting and recovery tracking | chosen | Meets the run-window envelope at $0.043 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Recovery rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on invoices already audited.
- Evaluation trap: Ignoring carrier dispute outcomes.
- Contract amendments mid-year: wrong rate computed.
- Missing shipment events: valid charges disputed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
