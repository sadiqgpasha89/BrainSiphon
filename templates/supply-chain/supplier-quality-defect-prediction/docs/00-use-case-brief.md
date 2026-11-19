# Supplier Quality & Defect Prediction: use-case brief

> Generated from the blueprint `supply-chain/supplier-quality-defect-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Supplier Quality & Defect Prediction · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict incoming lot defect risk to focus inspections and supplier development on the lots and suppliers that matter. The system has to run as a scheduled batch job, inside these limits: Inspection capacity, Regulatory traceability and Supplier confidentiality.

**Why it is hard.** The obvious approach is uniform sampling, and it fails because uniform sampling wastes effort on reliable suppliers. The second trap is in "Leading": the real signal is process indicators from supplier (SPC, audits), while teams usually reach for final defect counts only.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way inspection cost measures it.

**What success looks like.** Offline: Defect capture rate at fixed inspection effort and Calibration. Online: Escaped defects and Inspection cost. The launch is judged on "Escaped defects" while "Inspection cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict incoming lot defect risk to focus inspections and supplier development on the lots and suppliers that matter.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{impact})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| w | A weight that scales how much a particular example, class or term counts in the loss. |
| \text{impact} | The business impact of a defect from the supplier; w grows with it. |

**Hard constraints**

- Inspection capacity
- Regulatory traceability
- Supplier confidentiality
- Lot-level decisions

## The approach in one paragraph

Start with fixed AQL inspection plans. Then earn the move to lot-level defect model with Bayesian supplier priors driving dynamic inspection levels and corrective action prioritisation, and only if it beats the baseline on Defect capture rate at fixed inspection effort and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Supplier historical defect rate | PPM trend. Reliability. Guard against: matured. |
| Add Process-capability indicators | Cpk from supplier data. Process stability. Guard against: data sharing. |
| Add Material or tooling change flags | Change notices. Risk. Guard against: notice timing. |
| Run it as one pipeline | Receipts and inspection data (QMS), Supplier features (Spark), Defect model (GBDT), Inspection planner (risk-based rules), Quality engineer (human), Supplier scorecards (portal) and Defect outcomes (labels). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle supplier changes process without notice | Change-detection on process signals and audits. |

**Deliberately not doing**

- Supplier name: encoded.
- Order number: none.

**How the approach is proven**

Prove it offline on Defect capture rate at fixed inspection effort and Calibration using time-ordered splits, then online on "Escaped defects" with "Inspection cost" as the guardrail. Watch for: Defects only observed for inspected lots and Using post-inspection information.

## Baseline and production design

- **Baseline (build this first):** Fixed AQL inspection plans.
- **Production design:** Lot-level defect model with Bayesian supplier priors driving dynamic inspection levels and corrective action prioritisation.

## Why AI, and why this kind

**Why AI.** Predict incoming lot defect risk to focus inspections and supplier development on the lots and suppliers that matter. The evidence that separates good from bad outcomes (Supplier historical defect rate, Process-capability indicators, Material or tooling change flags) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "uniform sampling" are what teams reach for first, and they fail because uniform sampling wastes effort on reliable suppliers. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Lot-level defect model with Bayesian supplier priors driving dynamic inspection levels and corrective action prioritisation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Supplier historical defect rate, Process-capability indicators, Material or tooling change flags and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed AQL inspection plans | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Lot-level defect model with Bayesian supplier priors driving dynamic inspection levels and corrective action prioritisation | chosen | Meets the run-window envelope at $0.182 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Escaped defects) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Defects only observed for inspected lots.
- Evaluation trap: Using post-inspection information.
- Supplier changes process without notice: an unannounced process change shifts defect rates and the model stays blind until escapes occur.
- Inspection reduces defects through deterrence: inspection itself reduces defects, so labels shift and the model underestimates risk.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
