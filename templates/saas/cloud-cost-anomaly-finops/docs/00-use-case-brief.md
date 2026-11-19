# Cloud Cost Anomaly Detection & FinOps Forecasting: use-case brief

> Generated from the blueprint `saas/cloud-cost-anomaly-finops` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cloud Cost Anomaly Detection & FinOps Forecasting · **Domain:** saas · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect cost spikes by service and team early and forecast spend so engineers can fix waste before the invoice. The system has to run as a scheduled batch job, inside these limits: Billing data lag of 24h, Tag quality and Ownership attribution.

**Why it is hard.** The obvious approach is account-level totals, and it fails because teams need their own spend. The second trap is in "Baselines": the real signal is usage-driven baselines (traffic-normalised), while teams usually reach for raw cost thresholds.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way forecast accuracy measures it.

**What success looks like.** Offline: Detection delay and precision on confirmed waste and Forecast MAPE. Online: Waste avoided and Forecast accuracy. The launch is judged on "Waste avoided" while "Forecast accuracy" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect cost spikes by service and team early and forecast spend so engineers can fix waste before the invoice.

**Training objective.** `\mathcal{L}=\sum_t\rho_q(y_t-\hat y_t)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \rho_q | Pinball (quantile) loss: penalises under-prediction and over-prediction by different amounts so the model learns a chosen percentile instead of the average. (one value per quantile level q) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Billing data lag of 24h
- Tag quality
- Ownership attribution
- Commitment (RI/Savings Plan) planning

## The approach in one paragraph

Start with budget alerts on monthly totals. Then earn the move to traffic-normalised anomaly detection per owner with forecast bands and commitment-planning optimiser, and only if it beats the baseline on Detection delay and precision on confirmed waste and Forecast MAPE after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Cost per unit of traffic | Spend divided by requests. Efficiency. Guard against: join. |
| Add New resource spikes | New instance types or services. Waste. Guard against: inventory. |
| Add Commitment coverage | Share covered by savings plans. Optimisation. Guard against: billing. |
| Run it as one pipeline | Billing exports (cloud APIs), Tag and ownership resolver (rules and ML), Cost per unit builder (join), Anomaly detector (seasonal), Forecast and commitment planner (optimisation), Team notification (chat) and Savings outcomes (tracking). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle untagged resources | ML-based ownership inference and enforcement. |

**Deliberately not doing**

- Resource ID: none.
- Invoice line text: none.

**How the approach is proven**

Prove it offline on Detection delay and precision on confirmed waste and Forecast MAPE using time-ordered splits, then online on "Waste avoided" with "Forecast accuracy" as the guardrail. Watch for: Raw cost comparisons without traffic and Ignoring attribution quality.

## Baseline and production design

- **Baseline (build this first):** Budget alerts on monthly totals.
- **Production design:** Traffic-normalised anomaly detection per owner with forecast bands and commitment-planning optimiser.

## Why AI, and why this kind

**Why AI.** Detect cost spikes by service and team early and forecast spend so engineers can fix waste before the invoice. The evidence that separates good from bad outcomes (Cost per unit of traffic, New resource spikes, Commitment coverage) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "account-level totals" are what teams reach for first, and they fail because teams need their own spend. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Traffic-normalised anomaly detection per owner with forecast bands and commitment-planning optimiser.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Cost per unit of traffic, New resource spikes, Commitment coverage and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Budget alerts on monthly totals | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Traffic-normalised anomaly detection per owner with forecast bands and commitment-planning optimiser | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Waste avoided) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Raw cost comparisons without traffic.
- Evaluation trap: Ignoring attribution quality.
- Untagged resources: resources without tags have no owner so anomalies and waste go unattended.
- Billing data delays: billing exports arrive a day late so cost anomalies are detected too late to act.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
