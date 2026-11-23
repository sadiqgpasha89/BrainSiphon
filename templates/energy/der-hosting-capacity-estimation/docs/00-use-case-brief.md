# DER Hosting Capacity Estimation: use-case brief

> Generated from the blueprint `energy/der-hosting-capacity-estimation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** DER Hosting Capacity Estimation · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate how much solar, storage or charging load each feeder location can host without breaching limits, so connection offers are faster and upgrades are targeted. The system has to run as a scheduled batch job, inside these limits: Capacity by node with a confidence range, Conservative when uncertain and Recompute on network changes.

**Why it is hard.** The obvious approach is rules of thumb, and it fails because rules ignore the local network. The second trap is in "Speed": the real signal is a fast surrogate checked against full studies, while teams usually reach for full studies for every query.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.8K a month. A mistake is expensive in the way unnecessary studies measures it.

**What success looks like.** Offline: Violation rate when using the bound, Error against full studies and Coverage of the quantile. Online: Connection offer time, Unnecessary studies and Voltage or thermal violations after connection. The launch is judged on "Connection offer time" while "Unnecessary studies" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate how much solar, storage or charging load each feeder location can host without breaching limits, so connection offers are faster and upgrades are targeted.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Capacity by node with a confidence range
- Conservative when uncertain
- Recompute on network changes
- Planner can override
- 2M network nodes

## The approach in one paragraph

Start with fixed screening rules such as a share of transformer rating, because they are the common first check. Then earn the move to a graph neural surrogate of power flow trained on thousands of full studies with conservative quantile bounds, used for screening with full studies for borderline cases, and only if it beats the baseline on Violation rate when using the bound and Error against full studies after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Upstream impedance | Electrical distance to the substation. Voltage rise. Guard against: from the network model. |
| Add Existing DER and load profile | Installed generation and daily load shape. Headroom. Guard against: from connection records. |
| Add Transformer and conductor rating | Thermal limit of nearby equipment. Thermal limit. Guard against: from the asset register. |
| Run it as one pipeline | Network model export (GIS and ADMS), Scenario generation (power flow runs), Surrogate training (graph neural network), Conservative bounds (quantile heads), Hosting map (planning portal) and Validation (sampled full studies), with Planner review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle network change | Trigger recomputation on topology edits. |

**Deliberately not doing**

- Applicant name: irrelevant.
- Postcode text: an identifier.
- Request date: not a network property.

**How the approach is proven**

Prove it offline on Violation rate when using the bound, Error against full studies and Coverage of the quantile using time-ordered splits, then online on "Connection offer time" with "Unnecessary studies" as the guardrail. Watch for: Point estimates with no margin, Ignoring queued connections and No checks against full studies.

## Baseline and production design

- **Baseline (build this first):** Fixed screening rules such as a share of transformer rating, because they are the common first check.
- **Production design:** A graph neural surrogate of power flow trained on thousands of full studies with conservative quantile bounds, used for screening with full studies for borderline cases.

## Why AI, and why this kind

**Why AI.** Estimate how much solar, storage or charging load each feeder location can host without breaching limits, so connection offers are faster and upgrades are targeted. The evidence that separates good from bad outcomes (Upstream impedance, Existing DER and load profile, Transformer and conductor rating) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "rules of thumb" are what teams reach for first, and they fail because rules ignore the local network. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A graph neural surrogate of power flow trained on thousands of full studies with conservative quantile bounds, used for screening with full studies for borderline cases.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Upstream impedance, Existing DER and load profile, Transformer and conductor rating and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed screening rules such as a share of transformer rating, because they are the common first check | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A graph neural surrogate of power flow trained on thousands of full studies with conservative quantile bounds, used for screening with full studies for borderline cases | chosen | Meets the run-window envelope at $0.039 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Connection offer time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Point estimates with no margin.
- Evaluation trap: Ignoring queued connections.
- Network change: a new feeder tie alters the map.
- Clustered requests: many connections in one area.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
