# Supplier Risk & Disruption Prediction: use-case brief

> Generated from the blueprint `supply-chain/supplier-risk-and-disruption-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Supplier Risk & Disruption Prediction · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict supplier failures and disruptions across tiers by fusing financial, operational, geographic and news signals. The system has to run as a scheduled batch job, inside these limits: Multi-tier visibility, Data licensing and Weekly updates.

**Why it is hard.** The obvious approach is tier-1 scores only, and it fails because disruptions originate at deeper tiers. The second trap is in "Signals": the real signal is leading indicators (payment delays, news, shipment slippage), while teams usually reach for annual financial ratios.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.9K a month. A mistake is expensive in the way alternate sourcing lead time measures it.

**What success looks like.** Offline: Precision at top-k suppliers and Lead time before disruption. Online: Disruption cost avoided and Alternate sourcing lead time. The launch is judged on "Disruption cost avoided" while "Alternate sourcing lead time" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict supplier failures and disruptions across tiers by fusing financial, operational, geographic and news signals.

**Training objective.** `\mathcal{L}=\mathrm{FL}(y,p)+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Multi-tier visibility
- Data licensing
- Weekly updates
- Explainable alerts for procurement

## The approach in one paragraph

Start with annual financial scoring from a rating vendor. Then earn the move to heterogeneous supplier graph with GNN risk propagation, news-event NLP signals and a GBDT stacker, providing explanations and mitigation options, and only if it beats the baseline on Precision at top-k suppliers and Lead time before disruption after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Payment delay trend | Days beyond terms over 6 months. Distress. Guard against: matured payments. |
| Add Shipment slippage trend | On-time delivery rate change. Operations. Guard against: receipts. |
| Add Network concentration | Share of volume from a single sub-supplier. Systemic risk. Guard against: graph snapshot. |
| Run it as one pipeline | Internal ERP and external data (lake), Entity resolution (company matching), Supply network graph (graph DB), Risk model (GNN plus GBDT), News event extractor (NLP) and Disruption outcomes (labels), with Procurement review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle entity resolution merges different suppliers | Conservative matching with human verification. |

**Deliberately not doing**

- Supplier logo: none.
- Website age: weak.

**How the approach is proven**

Prove it offline on Precision at top-k suppliers and Lead time before disruption using time-ordered splits, then online on "Disruption cost avoided" with "Alternate sourcing lead time" as the guardrail. Watch for: Rare disruptions leave few labels and Time leakage via news published after the disruption.

## Baseline and production design

- **Baseline (build this first):** Annual financial scoring from a rating vendor.
- **Production design:** Heterogeneous supplier graph with GNN risk propagation, news-event NLP signals and a GBDT stacker, providing explanations and mitigation options.

## Why AI, and why this kind

**Why AI.** Predict supplier failures and disruptions across tiers by fusing financial, operational, geographic and news signals. The evidence that separates good from bad outcomes (Payment delay trend, Shipment slippage trend, Network concentration) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "tier-1 scores only" are what teams reach for first, and they fail because disruptions originate at deeper tiers. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Heterogeneous supplier graph with GNN risk propagation, news-event NLP signals and a GBDT stacker, providing explanations and mitigation options.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Payment delay trend, Shipment slippage trend, Network concentration and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Annual financial scoring from a rating vendor | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Heterogeneous supplier graph with GNN risk propagation, news-event NLP signals and a GBDT stacker, providing explanations and mitigation options | chosen | Meets the run-window envelope at $0.429 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Disruption cost avoided) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Rare disruptions leave few labels.
- Evaluation trap: Time leakage via news published after the disruption.
- Entity resolution merges different suppliers: false risk propagation.
- News false alarms: repeated false alarms from low-quality sources create alert fatigue and ignored warnings.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
