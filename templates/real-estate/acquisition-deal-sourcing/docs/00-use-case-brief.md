# Acquisition Deal Sourcing: use-case brief

> Generated from the blueprint `real-estate/acquisition-deal-sourcing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Acquisition Deal Sourcing · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find off-market properties likely to sell by combining ownership, debt maturity, lease expiry and behaviour signals. The system has to run as a scheduled batch job, inside these limits: Data licences for ownership, debt and mobility sources are respected, Owner contact follows fair and lawful practice and Analysts review every list before outreach.

**Why it is hard.** The obvious approach is owner wealth or size, and it fails because wealth does not imply sale, and wealthy owners hold for decades. The second trap is in "Ownership": the real signal is ownership entities resolved to the people and groups behind them, while teams usually reach for parcel owner names as listed.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.7K a month. A mistake is expensive in the way contact success measures it.

**What success looks like.** Offline: PR-AUC and Lift. Online: Off-market deals and Contact success. The launch is judged on "Off-market deals" while "Contact success" must not get worse.

## Objective, loss and constraints

**Business objective.** Find off-market properties likely to sell by combining ownership, debt maturity, lease expiry and behaviour signals.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{GraphReg}(z)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |
| z | The embedding of a property or owner entity in the ownership graph. |

**Hard constraints**

- Data licences for ownership, debt and mobility sources are respected
- Owner contact follows fair and lawful practice
- Analysts review every list before outreach
- A fresh list each week

## The approach in one paragraph

Start with analysts' lists from brokers, because it is the norm. Then earn the move to entity resolution, a sale-propensity model and a ranked outreach list, and only if it beats the baseline on PR-AUC and Lift after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Debt maturity | Months until the main loan matures. A maturing loan forces a refinance or a sale. Guard against: debt data are incomplete for private loans. |
| Add Hold period | Years since the last transfer. Owners often sell at typical points in the cycle. Guard against: differs by owner type, so segment. |
| Add Owner entity graph | Number of properties and entities linked to the same ultimate owner. Shows portfolio context and likely strategy. Guard against: resolution errors merge unrelated owners. |
| Run it as one pipeline | Property and debt data (vendors), Entity resolver (graph), Features (Spark), Sale model (boosting), Ranker (rules) and Outcome feed (warehouse), with Analyst list off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle shell ownership | Resolve entities across registries and build the ownership graph. |

**Deliberately not doing**

- Owner name: A label that the model can memorise without learning why owners sell.
- Parcel ID: An administrative key with no information on sale intent.
- Broker: Who listed it before is not related to who will sell now.

**How the approach is proven**

Prove it offline on PR-AUC and Lift using time-ordered splits, then online on "Off-market deals" with "Contact success" as the guardrail. Watch for: Observed sales are biased towards properties that were listed, so off-market sales are missed and Leakage when the sale itself changes the data, such as a new owner or loan.

## Baseline and production design

- **Baseline (build this first):** Analysts' lists from brokers, because it is the norm.
- **Production design:** Entity resolution, a sale-propensity model and a ranked outreach list.

## Why AI, and why this kind

**Why AI.** Find off-market properties likely to sell by combining ownership, debt maturity, lease expiry and behaviour signals. The evidence that separates good from bad outcomes (Debt maturity, Hold period, Owner entity graph) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "owner wealth or size" are what teams reach for first, and they fail because wealth does not imply sale, and wealthy owners hold for decades. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Entity resolution, a sale-propensity model and a ranked outreach list.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Debt maturity, Hold period, Owner entity graph and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Analysts' lists from brokers, because it is the norm | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Entity resolution, a sale-propensity model and a ranked outreach list | chosen | Meets the run-window envelope at $0.380 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Off-market deals) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Observed sales are biased towards properties that were listed, so off-market sales are missed.
- Evaluation trap: Leakage when the sale itself changes the data, such as a new owner or loan.
- Shell ownership: ownership is hidden behind shell companies.
- Stale data: stale debt or owner data suggests a sale that has already happened.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
