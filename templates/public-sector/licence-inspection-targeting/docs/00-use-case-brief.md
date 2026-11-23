# Business Licence Inspection Targeting: use-case brief

> Generated from the blueprint `public-sector/licence-inspection-targeting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Business Licence Inspection Targeting · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rank businesses for health, safety and licence inspections by the likelihood of serious violations so inspectors visit where harm is most likely, with random visits kept for fairness. The system has to run as a scheduled batch job, inside these limits: A share of inspections stays random, Scores rank visits and never trigger a penalty and Inspectors decide findings.

**Why it is hard.** The obvious approach is complaints, and it fails because complaints depend on who complains. The second trap is in "Selection": the real signal is a mix of risk-ranked and random visits, while teams usually reach for risk-ranked only.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.7K a month. A mistake is expensive in the way time since the last inspection of high-risk sites measures it.

**What success looks like.** Offline: Violations found per inspection, Calibration and Detection parity across areas. Online: Serious violations found, Time since the last inspection of high-risk sites and Complaints about scrutiny. The launch is judged on "Serious violations found" while "Time since the last inspection of high-risk sites" must not get worse.

## Objective, loss and constraints

**Business objective.** Rank businesses for health, safety and licence inspections by the likelihood of serious violations so inspectors visit where harm is most likely, with random visits kept for fairness.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- A share of inspections stays random
- Scores rank visits and never trigger a penalty
- Inspectors decide findings
- Fairness audited by area and business type
- 100K businesses

## The approach in one paragraph

Start with inspection cycles by business type, because they are the regulatory baseline. Then earn the move to a calibrated risk model with a reserved random sample, inspector route planning and parity audits by area and business type, and only if it beats the baseline on Violations found per inspection and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Past violation history | Serious findings in earlier inspections. Prior. Guard against: from inspections. |
| Add Business type and size | Type, size and activity. Base risk. Guard against: from licences. |
| Add Complaint signals | Verified complaints. Trigger. Guard against: from service requests. |
| Run it as one pipeline | Licence and inspection data (regulatory systems), Feature build (aggregated history), Violation risk model (gradient boosting), Random sample reserve (rules), Route planning (optimiser) and Inspector visit (field app), with Parity audit off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new business | Type-based priors and a first-visit rule. |

**Deliberately not doing**

- Owner name: irrelevant and private.
- Neighbourhood name: a proxy.
- Licence number: an identifier.

**How the approach is proven**

Prove it offline on Violations found per inspection, Calibration and Detection parity across areas using time-ordered splits, then online on "Serious violations found" with "Time since the last inspection of high-risk sites" as the guardrail. Watch for: Risk-only sampling, Complaint-only labels and Penalties from scores.

## Baseline and production design

- **Baseline (build this first):** Inspection cycles by business type, because they are the regulatory baseline.
- **Production design:** A calibrated risk model with a reserved random sample, inspector route planning and parity audits by area and business type.

## Why AI, and why this kind

**Why AI.** Rank businesses for health, safety and licence inspections by the likelihood of serious violations so inspectors visit where harm is most likely, with random visits kept for fairness. The evidence that separates good from bad outcomes (Past violation history, Business type and size, Complaint signals) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "complaints" are what teams reach for first, and they fail because complaints depend on who complains. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A calibrated risk model with a reserved random sample, inspector route planning and parity audits by area and business type.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Past violation history, Business type and size, Complaint signals and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Inspection cycles by business type, because they are the regulatory baseline | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A calibrated risk model with a reserved random sample, inspector route planning and parity audits by area and business type | chosen | Meets the run-window envelope at $0.092 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Serious violations found) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Risk-only sampling.
- Evaluation trap: Complaint-only labels.
- New business: the business has no inspection history.
- Complaint wave: complaints rise for a type.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
