# Usage-Based Billing Anomaly Detection: use-case brief

> Generated from the blueprint `saas/usage-based-billing-anomaly` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Usage-Based Billing Anomaly Detection · **Domain:** saas · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect billing errors, metering bugs and bill-shock before invoices go out, protecting trust and revenue. The system has to run as a scheduled batch job, inside these limits: Invoice cut-off deadlines, High precision for customer-facing holds and Meter reconciliation.

**Why it is hard.** The obvious approach is single meter trust, and it fails because metering bugs are invisible to a single source. The second trap is in "Customer": the real signal is customer-specific baselines, while teams usually reach for global thresholds.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way revenue leakage recovered measures it.

**What success looks like.** Offline: Detection of injected billing errors and Precision of held invoices. Online: Billing disputes and Revenue leakage recovered. The launch is judged on "Billing disputes" while "Revenue leakage recovered" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect billing errors, metering bugs and bill-shock before invoices go out, protecting trust and revenue.

**Training objective.** `\mathcal{L}=\sum_t\left[\log\sigma_t+\frac{(x_t-\mu_t)^2}{2\sigma_t^2}\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \sigma_t | Standard deviation: the model's predicted spread, or uncertainty, around its mean prediction. (one value per time step or token t) |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |
| x_t | The input features describing one example (what the model sees). (one value per time step or token t) |
| \mu_t | The model's predicted mean (expected value) of the outcome. (one value per time step or token t) |

**Hard constraints**

- Invoice cut-off deadlines
- High precision for customer-facing holds
- Meter reconciliation
- Auditable

## The approach in one paragraph

Start with static thresholds on invoice amounts. Then earn the move to dual-meter reconciliation plus seasonal customer baselines and a pre-invoice anomaly review queue, and only if it beats the baseline on Detection of injected billing errors and Precision of held invoices after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Meter reconciliation gap | Difference between independent meters. Bug detection. Guard against: time alignment. |
| Add Usage spike vs baseline | Z-score vs seasonal baseline. Bill shock. Guard against: baseline window. |
| Add Rate-card change events | Pricing changes. Explains jumps. Guard against: audit log. |
| Run it as one pipeline | Usage events (metering pipeline), Independent meter (infra logs), Reconciliation engine (batch), Baseline anomaly model (seasonal), Invoice generator (billing system) and Dispute outcomes (labels), with Pre-invoice review queue off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle pricing migration changes units | Rate-card event correlation and unit normalisation. |

**Deliberately not doing**

- Customer name: none.
- Invoice number: none.

**How the approach is proven**

Prove it offline on Detection of injected billing errors and Precision of held invoices using time-ordered splits, then online on "Billing disputes" with "Revenue leakage recovered" as the guardrail. Watch for: Injected errors unlike real bugs and Evaluation without reconciliation sources.

## Baseline and production design

- **Baseline (build this first):** Static thresholds on invoice amounts.
- **Production design:** Dual-meter reconciliation plus seasonal customer baselines and a pre-invoice anomaly review queue.

## Why AI, and why this kind

**Why AI.** Detect billing errors, metering bugs and bill-shock before invoices go out, protecting trust and revenue. The evidence that separates good from bad outcomes (Meter reconciliation gap, Usage spike vs baseline, Rate-card change events) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single meter trust" are what teams reach for first, and they fail because metering bugs are invisible to a single source. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Dual-meter reconciliation plus seasonal customer baselines and a pre-invoice anomaly review queue.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Meter reconciliation gap, Usage spike vs baseline, Rate-card change events and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static thresholds on invoice amounts | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Dual-meter reconciliation plus seasonal customer baselines and a pre-invoice anomaly review queue | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Billing disputes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Injected errors unlike real bugs.
- Evaluation trap: Evaluation without reconciliation sources.
- Pricing migration changes units: all invoices look anomalous.
- Customer launches a legitimate large workload: held invoices cause friction.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
