# E-Commerce Checkout Risk (Card-Not-Present): use-case brief

> Generated from the blueprint `retail/checkout-payment-risk-ecommerce` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** E-Commerce Checkout Risk (Card-Not-Present) · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Approve genuine orders instantly and block fraudulent card-not-present orders before fulfilment, optimising profit not just fraud rate. The system has to run in under 100 milliseconds, inside these limits: Decision under 70 ms, Chargeback ratio under scheme limits and 3DS step-up budget.

**Why it is hard.** The obvious approach is fixed fraud-probability cutoff, and it fails because a cutoff ignores order value and margin. The second trap is in "Identity": the real signal is linkage across email, device, address and card, while teams usually reach for order-level features only.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $3.9K a month. A mistake is expensive in the way approval rate measures it.

**What success looks like.** Offline: PR-AUC and profit curve and Calibration by merchant. Online: Fraud losses as percent of GMV and Approval rate. The launch is judged on "Fraud losses as percent of GMV" while "Approval rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Approve genuine orders instantly and block fraudulent card-not-present orders before fulfilment, optimising profit not just fraud rate.

**Training objective.** `\mathcal{L}=\sum_i c_{\text{FN}}\,y_i(1-p_i)+c_{\text{FP}}(1-y_i)p_i\quad\text{with calibrated }p`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| c_{\text{FN}} | The cost of a mistake: c_FN for letting a fraudulent order through and c_FP for blocking a genuine one. |
| y_i | The label: 1 if the order is fraudulent. |
| p_i | The calibrated probability that the order is fraudulent. |

**Hard constraints**

- Decision under 70 ms
- Chargeback ratio under scheme limits
- 3DS step-up budget
- Explainable manual review

## The approach in one paragraph

Start with rules plus vendor risk score. Then earn the move to gBDT with entity-graph features, cost-sensitive thresholds per merchant, 3DS routing policy, and manual review queue prioritised by expected loss, and only if it beats the baseline on PR-AUC and profit curve and Calibration by merchant after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Shipping-billing distance | Geodesic distance and mismatch flags. Drop-shipping fraud pattern. Guard against: address normalisation as-of. |
| Add Email-device-card entity degree | Distinct values per entity within 7 days. Resource sharing. Guard against: time window before order. |
| Add Order velocity per identity cluster | Orders per cluster in last hour. Burst attack. Guard against: cluster membership as-of. |
| Run it as one pipeline | Order submission (checkout API), Entity resolution (identity graph), Feature lookup (online store), Risk scorer (LightGBM), Action policy (approve, 3DS, review) and Chargeback labels (delayed feed), with Manual review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle chargeback labels arrive 60 days late | Early-signal proxy labels and survival correction. |

**Deliberately not doing**

- Product count in cart: weak.
- Browser language: spoofed.

**How the approach is proven**

Prove it offline on PR-AUC and profit curve and Calibration by merchant using time-ordered splits, then online on "Fraud losses as percent of GMV" with "Approval rate" as the guardrail. Watch for: Training on approved orders only and Review decisions treated as ground truth.

## Baseline and production design

- **Baseline (build this first):** Rules plus vendor risk score.
- **Production design:** GBDT with entity-graph features, cost-sensitive thresholds per merchant, 3DS routing policy, and manual review queue prioritised by expected loss.

## Why AI, and why this kind

**Why AI.** Approve genuine orders instantly and block fraudulent card-not-present orders before fulfilment, optimising profit not just fraud rate. The evidence that separates good from bad outcomes (Shipping-billing distance, Email-device-card entity degree, Order velocity per identity cluster) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fixed fraud-probability cutoff" are what teams reach for first, and they fail because A cutoff ignores order value and margin. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: GBDT with entity-graph features, cost-sensitive thresholds per merchant, 3DS routing policy, and manual review queue prioritised by expected loss.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Shipping-billing distance, Email-device-card entity degree, Order velocity per identity cluster and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rules plus vendor risk score | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| GBDT with entity-graph features, cost-sensitive thresholds per merchant, 3DS routing policy, and manual review queue prioritised by expected loss | chosen | Meets the 80 ms envelope at $0.022 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Fraud losses as percent of GMV) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on approved orders only.
- Evaluation trap: Review decisions treated as ground truth.
- Chargeback labels arrive 60 days late: recent patterns unlabelled.
- Black Friday volume: review queue overflows.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
