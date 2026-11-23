# Procurement Spend and Risk Analytics: use-case brief

> Generated from the blueprint `public-sector/procurement-spend-risk-analytics` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Procurement Spend and Risk Analytics · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Spot unusual patterns in public procurement such as split purchases, single bidders and contract changes, and send leads to auditors, without naming wrongdoing from a score. The system has to run as a scheduled batch job, inside these limits: Indicators are leads for auditors, No accusation on a score and Evidence shown for each indicator.

**Why it is hard.** The obvious approach is press reports, and it fails because reports follow publicity not risk. The second trap is in "Indicators": the real signal is documented red flags such as single bids and splitting, while teams usually reach for a single opaque score.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.7K a month. A mistake is expensive in the way audit coverage measures it.

**What success looks like.** Offline: Precision at audit capacity, Calibration and Review rate parity by supplier size. Online: Findings per audit, Audit coverage and Complaints about scrutiny. The launch is judged on "Findings per audit" while "Audit coverage" must not get worse.

## Objective, loss and constraints

**Business objective.** Spot unusual patterns in public procurement such as split purchases, single bidders and contract changes, and send leads to auditors, without naming wrongdoing from a score.

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

- Indicators are leads for auditors
- No accusation on a score
- Evidence shown for each indicator
- Fairness for small and local suppliers
- 2M contracts

## The approach in one paragraph

Start with threshold rules and sample audits, because they are the current controls. Then earn the move to a red-flag indicator set with a calibrated ranking trained on audit findings, a supplier-network view and a fairness check across supplier size and region, and only if it beats the baseline on Precision at audit capacity and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Single-bid and short-window tenders | Number of bids and tender period. Competition risk. Guard against: from tenders. |
| Add Split purchase pattern | Purchases just below thresholds. Splitting. Guard against: from payments. |
| Add Contract change history | Value and scope changes. Risk. Guard against: from contracts. |
| Run it as one pipeline | Contract and payment data (procurement systems), Indicator computation (rules), Network build (graph store) and Ranking model (gradient boosting), with Auditor lead list, Audit outcome capture and Fairness review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle emergency procurement | Emergency flags in features. |

**Deliberately not doing**

- Supplier name: an identifier.
- Officer name: irrelevant.
- Contract title wording: an artefact.

**How the approach is proven**

Prove it offline on Precision at audit capacity, Calibration and Review rate parity by supplier size using time-ordered splits, then online on "Findings per audit" with "Audit coverage" as the guardrail. Watch for: Accusations from scores, Press-based labels and Scrutiny by supplier size.

## Baseline and production design

- **Baseline (build this first):** Threshold rules and sample audits, because they are the current controls.
- **Production design:** A red-flag indicator set with a calibrated ranking trained on audit findings, a supplier-network view and a fairness check across supplier size and region.

## Why AI, and why this kind

**Why AI.** Spot unusual patterns in public procurement such as split purchases, single bidders and contract changes, and send leads to auditors, without naming wrongdoing from a score. The evidence that separates good from bad outcomes (Single-bid and short-window tenders, Split purchase pattern, Contract change history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "press reports" are what teams reach for first, and they fail because reports follow publicity not risk. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A red-flag indicator set with a calibrated ranking trained on audit findings, a supplier-network view and a fairness check across supplier size and region.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Single-bid and short-window tenders, Split purchase pattern, Contract change history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Threshold rules and sample audits, because they are the current controls | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A red-flag indicator set with a calibrated ranking trained on audit findings, a supplier-network view and a fairness check across supplier size and region | chosen | Meets the run-window envelope at $0.092 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Findings per audit) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Accusations from scores.
- Evaluation trap: Press-based labels.
- Emergency procurement: single bids are legitimate.
- Framework agreements: patterns differ.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
