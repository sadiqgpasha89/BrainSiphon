# AML Graph Anomaly Detection: use-case brief

> Generated from the blueprint `fintech/aml-graph-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** AML Graph Anomaly Detection · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Surface layering, structuring and circular fund flows that rule-based monitoring cannot see, cutting false-positive alerts by half. The system has to run as a scheduled batch job, inside these limits: SAR filing deadlines of 30 days, Alert explanations must be human-readable and Graph of 500M edges refreshed daily.

**Why it is hard.** The obvious approach is per-account transaction amount z-scores alone, and it fails because accounts look normal individually, the pattern lives in the structure. The second trap is in "Labels": the real signal is sAR outcomes weighted by investigator disposition, while teams usually reach for treating every alert closure as negative.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 104 at peak, at an estimated $2.0K a month. A mistake is expensive in the way mean time to disposition measures it.

**What success looks like.** Offline: Precision at top-k alerts per analyst and SAR conversion rate. Online: Alert-to-SAR ratio and Mean time to disposition. The launch is judged on "Alert-to-SAR ratio" while "Mean time to disposition" must not get worse.

## Objective, loss and constraints

**Business objective.** Surface layering, structuring and circular fund flows that rule-based monitoring cannot see, cutting false-positive alerts by half.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{BCE}}+\beta\,\mathrm{KL}\!\left(q(z\mid G)\,\|\,p(z)\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{BCE}} | Binary cross-entropy on whether an account or transaction is suspicious. |
| \beta | Weight on the KL regularisation term: how strongly it counts against the main objective. |
| \mathrm{KL} | Kullback-Leibler divergence: how far one probability distribution is from another (zero when they are identical). |
| q | The encoder's distribution over z given the graph; p(z) is the prior it is pushed towards. |
| z | The latent representation of the transaction graph learned by the model. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| G | The transaction graph (accounts and transfers). |
| \\|x\\| | Norm: the length of a vector. The squared norm of a difference is the sum of squared errors. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |

**Hard constraints**

- SAR filing deadlines of 30 days
- Alert explanations must be human-readable
- Graph of 500M edges refreshed daily
- Audit trail per alert

## The approach in one paragraph

Start with gradient-boosted trees on hand-built graph features, which matches current investigator logic and is explainable. Then earn the move to heterogeneous GraphSAGE with edge-type attention plus a GBDT head on motif features; GNNExplainer subgraph shown on every alert, and only if it beats the baseline on Precision at top-k alerts per analyst and SAR conversion rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Pass-through ratio | Outflow within 24h divided by inflow. Layering moves money out fast. Guard against: needs transaction timestamps not posting dates. |
| Add Cycle membership score | Count of short cycles through the account in a 14-day window. Round-tripping funds. Guard against: windowing must exclude the alerting transaction itself. |
| Add Counterparty risk propagation | Personalised PageRank from known-bad entities. Risk spreads along flows. Guard against: seed list must be frozen before the evaluation period. |
| Run it as one pipeline | Transaction graph builder (Spark GraphFrames), Entity resolution (blocking plus Splink), Graph embedding (PyTorch Geometric), Alert scorer (GBDT head), Alert explainer (GNNExplainer) and SAR outcome store (label feedback), with Investigator queue off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy on whether an account or transaction is suspicious, so the model is trained on the cost of the decision and not on a generic score. |
| Handle entity resolution splits one customer into two | Conservative merge thresholds and a household-level graph view. |

**Deliberately not doing**

- Transaction amount alone: structured amounts are deliberately just below thresholds.
- Account age: weakly informative and discriminatory in some jurisdictions.

**How the approach is proven**

Prove it offline on Precision at top-k alerts per analyst and SAR conversion rate using time-ordered splits, then online on "Alert-to-SAR ratio" with "Mean time to disposition" as the guardrail. Watch for: Random edge split leaks future flows into training and Evaluating on alerts rather than all accounts hides missed laundering.

## Baseline and production design

- **Baseline (build this first):** Gradient-boosted trees on hand-built graph features, which matches current investigator logic and is explainable.
- **Production design:** Heterogeneous GraphSAGE with edge-type attention plus a GBDT head on motif features; GNNExplainer subgraph shown on every alert.

## Why AI, and why this kind

**Why AI.** Surface layering, structuring and circular fund flows that rule-based monitoring cannot see, cutting false-positive alerts by half. The evidence that separates good from bad outcomes (Pass-through ratio, Cycle membership score, Counterparty risk propagation) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "per-account transaction amount z-scores alone" are what teams reach for first, and they fail because accounts look normal individually, the pattern lives in the structure. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Heterogeneous GraphSAGE with edge-type attention plus a GBDT head on motif features; GNNExplainer subgraph shown on every alert.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Pass-through ratio, Cycle membership score, Counterparty risk propagation and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Gradient-boosted trees on hand-built graph features, which matches current investigator logic and is explainable | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Heterogeneous GraphSAGE with edge-type attention plus a GBDT head on motif features; GNNExplainer subgraph shown on every alert | chosen | Meets the run-window envelope at $0.0073 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Alert-to-SAR ratio) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Random edge split leaks future flows into training.
- Evaluation trap: Evaluating on alerts rather than all accounts hides missed laundering.
- Entity resolution splits one customer into two: motif counts halve and ring evades detection.
- Sanctions list update: newly designated entities change propagated risk overnight.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
